import Phaser from 'phaser';
import type { Element } from '@/data/types';
import { computeHit, STATUS, type StatusKind, mitigateOnHero } from '@/systems/combat';
import { blocksProjectiles, cellAt } from '@/systems/roomgen';
import type { Enemy } from '@/entities/Enemy';
import type { MeleeSpec, ProjectileSpec } from './World';
import type { Projectile } from './Projectiles';
import type { RoomScene } from '@/scenes/RoomScene';

const ELEMENT_COLOR: Record<Element, number> = {
  physical: 0xf4ecd8, fire: 0xff8a3c, ice: 0x9ee8ff, shock: 0xfff27a, poison: 0xa8e05f, holy: 0xfff0a0, shadow: 0xc8a0ff,
};
const ELEMENT_STAT = { physical: null, fire: 'fireDmg', ice: 'iceDmg', shock: 'shockDmg', poison: 'poisonDmg', holy: 'holyDmg', shadow: 'shadowDmg' } as const;

/** Damage share of procs relative to their listed values (see damageEnemy). */
export const PROC_POWER = 0.55;

export interface DamageOpts {
  element?: Element;
  isSkill?: boolean;
  status?: [StatusKind, number];
  /** Procs (chain lightning etc.) don't trigger further procs. */
  proc?: boolean;
  knockFrom?: { x: number; y: number; force: number };
  forceCrit?: boolean;
  flat?: boolean;
}

/** Damage pipeline, status application, on-hit / on-kill effects and periodic boon effects. */
export class Combat {
  private hitCounter = 0;
  private attackCounter = 0;
  private timers = new Map<string, number>();
  private orbitAngle = 0;
  private orbitHits = new Map<Enemy, number>();
  comboStacks = 0;
  hasteTime = 0;
  hasteAmount = 0;
  dashEmpowered = false;
  guardianUsed = false;
  private trail: { x: number; y: number; t: number }[] = [];
  private trailTimer = 0;

  constructor(private room: RoomScene) {}

  private get ctx() {
    return this.room.ctx;
  }

  private get stats() {
    return this.room.ctx.stats;
  }

  // ---------------------------------------------------------------- outgoing damage
  damageEnemy(e: Enemy, mult: number, o: DamageOpts = {}): number {
    if (!e.alive || e.invulnerable || e.state === 'spawn') return 0;
    const st = this.stats;
    const ctx = this.ctx;
    const element: Element = o.element ?? 'physical';
    // Procs (chain lightning, novas, orbiting blades...) stack across many boons; keep them a bonus, not the engine.
    let multiplier = o.proc ? mult * PROC_POWER : mult;
    let critChance = st.critChance;
    let critDmg = st.critDmg;
    const firstHit = !e.firstHitTaken;
    e.firstHitTaken = true;
    let forceCrit = o.forceCrit ?? false;
    if (firstHit && ctx.has('first_strike')) {
      forceCrit = true;
      multiplier *= 1 + ctx.p('first_strike') / 100;
    }
    if (o.isSkill && ctx.has('skill_crit')) forceCrit = true;
    if (this.dashEmpowered && !o.proc) {
      forceCrit = true;
      multiplier *= 1 + ctx.p('dash_empower') / 100;
      this.dashEmpowered = false;
    }
    const chilled = e.statuses.has('chill') || e.statuses.has('freeze');
    if (chilled && ctx.has('black_ice')) critChance += ctx.p('black_ice');
    if (e.statuses.has('freeze') && ctx.has('room_chill')) critDmg += ctx.p('room_chill');
    if (e.statuses.has('burn') && ctx.has('hellfire')) critDmg += ctx.p('hellfire');
    // Conditional damage multipliers
    let taken = e.statuses.takenMult();
    if (e.statuses.has('freeze') && ctx.has('shatter')) taken *= 1 + ctx.p('shatter') / 100;
    if (e.statuses.has('burn') && ctx.has('burn_vuln')) taken *= 1 + ctx.p('burn_vuln') / 100;
    if (e.statuses.has('burn') && element === 'shock' && ctx.has('plasma')) taken *= 1 + ctx.p('plasma') / 100;
    const poison = e.statuses.get('poison');
    if (poison && poison.stacks >= 4 && ctx.has('poison_mark')) taken *= 1 + ctx.p('poison_mark') / 100;
    if (e.boss) taken *= 1 + st.bossDmg / 100;
    else if (e.elite) taken *= 1 + st.eliteDmg / 100;
    const p = this.room.player;
    const hpRatio = p.hp / p.maxHp;
    if (ctx.has('low_hp_dmg') && hpRatio < 0.4) multiplier *= 1 + ctx.p('low_hp_dmg') / 100;
    if (ctx.has('full_hp_dmg') && hpRatio >= 0.999) multiplier *= 1 + ctx.p('full_hp_dmg') / 100;
    if (ctx.has('twilight') && hpRatio > 0.5) multiplier *= 1 + ctx.p('twilight') / 100;
    if (ctx.has('gold_dmg')) multiplier *= 1 + Math.min(ctx.p('gold_dmg', 1, 40), this.room.run.gold / Math.max(1, ctx.p('gold_dmg'))) / 100;
    if (ctx.has('combo_dmg')) multiplier *= 1 + Math.min(ctx.p('combo_dmg', 1, 30), this.comboStacks * ctx.p('combo_dmg')) / 100;
    if (ctx.has('crit_low_hp') && e.hp < e.maxHp * 0.5) critDmg += ctx.p('crit_low_hp');
    if (o.isSkill) multiplier *= 1 + st.skillDmg / 100;

    const elementStat = ELEMENT_STAT[element];
    const res = e.def.resist?.[element] ?? 0;
    const hit = o.flat
      ? { amount: Math.max(1, Math.round(multiplier * taken)), crit: false }
      : computeHit({
        base: st.atk,
        mult: multiplier * p.statuses.dealtMult(),
        element,
        critChance: forceCrit ? 100 : critChance,
        critDmg,
        elementBonus: elementStat ? st[elementStat] : 0,
        targetDef: e.armor,
        targetResist: res,
        targetTakenMult: taken,
        roll: () => Math.random(),
      });
    let amount = hit.amount;
    if (e.eliteShield > 0) {
      const absorbed = Math.min(e.eliteShield, amount);
      e.eliteShield -= absorbed;
      amount -= absorbed;
      if (absorbed > 0) this.room.fx.number(e.x, e.y - 14, `${Math.round(absorbed)}`, 0x8ab8ff);
    }
    e.hp -= amount;
    e.flash(0xffffff, hit.crit ? 0.1 : 0.06);
    e.punch(hit.crit ? 1.4 : o.isSkill ? 1.1 : 0.8);
    this.room.fx.hit(e.x, e.y - 6, ELEMENT_COLOR[element], hit.crit);
    if (amount > 0) this.room.fx.number(e.x, e.y - 14, hit.crit ? `${amount}!` : `${amount}`, hit.crit ? 0xffd84a : ELEMENT_COLOR[element], hit.crit);
    // Poise: skills and crits wear it down faster. Only a broken guard gives the full shove (and a stagger);
    // otherwise the monster is barely nudged and keeps attacking, so mashing can't stun-lock a room.
    const staggered = !o.proc && !e.boss && e.staggerHit(o.isSkill ? 3 : hit.crit ? 1.5 : 1);
    if (staggered) this.room.fx.ring(e.x, e.y - 6, 14, 0xfff0c8, 180);
    if (o.knockFrom && !e.boss) {
      const kbRes = e.elite ? 0.4 : 1;
      const guard = staggered ? 1 : 0.15;
      e.applyKnockback(o.knockFrom.x, o.knockFrom.y, o.knockFrom.force * (st.knockback / 100) * kbRes * guard);
    }
    this.room.bossBarDirty = true;

    if (!o.proc) {
      this.hitCounter++;
      this.comboStacks++;
      // Lifesteal / flare
      if (st.lifesteal > 0) p.heal(amount * (st.lifesteal / 100), false);
      this.room.addFlare((hit.crit ? 2.2 : 1.4) * (1 + st.flareGain / 100));
      this.applyStatusRolls(e, o, hit.crit);
      this.onHitProcs(e, hit.crit, o);
    } else if (o.status) {
      this.applyStatus(e, o.status[0], o.status[1]);
    }
    if (hit.crit) {
      this.room.hitStop(o.proc ? 0 : 30);
      if (p.hero.style === 'twinblade') p.skillCd = Math.max(0, p.skillCd - 0.3);
    }
    // Execute
    const execute = st.executeBelow + (e.statuses.has('poison') && this.ctx.has('deathbloom') ? this.ctx.p('deathbloom') : 0);
    if (!e.boss && e.hp > 0 && execute > 0 && e.hp < e.maxHp * (execute / 100)) {
      this.room.fx.number(e.x, e.y - 20, 'EXECUTE', 0xff4f6d);
      e.hp = 0;
    }
    if (e.hp <= 0) {
      if (this.ctx.has('overkill') && !o.proc) {
        const extra = -e.hp;
        const n = this.room.nearestEnemy(e.x, e.y, 50, e);
        if (n && extra > 1) this.damageEnemy(n, extra, { proc: true, flat: true });
      }
      this.room.killEnemy(e);
    }
    return amount;
  }

  private applyStatusRolls(e: Enemy, o: DamageOpts, crit: boolean): void {
    const st = this.stats;
    const ctx = this.ctx;
    const roll = (chance: number) => Math.random() * 100 < chance;
    if (o.status && Math.random() < o.status[1]) this.applyStatus(e, o.status[0], 1);
    if (roll(st.burnChance) || (crit && ctx.has('crit_burn')) || (o.isSkill && ctx.has('skill_burn'))) this.applyStatus(e, 'burn', 1);
    if (roll(st.chillChance)) this.applyStatus(e, 'chill', 1);
    if (o.isSkill && ctx.has('skill_chill')) {
      this.applyStatus(e, 'chill', 1);
      this.applyStatus(e, 'chill', 1);
    }
    if (roll(st.shockChance)) this.applyStatus(e, 'shock', 1);
    if (roll(st.poisonChance)) {
      this.applyStatus(e, 'poison', 1);
      if (ctx.has('double_poison')) this.applyStatus(e, 'poison', 1);
    }
    if (o.isSkill && ctx.has('skill_poison')) for (let i = 0; i < ctx.p('skill_poison'); i++) this.applyStatus(e, 'poison', 1);
    if (roll(st.bleedChance)) this.applyStatus(e, 'bleed', 1);
    if (ctx.has('weaken_on_hit') && roll(ctx.p('weaken_on_hit'))) this.applyStatus(e, 'weaken', 1);
    if (crit && ctx.has('crit_mark')) this.applyStatus(e, 'mark', 1);
    if (crit && ctx.has('crit_freeze')) this.applyStatus(e, 'freeze', 1);
    if (crit && ctx.has('crit_poison')) for (let i = 0; i < ctx.p('crit_poison'); i++) this.applyStatus(e, 'poison', 1);
  }

  applyStatus(e: Enemy, kind: StatusKind, durationMul: number): void {
    if (!e.alive) return;
    const st = this.stats;
    const ctx = this.ctx;
    const elementStat = kind === 'burn' ? st.fireDmg : kind === 'poison' ? st.poisonDmg : kind === 'bleed' ? st.shadowDmg : 0;
    const power = st.atk * (st.statusPower / 100) * (1 + elementStat / 100);
    const dur = durationMul * (e.boss ? 0.6 : 1) * (kind === 'freeze' ? 1 + (st.statusPower - 100) / 200 : 1);
    if (kind === 'burn' && e.statuses.has('chill') && ctx.has('steam_burst')) {
      e.statuses.remove('chill');
      this.room.explode(e.x, e.y, 30, ctx.p('steam_burst') / 100, 'fire', true);
    }
    if (kind === 'poison') {
      e.statuses.apply('poison', power, dur, STATUS.poison.maxStacks + Math.round(ctx.p('poison_stacks')));
      return;
    }
    if (kind === 'chill') {
      const s = e.statuses.apply('chill', power, dur);
      if (s.stacks >= 3 && !e.statuses.has('freeze')) {
        e.statuses.remove('chill');
        e.statuses.apply('freeze', power, dur * (e.boss ? 0.5 : 1));
        this.room.fx.burst(e.x, e.y - 6, 0xc8f4ff, 8);
        this.room.sfx('freeze', 0.5);
        if (ctx.has('freeze_heal')) this.room.player.heal(ctx.p('freeze_heal'), false);
        if (ctx.has('freeze_shield')) this.room.player.shield += ctx.p('freeze_shield');
      }
      return;
    }
    if (kind === 'freeze' && e.boss) {
      e.statuses.apply('chill', power, dur);
      return;
    }
    e.statuses.apply(kind, power, dur);
  }

  private onHitProcs(e: Enemy, crit: boolean, o: DamageOpts): void {
    const ctx = this.ctx;
    if (ctx.has('chain_lightning')) {
      const every = Math.max(1, Math.round(ctx.p('chain_lightning', 1, 3)));
      if (this.hitCounter % every === 0) this.chainLightning(e, ctx.p('chain_lightning') / 100, Math.round(ctx.p('chain_lightning', 2, 3) + ctx.p('chain_extra')));
    }
    if (crit && ctx.has('crit_chain')) this.chainLightning(e, ctx.p('crit_chain') / 100, 3);
    if (crit && ctx.has('crit_thunder')) this.thunderAt(e, ctx.p('crit_thunder') / 100);
    if (crit && ctx.has('crit_heal')) this.room.player.heal(ctx.p('crit_heal'), false);
    if (ctx.has('holy_bonus') && !o.isSkill) this.damageEnemy(e, ctx.p('holy_bonus') / 100, { element: 'holy', proc: true });
    if (ctx.has('double_hit') && Math.random() < 0.5) {
      this.room.time.delayedCall(90, () => { if (e.alive) this.damageEnemy(e, ctx.p('double_hit') / 100, { proc: true }); });
    }
    if (ctx.has('hit_gold') && Math.random() * 100 < ctx.p('hit_gold')) this.room.pickups.spawn('gold', e.x, e.y, 1 + Math.floor(Math.random() * 3));
  }

  /** Called by the player once per attack swing/shot (not per enemy hit). */
  onAttack(): void {
    const ctx = this.ctx;
    this.attackCounter++;
    const p = this.room.player;
    const target = this.room.nearestEnemy(p.x, p.y, 180);
    if (ctx.has('smite') && this.attackCounter % Math.max(2, Math.round(ctx.p('smite', 1, 5))) === 0 && target) {
      this.room.time.delayedCall(80, () => {
        if (!target.alive) return;
        this.room.fx.flashCircle(target.x, target.y - 8, 14, 0xfff0a0);
        this.room.lightFx(target.x, target.y, 36, 0xfff0a0, 300);
        this.damageEnemy(target, ctx.p('smite') / 100, { element: 'holy', proc: true });
        if (ctx.has('smite_heal')) p.heal(ctx.p('smite_heal'), false);
        this.room.sfx('smite', 0.5);
      });
    }
    if (ctx.has('ice_volley') && this.attackCounter % 4 === 0) {
      const n = Math.round(ctx.p('ice_volley'));
      const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : 0;
      for (let i = 0; i < n; i++) {
        this.room.fire({ x: p.x, y: p.y - 6, angle: base + (i - (n - 1) / 2) * 0.3, speed: 200, friendly: true, damage: 0.45, element: 'ice', kind: 'ice', status: ['chill', 1], range: 160 });
      }
    }
    if (ctx.has('light_wave')) {
      const a = target ? Math.atan2(target.y - p.y, target.x - p.x) : 0;
      this.room.fire({ x: p.x, y: p.y - 6, angle: a, speed: 190, friendly: true, damage: ctx.p('light_wave') / 100, element: 'holy', kind: 'wave', pierce: 99, range: 110, tint: 0xfff0a0, scale: 0.8 });
    }
    if (ctx.has('quake') && this.attackCounter % Math.max(2, Math.round(ctx.p('quake', 1, 4))) === 0) {
      this.room.explode(p.x, p.y, 44, ctx.p('quake') / 100, 'physical', true);
      this.room.shake(0.004, 120);
    }
  }

  chainLightning(from: Enemy, mult: number, jumps: number): void {
    const visited = new Set<Enemy>([from]);
    let cur = from;
    const pts: { x: number; y: number }[] = [{ x: cur.x, y: cur.y - 6 }];
    for (let i = 0; i < jumps; i++) {
      const next = this.room.enemies.filter((e) => e.alive && !visited.has(e) && Phaser.Math.Distance.Between(e.x, e.y, cur.x, cur.y) < 70)
        .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, cur.x, cur.y) - Phaser.Math.Distance.Between(b.x, b.y, cur.x, cur.y))[0];
      if (!next) break;
      visited.add(next);
      pts.push({ x: next.x, y: next.y - 6 });
      this.damageEnemy(next, mult, { element: 'shock', proc: true, status: ['shock', 1] });
      this.lightningProcs(next);
      cur = next;
    }
    if (pts.length > 1) {
      this.drawBolt(pts, 0xfff27a);
      this.room.sfx('zap', 0.35);
    }
  }

  private lightningProcs(e: Enemy): void {
    if (this.ctx.has('acid_rain')) for (let i = 0; i < this.ctx.p('acid_rain'); i++) this.applyStatus(e, 'poison', 1);
    if (this.ctx.has('divine_storm')) this.room.player.heal(this.ctx.p('divine_storm'), false);
  }

  thunderAt(e: Enemy, mult: number): void {
    if (!e.alive) return;
    this.drawBolt([{ x: e.x + Phaser.Math.Between(-10, 10), y: e.y - 120 }, { x: e.x, y: e.y - 6 }], 0xfff27a, 3);
    this.room.fx.flashCircle(e.x, e.y - 4, 12, 0xfff27a);
    this.room.lightFx(e.x, e.y, 40, 0xfff27a, 250);
    this.damageEnemy(e, mult, { element: 'shock', proc: true, status: ['shock', 1] });
    this.lightningProcs(e);
    this.room.sfx('thunder', 0.45);
  }

  private drawBolt(pts: { x: number; y: number }[], color: number, width = 2): void {
    const g = this.room.add.graphics().setDepth(96000).setBlendMode('ADD');
    const draw = (w: number, c: number, a: number) => {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const a0 = pts[i - 1];
        const b = pts[i];
        const mx = (a0.x + b.x) / 2 + Phaser.Math.Between(-6, 6);
        const my = (a0.y + b.y) / 2 + Phaser.Math.Between(-6, 6);
        g.lineTo(mx, my);
        g.lineTo(b.x, b.y);
      }
      g.strokePath();
    };
    draw(width + 2, color, 0.35);
    draw(width, 0xffffff, 1);
    this.room.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  // ---------------------------------------------------------------- deaths
  onEnemyDeath(e: Enemy): void {
    const ctx = this.ctx;
    const p = this.room.player;
    if (e.statuses.has('burn')) {
      if (ctx.has('burn_explode')) this.room.explode(e.x, e.y, 30, ctx.p('burn_explode') / 100, 'fire', true);
      if (ctx.has('burn_kill_heal')) p.heal(ctx.p('burn_kill_heal'), false);
    }
    if (e.statuses.has('freeze') && ctx.has('shatter')) {
      this.room.explode(e.x, e.y, 26, 0.6 + ctx.p('shatter') / 100, 'ice', true, ['chill', 1]);
      this.room.sfx('shatter', 0.5);
    }
    if (e.statuses.has('poison')) {
      if (ctx.has('poison_burst')) this.room.explode(e.x, e.y, 30, ctx.p('poison_burst') / 100, 'poison', true, ['poison', 1]);
      if (ctx.has('poison_kill_heal')) p.heal(ctx.p('poison_kill_heal'), false);
    }
    if (this.stats.healOnKill > 0) p.heal(this.stats.healOnKill, false);
    if (ctx.has('kill_dash') && Math.random() * 100 < ctx.p('kill_dash')) p.dashCharges = Math.min(this.stats.dashCharges, p.dashCharges + 1);
    if (ctx.has('kill_haste')) {
      this.hasteTime = 2;
      this.hasteAmount = ctx.p('kill_haste');
    }
    if (ctx.has('kill_cdr')) p.skillCd = Math.max(0, p.skillCd - ctx.p('kill_cdr'));
    if (ctx.has('kill_skill_reset') && Math.random() * 100 < ctx.p('kill_skill_reset')) p.skillCd = 0;
    if (ctx.has('kill_shield')) p.shield += ctx.p('kill_shield');
    // Elite affixes
    if (e.affixes.includes('volatile')) this.room.explode(e.x, e.y, 36, e.atk * 1.2, 'fire', false);
    if (e.affixes.includes('splitting')) for (let i = 0; i < 2; i++) this.room.spawnEnemy(e.def.id === 'slimeling' ? 'slimeling' : e.def.splitInto ?? 'slimeling', e.x + (i ? 8 : -8), e.y);
    if (e.def.splitInto && !e.elite) for (let i = 0; i < 2; i++) this.room.spawnEnemy(e.def.splitInto, e.x + (i ? 7 : -7), e.y + 2);
  }

  // ---------------------------------------------------------------- incoming damage
  damagePlayer(amount: number, _element: Element, source?: { x: number; y: number }, status?: [StatusKind, number]): void {
    const p = this.room.player;
    if (!p.receiveHit()) return;
    const st = this.stats;
    const ctx = this.ctx;
    if (Math.random() * 100 < st.dodge) {
      this.room.fx.number(p.x, p.y - 18, 'MISS', 0xa79fc2);
      p.invuln = 0.2;
      return;
    }
    if (ctx.has('reflect') && source && Math.random() * 100 < ctx.p('reflect')) return;
    let dmg = mitigateOnHero(amount, st.def, this.room.depth) * (1 - st.dmgReduction / 100);
    dmg = Math.max(1, Math.round(dmg));
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed;
      dmg -= absorbed;
      this.room.fx.number(p.x, p.y - 18, `-${absorbed}`, 0x8ab8ff);
      if (dmg <= 0) {
        p.invuln = 0.35;
        this.room.sfx('shield_hit', 0.6);
        return;
      }
    }
    p.hp -= dmg;
    this.comboStacks = 0;
    this.room.fx.number(p.x, p.y - 18, `-${dmg}`, 0xff5a5a, true);
    this.room.addFlare(3 * (1 + st.flareGain / 100));
    this.room.shake(0.003, 110);
    this.room.hitStop(45);
    this.room.sfx('player_hurt', 0.8);
    this.room.damageVignette();
    this.room.run.damageTaken = (this.room.run.damageTaken ?? 0) + dmg;
    if (source) p.applyKnockback(source.x, source.y, 110);
    if (status && Math.random() < status[1]) {
      const immune = (status[0] === 'burn' && ctx.has('immune_burn')) || ((status[0] === 'chill' || status[0] === 'freeze') && ctx.has('immune_chill'));
      if (!immune) p.statuses.apply(status[0], amount * 0.25, 0.8);
    }
    p.onHurt();
    // Retaliation effects
    const attacker = source ? this.room.nearestEnemy(source.x, source.y, 20) : null;
    if (st.thorns > 0 && attacker) this.damageEnemy(attacker, st.thorns, { flat: true, proc: true });
    if (ctx.has('retaliate')) this.room.explode(p.x, p.y, 40, ctx.p('retaliate') / 100, 'holy', true);
    if (ctx.has('retaliate_fire') && attacker) {
      this.damageEnemy(attacker, ctx.p('retaliate_fire') / 100, { element: 'fire', proc: true });
      this.applyStatus(attacker, 'burn', 1);
    }
    if (attacker && ctx.has('chill_attackers')) this.applyStatus(attacker, 'chill', 1);
    if (attacker && ctx.has('freeze_attackers')) this.applyStatus(attacker, 'freeze', 1);
    if (p.hp <= 0) this.onLethal();
  }

  private onLethal(): void {
    const p = this.room.player;
    const ctx = this.ctx;
    if (ctx.has('guardian') && !this.guardianUsed) {
      this.guardianUsed = true;
      p.hp = 1;
      p.invuln = 2;
      this.room.fx.flashCircle(p.x, p.y, 40, 0xfff0a0, 500);
      this.room.floatText(p.x, p.y - 30, 'GUARDIAN', 0xfff0a0, true);
      return;
    }
    const revives = this.room.run.deathSaves;
    const canRevive = ctx.has('second_wind') && revives < ctx.count('second_wind');
    if (canRevive) {
      this.room.run.deathSaves += 1;
      p.hp = Math.max(1, Math.round(p.maxHp * Math.min(100, ctx.p('second_wind') / Math.max(1, ctx.count('second_wind'))) / 100));
      p.invuln = 2.5;
      this.room.explode(p.x, p.y, 60, 2, 'fire', true);
      this.room.lightFx(p.x, p.y, 120, 0xffb347, 900);
      this.room.floatText(p.x, p.y - 30, 'REBORN', 0xffb347, true);
      this.room.sfx('revive', 1);
      return;
    }
    this.room.playerDied();
  }

  // ---------------------------------------------------------------- per-frame
  update(dt: number): void {
    const ctx = this.ctx;
    const p = this.room.player;
    if (!p.alive || this.room.enemies.length === 0) {
      this.updateOrbits(dt, false);
      return;
    }
    this.hasteTime = Math.max(0, this.hasteTime - dt);
    this.tick('meteor', dt, ctx.p('meteor', 1, 5), () => {
      const t = this.randomEnemy();
      if (!t) return;
      const x = t.x;
      const y = t.y;
      const mark = this.room.add.image(x, y, 'fx_ring').setTint(0xff7a2f).setScale(0.8).setAlpha(0.8).setDepth(10);
      this.room.tweens.add({ targets: mark, scale: 0.3, duration: 450, onComplete: () => mark.destroy() });
      this.room.time.delayedCall(450, () => {
        this.room.explode(x, y, 26, ctx.p('meteor') / 100, 'fire', true, ['burn', 1]);
        this.room.shake(0.004, 100);
        this.room.sfx('meteor', 0.5);
      });
    });
    this.tick('thunder_strike', dt, ctx.p('thunder_strike', 1, 3), () => {
      const t = this.randomEnemy();
      if (t) this.thunderAt(t, ctx.p('thunder_strike') / 100);
    });
    this.tick('blizzard', dt, 2, () => {
      for (const t of this.room.enemies.filter((e) => e.alive).slice(0, 3)) {
        this.room.fx.burst(t.x, t.y - 10, 0xc8f4ff, 6);
        this.damageEnemy(t, ctx.p('blizzard') / 100, { element: 'ice', proc: true, status: ['chill', 1] });
      }
    });
    this.tick('venom_cloud', dt, ctx.p('venom_cloud', 1, 4), () => {
      this.room.explode(p.x, p.y, 42, ctx.p('venom_cloud') / 100, 'poison', true, ['poison', 1]);
    });
    this.tick('frost_aura', dt, 1.2, () => {
      const r = ctx.p('frost_aura', 0, 40);
      this.room.fx.ring(p.x, p.y, r, 0x9ee8ff, 400);
      for (const e of this.room.enemies) if (e.alive && Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y) < r) this.applyStatus(e, 'chill', 1);
    });
    this.tick('hymn', dt, ctx.p('hymn', 0, 8), () => {
      this.room.fx.ring(p.x, p.y, 60, 0xfff0a0, 500);
      for (const e of this.room.enemies) if (e.alive && !e.boss && Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y) < 60) e.statuses.apply('stun', 0, 1.2);
    });
    if (ctx.has('hp_drain')) p.hp = Math.max(1, p.hp - ctx.p('hp_drain') * dt);
    if (ctx.has('moss_regen')) p.heal((p.maxHp * ctx.p('moss_regen') / 100) * dt, false);
    this.updateOrbits(dt, true);
    this.updateTrail(dt);
  }

  private tick(id: string, dt: number, interval: number, fn: () => void): void {
    if (!this.ctx.has(id)) return;
    const t = (this.timers.get(id) ?? interval * 0.5) - dt;
    if (t <= 0) {
      fn();
      this.timers.set(id, Math.max(0.3, interval));
    } else this.timers.set(id, t);
  }

  private randomEnemy(): Enemy | null {
    const alive = this.room.enemies.filter((e) => e.alive && e.state !== 'spawn' && !e.invulnerable);
    return alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
  }

  private orbitSprites: Phaser.GameObjects.Image[] = [];
  private updateOrbits(dt: number, active: boolean): void {
    const ctx = this.ctx;
    const halo = Math.round(ctx.p('halo_orbs'));
    const blades = Math.round(ctx.p('orbit_blades'));
    const total = halo + blades;
    while (this.orbitSprites.length < total) {
      const idx = this.orbitSprites.length;
      const isHalo = idx < halo;
      const img = this.room.add.image(0, 0, isHalo ? 'proj_orb' : 'proj_wave').setTint(isHalo ? 0xfff0a0 : 0xc8a0ff).setBlendMode('ADD');
      if (!isHalo) img.setScale(0.6);
      this.orbitSprites.push(img);
    }
    if (total === 0) return;
    this.orbitAngle += dt * 3.2;
    const p = this.room.player;
    this.orbitSprites.forEach((img, i) => {
      const a = this.orbitAngle + (i / total) * Math.PI * 2;
      const r = i < halo ? 22 : 28;
      const x = p.x + Math.cos(a) * r;
      const y = p.y - 6 + Math.sin(a) * r * 0.8;
      img.setPosition(x, y).setDepth(y + 5).setRotation(a + Math.PI / 2);
      if (!active) return;
      for (const e of this.room.enemies) {
        if (!e.alive || Phaser.Math.Distance.Between(e.x, e.y - 6, x, y) > e.radius + 6) continue;
        const last = this.orbitHits.get(e) ?? 0;
        if (this.room.time.now - last < 400) continue;
        this.orbitHits.set(e, this.room.time.now);
        this.damageEnemy(e, i < halo ? 0.4 : 0.5, { element: i < halo ? 'holy' : 'shadow', proc: true });
      }
    });
  }

  onDash(): void {
    const ctx = this.ctx;
    if (ctx.has('dash_empower')) this.dashEmpowered = true;
    const p = this.room.player;
    if (ctx.has('dash_hit') || ctx.has('storm_dash') || ctx.has('venom_dash')) {
      const hit = new Set<Enemy>();
      const sweep = () => {
        for (const e of this.room.enemies) {
          if (!e.alive || hit.has(e) || Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y) > e.radius + 10) continue;
          hit.add(e);
          if (ctx.has('dash_hit')) {
            this.damageEnemy(e, ctx.p('dash_hit') / 100, { proc: true });
            if (ctx.has('dash_stun') && !e.boss) e.statuses.apply('stun', 0, 1);
          }
          if (ctx.has('storm_dash')) this.damageEnemy(e, ctx.p('storm_dash') / 100, { element: 'shock', proc: true, status: ['shock', 1] });
          if (ctx.has('venom_dash')) for (let i = 0; i < ctx.p('venom_dash'); i++) this.applyStatus(e, 'poison', 1);
        }
      };
      for (let i = 0; i < 5; i++) this.room.time.delayedCall(i * 40, sweep);
    }
    if (ctx.has('ember_trail')) this.trailTimer = 0.3;
  }

  private updateTrail(dt: number): void {
    const ctx = this.ctx;
    const p = this.room.player;
    const walking = ctx.has('ember_trail_walk') && Math.hypot(p.body.velocity.x, p.body.velocity.y) > 10;
    this.trailTimer -= dt;
    const dashTrail = this.trailTimer > 0 && ctx.has('ember_trail');
    if (dashTrail || walking) {
      const last = this.trail[this.trail.length - 1];
      if (!last || Phaser.Math.Distance.Between(last.x, last.y, p.x, p.y) > 10) {
        this.trail.push({ x: p.x, y: p.y, t: 2.5 });
        const f = this.room.add.image(p.x, p.y, 'fx_light_px').setTint(0xff7a2f).setBlendMode('ADD').setScale(0.3).setAlpha(0.7).setDepth(p.y - 10);
        this.room.tweens.add({ targets: f, alpha: 0, duration: 2500, onComplete: () => f.destroy() });
      }
    }
    const dps = (ctx.p('ember_trail') + ctx.p('ember_trail_walk')) / 100;
    for (const t of this.trail) t.t -= dt;
    this.trail = this.trail.filter((t) => t.t > 0);
    if (this.trail.length === 0 || dps <= 0) return;
    for (const e of this.room.enemies) {
      if (!e.alive) continue;
      if (this.trail.some((t) => Math.abs(t.x - e.x) < 10 && Math.abs(t.y - e.y) < 10)) {
        this.damageEnemy(e, dps * dt * 3, { element: 'fire', proc: true, flat: false });
        if (Math.random() < 0.05) this.applyStatus(e, 'burn', 1);
      }
    }
  }

  // ---------------------------------------------------------------- projectiles
  updateProjectile(pr: Projectile, dt: number): void {
    const s = pr.spec;
    pr.age += dt;
    if (s.homing && pr.age > 0.08) {
      const target = s.friendly ? this.room.nearestEnemy(pr.x, pr.y, 140) : this.room.player;
      if (target && (!('alive' in target) || target.alive)) {
        const desired = Math.atan2(target.y - 6 - pr.y, target.x - pr.x);
        const cur = Math.atan2(pr.vy, pr.vx);
        const diff = Phaser.Math.Angle.Wrap(desired - cur);
        const turn = Phaser.Math.Clamp(diff, -s.homing * dt, s.homing * dt);
        const sp = Math.hypot(pr.vx, pr.vy);
        pr.vx = Math.cos(cur + turn) * sp;
        pr.vy = Math.sin(cur + turn) * sp;
      }
    }
    if (!s.friendly && this.ctx.has('proj_slow') && Phaser.Math.Distance.Between(pr.x, pr.y, this.room.player.x, this.room.player.y) < 45) {
      const f = 1 - (this.ctx.p('proj_slow') / 100) * dt * 4;
      pr.vx *= f;
      pr.vy *= f;
    }
    const nx = pr.x + pr.vx * dt;
    const ny = pr.y + pr.vy * dt;
    pr.traveled += Math.hypot(nx - pr.x, ny - pr.y);
    const tx = Math.floor(nx / 16);
    const ty = Math.floor((ny + 4) / 16);
    if (!s.lob && blocksProjectiles(cellAt(this.room.layout, tx, ty))) {
      if (pr.bounceLeft > 0) {
        pr.bounceLeft--;
        const hx = blocksProjectiles(cellAt(this.room.layout, Math.floor(nx / 16), Math.floor((pr.y + 4) / 16)));
        if (hx) pr.vx = -pr.vx;
        else pr.vy = -pr.vy;
        return;
      }
      this.room.fx.hit(pr.x, pr.y, s.tint ?? 0xffffff);
      this.room.projectiles.kill(pr);
      return;
    }
    pr.x = nx;
    pr.y = ny;
    const lobT = s.lob ? Math.min(1, pr.traveled / Math.max(1, s.range ?? 100)) : 0;
    const lift = s.lob ? Math.sin(lobT * Math.PI) * 30 : 0;
    pr.img.setPosition(Math.round(pr.x), Math.round(pr.y - lift)).setRotation(Math.atan2(pr.vy, pr.vx));
    pr.img.setDepth(pr.y + 2000);
    pr.glow?.setPosition(pr.x, pr.y - lift).setDepth(pr.y + 1999);
    if (s.kind === 'star' || s.kind === 'orb') pr.img.rotation = pr.age * 8;
    if (pr.traveled > (s.range ?? 260)) {
      if (s.lob) this.room.explode(pr.x, pr.y, 22, s.damage, s.element, s.friendly, s.status);
      this.room.projectiles.kill(pr);
      return;
    }
    if (s.lob) return;
    const r = s.radius ?? 3;
    if (s.friendly) {
      for (const e of this.room.enemies) {
        if (!e.alive || pr.hits.has(e) || e.invulnerable) continue;
        const dx = e.x - pr.x;
        const dy = e.y - 6 - pr.y;
        if (dx * dx + dy * dy > (e.radius + r + 3) ** 2) continue;
        pr.hits.add(e);
        this.damageEnemy(e, s.damage, { element: s.element, isSkill: s.isSkill, status: s.status, knockFrom: { x: pr.x - pr.vx * 0.05, y: pr.y - pr.vy * 0.05, force: 60 } });
        const extraPierce = Math.round(this.ctx.p('pierce'));
        if (pr.pierceLeft + extraPierce - (pr.hits.size - 1) <= 0) {
          this.room.projectiles.kill(pr);
          return;
        }
      }
      for (const b of this.room.breakables) {
        if (!b.alive || Math.abs(b.x - pr.x) > 8 || Math.abs(b.y - 6 - pr.y) > 10) continue;
        this.room.breakProp(b);
        this.room.projectiles.kill(pr);
        return;
      }
    } else {
      const p = this.room.player;
      const dx = p.x - pr.x;
      const dy = p.y - 6 - pr.y;
      if (dx * dx + dy * dy < (p.radius + r + 1) ** 2) {
        if (p.isInvulnerable) return;
        this.damagePlayer(s.damage, s.element, { x: pr.x, y: pr.y }, s.status);
        this.room.projectiles.kill(pr);
      }
    }
  }

  fire(spec: ProjectileSpec): void {
    const ctx = this.ctx;
    const s = { ...spec };
    if (s.friendly) {
      if (ctx.has('bounce')) s.bounce = (s.bounce ?? 0) + Math.round(ctx.p('bounce'));
      if (ctx.has('homing') && !s.homing) s.homing = ctx.p('homing');
      s.speed *= this.stats.projSpeed / 100;
    }
    this.room.projectiles.spawn(s);
  }

  melee(spec: MeleeSpec): number {
    let hits = 0;
    const area = spec.isSkill ? 1 : this.stats.areaSize / 100;
    const radius = spec.radius * (spec.full ? 1 : area);
    if (!spec.full || spec.arc < 360) {
      // Hero-coloured swoosh, lightened so the core of the swing still reads as bright steel.
      const tint = spec.element === 'holy' ? 0xfff0a0 : lighten(this.room.player.hero.color, 0.45);
      this.room.fx.slash(spec.x, spec.y, spec.angle, radius * 0.9, tint, Math.min(2.4, (spec.arc * Math.PI) / 180 * 0.6));
    }
    const half = (spec.arc * Math.PI) / 360;
    for (const e of [...this.room.enemies]) {
      if (!e.alive) continue;
      const dx = e.x - spec.x;
      const dy = e.y - 4 - spec.y;
      const d = Math.hypot(dx, dy);
      if (d > radius + e.radius) continue;
      if (!spec.full && spec.arc < 360 && d > 6) {
        const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - spec.angle));
        if (diff > half) continue;
      }
      hits++;
      this.damageEnemy(e, spec.mult, { element: spec.element, isSkill: spec.isSkill, status: spec.status, knockFrom: { x: spec.x, y: spec.y, force: spec.knock } });
    }
    for (const b of this.room.breakables) {
      if (!b.alive) continue;
      if (Math.hypot(b.x - spec.x, b.y - 6 - spec.y) < radius + 6) this.room.breakProp(b);
    }
    if (hits > 0) {
      this.room.sfx(spec.isSkill ? 'hit_heavy' : 'hit', 0.7);
      // Normal swings keep flowing (flash + squash sell the hit); only skills and crits pause the world.
      if (spec.isSkill) {
        this.room.hitStop(40);
        this.room.shake(0.003, 70);
      }
    }
    if (spec.isSkill && this.ctx.has('skill_thunder')) {
      for (let i = 0; i < this.ctx.p('skill_thunder'); i++) {
        this.room.time.delayedCall(i * 120, () => {
          const t = this.randomEnemy();
          if (t) this.thunderAt(t, 1.2);
        });
      }
    }
    return hits;
  }

  explode(x: number, y: number, radius: number, damage: number, element: Element, friendly: boolean, status?: [StatusKind, number]): void {
    this.room.fx.flashCircle(x, y, radius, ELEMENT_COLOR[element], 260);
    this.room.fx.ring(x, y, radius, ELEMENT_COLOR[element], 280);
    this.room.fx.burst(x, y, ELEMENT_COLOR[element], 10);
    this.room.lightFx(x, y, radius * 1.4, ELEMENT_COLOR[element], 300);
    this.room.sfx(element === 'ice' ? 'ice_burst' : element === 'poison' ? 'poison_burst' : 'explosion', 0.5);
    if (friendly) {
      for (const e of [...this.room.enemies]) {
        if (e.alive && Math.hypot(e.x - x, e.y - y) < radius + e.radius) {
          this.damageEnemy(e, damage, { element, proc: true, status, knockFrom: { x, y, force: 90 } });
        }
      }
      for (const b of this.room.breakables) if (b.alive && Math.hypot(b.x - x, b.y - y) < radius + 6) this.room.breakProp(b);
    } else {
      const p = this.room.player;
      if (Math.hypot(p.x - x, p.y - y) < radius + p.radius && !p.isInvulnerable) this.damagePlayer(damage, element, { x, y }, status);
    }
  }
}

/** Blend a colour towards white by `amount` (0..1). */
function lighten(c: number, amount: number): number {
  const ch = (shift: number) => {
    const v = (c >> shift) & 255;
    return Math.round(v + (255 - v) * amount);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
