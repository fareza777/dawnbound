import Phaser from 'phaser';
import { Actor } from './Actor';
import type { AiKind, EnemyDef, Pattern } from '@/data/enemies';
import type { World } from '@/game/World';
import { dirFromVector } from '@/gfx/animations';
import type { StatusKind } from '@/systems/combat';

type EState = 'spawn' | 'move' | 'windup' | 'charge' | 'recover' | 'burrowed' | 'emerge' | 'fuse' | 'fade';

export const ELITE_AFFIXES = ['swift', 'shielded', 'volatile', 'vampiric', 'frenzied', 'frozen', 'burning', 'splitting', 'blink', 'armored'] as const;
export type EliteAffix = (typeof ELITE_AFFIXES)[number];

/** Hits to break poise by behaviour: swarmers flinch at once, brutes shrug off a flurry. Turrets never stagger. */
const POISE: Record<AiKind, number> = {
  swarm: 1, hopper: 2, bomber: 2, shooter: 2, chaser: 3, ghost: 3, burrower: 3, caster: 3,
  summoner: 4, charger: 5, tank: 7, fallen: 6, turret: Infinity,
};

export class Enemy extends Actor {
  state: EState = 'spawn';
  atk: number;
  armor: number;
  speed: number;
  elite = false;
  boss = false;
  affixes: EliteAffix[] = [];
  eliteShield = 0;
  /** Poise: hits wear it down; only when it breaks does the monster stagger (see staggerHit). */
  poiseMax = 3;
  poise = 3;
  /** Seconds since the last hit (poise refills after a short breather). */
  sinceHit = 99;
  private t = 0;
  private cd: number;
  private vx = 0;
  private vy = 0;
  private wobble = Math.random() * 10;
  private telegraph?: Phaser.GameObjects.Graphics;
  private spiralLeft = 0;
  private spiralAngle = 0;
  private burstLeft = 0;
  private summoned: Enemy[] = [];
  contactCd = 0;
  lastHitBy = 0;
  firstHitTaken = false;
  xp: number;
  goldMul = 1;
  invulnerable = false;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly def: EnemyDef, scaling: { hp: number; atk: number }, private world: () => World, elite = false) {
    const sp = def.sprite;
    const frame = sp.atlas === 'monsters' ? `${sp.key}/down/1` : `${sp.key.replace('_walk', '')}/walk/down/1`;
    super(scene, x, y, def.radius * (elite ? 1.2 : 1), sp.atlas, frame);
    this.elite = elite;
    this.maxHp = Math.round(def.hp * scaling.hp * (elite ? 3.2 : 1));
    this.hp = this.maxHp;
    this.atk = def.atk * scaling.atk * (elite ? 1.35 : 1);
    this.armor = def.def * (elite ? 1.3 : 1);
    this.speed = def.speed;
    this.xp = def.xp * (elite ? 4 : 1);
    this.cd = (def.cooldown ?? 2) * (0.5 + Math.random() * 0.6);
    this.poiseMax = POISE[def.ai] * (elite ? 2 : 1);
    this.poise = this.poiseMax;
    const scale = (sp.scale ?? 1) * (elite ? 1.25 : 1);
    this.sprite.setScale(scale);
    this.spriteOffsetY = sp.atlas === 'monsters' ? -10 * scale : -10 * scale;
    if (def.flying) this.spriteOffsetY -= 4;
    if (sp.tint) this.setBaseTint(sp.tint);
    this.shadow.setScale(Math.max(0.7, (def.radius * (elite ? 1.2 : 1)) / 6), 1);
    this.body.setCircle(this.radius);
    this.body.setMass(elite ? 4 : def.ai === 'tank' ? 3 : 1);
    this.playMove();
    // Spawn-in: rise from a glowing seal.
    this.sprite.setAlpha(0).setScale(scale * 0.3);
    scene.tweens.add({ targets: this.sprite, alpha: 1, scale, duration: 380, ease: 'Back.easeOut' });
    this.t = 0.45;
    if (def.ai === 'burrower') this.state = 'spawn';
  }

  /**
   * Called for every damaging hit. Returns true when poise breaks: the monster staggers (attack cancelled, full
   * knockback, short stun). Otherwise the hit barely moves it, so it keeps fighting instead of being stun-locked.
   */
  staggerHit(weight: number): boolean {
    this.sinceHit = 0;
    if (!Number.isFinite(this.poiseMax)) return false;
    this.poise -= weight;
    if (this.poise > 0) return false;
    this.poise = this.poiseMax;
    this.clearTelegraph();
    if (this.state === 'windup' || this.state === 'charge') this.state = 'recover';
    this.t = Math.max(this.t, 0.35);
    this.statuses.apply('stun', 0, 0.4);
    return true;
  }

  get w(): World {
    return this.world();
  }

  makeElite(affixes: EliteAffix[]): void {
    this.affixes = affixes;
    if (affixes.includes('swift')) this.speed *= 1.4;
    if (affixes.includes('armored')) this.armor *= 2;
    if (affixes.includes('shielded')) this.eliteShield = this.maxHp * 0.35;
    const glow = affixes.includes('burning') ? 0xff7a2f : affixes.includes('frozen') ? 0x9ee8ff : affixes.includes('vampiric') ? 0xe0304a : 0xffd84a;
    this.sprite.preFX?.addGlow(glow, 3, 0, false, 0.1, 10);
  }

  private animBase(): string {
    const sp = this.def.sprite;
    return sp.atlas === 'monsters' ? sp.key : sp.key.replace('_walk', '') + '_walk';
  }

  private playMove(): void {
    const dir = this.def.sprite.frontOnly ? 'down' : this.facing;
    const key = `${this.animBase()}_${dir}`;
    if (this.sprite.anims.currentAnim?.key !== key && this.scene.anims.exists(key)) this.sprite.play(key, true);
  }

  private face(dx: number, dy: number): void {
    this.facing = dirFromVector(dx, dy, this.facing);
  }

  // ------------------------------------------------------------------ update
  update(dt: number): void {
    if (!this.alive) return;
    const w = this.w;
    const p = w.player;
    const dot = this.statuses.tick(dt);
    if (dot > 0) this.onDot(dot);
    if (!this.alive) return;
    this.contactCd -= dt;
    this.sinceHit += dt;
    if (this.sinceHit > 2 && this.poise < this.poiseMax) this.poise = Math.min(this.poiseMax, this.poise + dt * this.poiseMax);
    this.t -= dt;
    this.cd -= dt * (this.affixes.includes('frenzied') && this.hp < this.maxHp / 2 ? 1.8 : 1);
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    const canAct = this.statuses.canAct();
    const spMul = this.statuses.speedMult();

    if (this.state === 'spawn') {
      this.body.setVelocity(0, 0);
      if (this.t <= 0) this.state = this.def.ai === 'burrower' ? 'burrowed' : 'move';
      this.syncVisual(dt);
      return;
    }
    if (!canAct) {
      const kb = this.consumeKnockback(dt);
      this.body.setVelocity(kb.x, kb.y);
      this.sprite.anims.pause();
      this.clearTelegraph();
      if (this.state === 'windup' || this.state === 'charge') this.state = 'recover';
      this.statusTint();
      this.syncVisual(dt);
      return;
    }
    if (this.sprite.anims.isPaused) this.sprite.anims.resume();

    switch (this.def.ai) {
      case 'hopper': this.aiHopper(dt, dx, dy, dist); break;
      case 'chaser': this.aiChaser(dt, dx, dy, dist); break;
      case 'charger':
      case 'fallen': this.aiCharger(dt, dx, dy, dist); break;
      case 'shooter': this.aiShooter(dt, dx, dy, dist); break;
      case 'caster':
      case 'summoner': this.aiCaster(dt, dx, dy, dist); break;
      case 'swarm': this.aiSwarm(dt, dx, dy, dist); break;
      case 'ghost': this.aiGhost(dt, dx, dy, dist); break;
      case 'burrower': this.aiBurrower(dt, dx, dy, dist); break;
      case 'bomber': this.aiBomber(dt, dx, dy, dist); break;
      case 'turret': this.aiTurret(dt, dx, dy, dist); break;
      case 'tank': this.aiTank(dt, dx, dy, dist); break;
    }
    this.tickPatterns(dt);

    const kb = this.consumeKnockback(dt);
    this.body.setVelocity(this.vx * spMul + kb.x, this.vy * spMul + kb.y);
    if (this.state !== 'burrowed') this.playMove();
    this.statusTint();
    this.syncVisual(dt);
    this.telegraph?.setPosition(this.x, this.y);
    if (this.def.flying) this.sprite.y += Math.sin(this.wobble + this.scene.time.now / 180) * 1.5;
  }

  private moveToward(speedMul = 1): void {
    const flow = this.def.flying ? this.directTo() : this.w.flowDir(this.x, this.y);
    this.vx = flow.x * this.speed * speedMul;
    this.vy = flow.y * this.speed * speedMul;
    if (Math.abs(this.vx) + Math.abs(this.vy) > 1) this.face(this.vx, this.vy);
  }

  private directTo(): { x: number; y: number } {
    const p = this.w.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d };
  }

  private stop(): void {
    this.vx = 0;
    this.vy = 0;
  }

  private tryContact(dist: number, mult = 1, status?: [StatusKind, number]): void {
    if (this.contactCd > 0) return;
    const p = this.w.player;
    if (dist < this.radius + p.radius + 3) {
      this.contactCd = 0.8;
      this.w.damagePlayer(this.atk * mult, this.def.element ?? 'physical', { x: this.x, y: this.y }, status ?? this.def.onHit as [StatusKind, number] | undefined);
      if (this.affixes.includes('vampiric')) this.hp = Math.min(this.maxHp, this.hp + this.atk * 0.5);
    }
  }

  private aiHopper(_dt: number, dx: number, dy: number, dist: number): void {
    if (this.state === 'move' && this.t <= 0) {
      const flow = this.w.flowDir(this.x, this.y);
      const hop = this.speed * 2.3;
      this.vx = flow.x * hop;
      this.vy = flow.y * hop;
      this.face(dx, dy);
      this.state = 'charge';
      this.t = 0.32;
      this.scene.tweens.add({ targets: this.sprite, scaleY: this.sprite.scaleY * 1.15, yoyo: true, duration: 150 });
    } else if (this.state === 'charge') {
      this.tryContact(dist);
      if (this.t <= 0) {
        this.stop();
        this.state = 'move';
        this.t = 0.45 + Math.random() * 0.5;
      }
    } else this.stop();
  }

  private aiChaser(_dt: number, dx: number, dy: number, dist: number): void {
    if (this.state === 'move') {
      this.moveToward();
      if (dist < this.radius + 20 && this.cd <= 0) {
        this.state = 'windup';
        this.t = 0.38;
        this.stop();
        this.flash(0xffffff, 0.06);
      }
    } else if (this.state === 'windup') {
      this.stop();
      this.face(dx, dy);
      if (this.t <= 0) {
        this.state = 'charge';
        this.t = 0.18;
        const d = dist || 1;
        this.vx = (dx / d) * this.speed * 3;
        this.vy = (dy / d) * this.speed * 3;
        this.w.sfx('enemy_swing', 0.5);
      }
    } else if (this.state === 'charge') {
      this.tryContact(dist, 1.2);
      if (this.t <= 0) {
        this.state = 'recover';
        this.t = 0.5;
        this.cd = this.def.cooldown ?? 1.4;
        this.stop();
      }
    } else if (this.state === 'recover') {
      this.stop();
      if (this.t <= 0) this.state = 'move';
    }
    if (this.state === 'move') this.tryContact(dist, 0.6);
  }

  private aiCharger(dt: number, dx: number, dy: number, dist: number): void {
    const range = this.def.range ?? 80;
    if (this.state === 'move') {
      this.moveToward(0.9);
      if (dist < range && this.cd <= 0 && this.w.hasLineOfSight(this.x, this.y, this.w.player.x, this.w.player.y)) {
        this.state = 'windup';
        this.t = this.def.ai === 'fallen' ? 0.45 : 0.62;
        this.stop();
        this.spiralAngle = Math.atan2(dy, dx);
        this.drawTelegraphLine(this.spiralAngle, range + 30);
        this.w.sfx('telegraph', 0.4);
      }
      this.tryContact(dist, 0.6);
    } else if (this.state === 'windup') {
      this.stop();
      this.face(Math.cos(this.spiralAngle), Math.sin(this.spiralAngle));
      this.sprite.x += Math.sin(this.scene.time.now / 20) * 0.8;
      if (this.t <= 0) {
        this.clearTelegraph();
        this.state = 'charge';
        this.t = 0.42;
        const sp = this.speed * 3.8;
        this.vx = Math.cos(this.spiralAngle) * sp;
        this.vy = Math.sin(this.spiralAngle) * sp;
        this.w.sfx('charge', 0.6);
        if (this.def.pattern && this.def.ai === 'fallen') this.shoot(this.def.pattern);
      }
    } else if (this.state === 'charge') {
      this.tryContact(dist, 1.3);
      const blocked = this.body.blocked;
      if (this.t <= 0 || blocked.left || blocked.right || blocked.up || blocked.down) {
        if (blocked.left || blocked.right || blocked.up || blocked.down) this.w.shake(0.004, 120);
        this.state = 'recover';
        this.t = this.def.ai === 'fallen' ? 0.35 : 0.8;
        this.cd = this.def.cooldown ?? 2;
        this.stop();
        if (this.def.pattern && this.def.ai !== 'fallen' && this.boss === false && this.def.id === 'scorpion_king') this.shoot(this.def.pattern);
      }
    } else if (this.state === 'recover') {
      this.stop();
      if (this.t <= 0) this.state = 'move';
    }
    void dt;
  }

  private aiShooter(_dt: number, dx: number, dy: number, dist: number): void {
    const range = this.def.range ?? 100;
    this.face(dx, dy);
    if (dist > range) this.moveToward(0.9);
    else if (dist < range * 0.55) {
      const d = dist || 1;
      this.vx = (-dx / d) * this.speed * 0.8;
      this.vy = (-dy / d) * this.speed * 0.8;
    } else {
      const d = dist || 1;
      const side = Math.sin(this.wobble + this.scene.time.now / 900) > 0 ? 1 : -1;
      this.vx = (-dy / d) * this.speed * 0.5 * side;
      this.vy = (dx / d) * this.speed * 0.5 * side;
    }
    if (this.cd <= 0 && dist < range * 1.3 && this.w.hasLineOfSight(this.x, this.y, this.w.player.x, this.w.player.y)) {
      this.cd = this.def.cooldown ?? 2;
      this.flash(0xffffff, 0.05);
      this.shoot(this.def.pattern ?? 'aimed');
    }
    this.tryContact(dist, 0.5);
  }

  private aiCaster(_dt: number, dx: number, dy: number, dist: number): void {
    this.face(dx, dy);
    if (this.state === 'move') {
      if (dist > 90) this.moveToward(0.7);
      else if (dist < 50) {
        const d = dist || 1;
        this.vx = (-dx / d) * this.speed;
        this.vy = (-dy / d) * this.speed;
      } else this.stop();
      if (this.cd <= 0) {
        this.state = 'windup';
        this.t = 0.55;
        this.stop();
        this.w.light(this.x, this.y - 8, 26, this.def.projTint ?? 0xb080ff, 550);
        this.w.sfx('telegraph', 0.35);
      }
    } else if (this.state === 'windup') {
      this.stop();
      if (this.t <= 0) {
        this.state = 'move';
        this.cd = this.def.cooldown ?? 2.6;
        const summonCount = this.summoned.filter((e) => e.alive).length;
        if (this.def.summon && summonCount < (this.boss ? 5 : 3) && Math.random() < 0.45) this.summon();
        else this.shoot(this.def.pattern ?? 'aimed');
        if ((this.affixes.includes('blink') || this.def.ai === 'caster') && Math.random() < 0.35) this.blink();
      }
    }
    this.tryContact(dist, 0.5);
  }

  private aiSwarm(_dt: number, dx: number, dy: number, dist: number): void {
    const d = dist || 1;
    const wob = Math.sin(this.wobble + this.scene.time.now / 160);
    const px = -dy / d;
    const py = dx / d;
    if (this.state === 'charge') {
      this.tryContact(dist);
      if (this.t <= 0) {
        this.state = 'recover';
        this.t = 0.6;
      }
      return;
    }
    if (this.state === 'recover') {
      this.vx = (-dx / d) * this.speed * 0.6 + px * wob * 40;
      this.vy = (-dy / d) * this.speed * 0.6 + py * wob * 40;
      if (this.t <= 0) this.state = 'move';
      return;
    }
    this.vx = (dx / d) * this.speed + px * wob * 60;
    this.vy = (dy / d) * this.speed + py * wob * 60;
    this.face(dx, dy);
    if (dist < 34 && this.cd <= 0) {
      this.state = 'charge';
      this.t = 0.25;
      this.cd = 1.2;
      this.vx = (dx / d) * this.speed * 2.4;
      this.vy = (dy / d) * this.speed * 2.4;
    }
  }

  private aiGhost(_dt: number, dx: number, dy: number, dist: number): void {
    const d = dist || 1;
    this.face(dx, dy);
    if (this.state === 'fade') {
      this.stop();
      if (this.t <= 0) {
        this.state = 'move';
        this.invulnerable = false;
        this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 200 });
        if (this.def.pattern) this.shoot(this.def.pattern);
      }
      return;
    }
    const drift = dist > 60 ? 1 : -0.4;
    this.vx = (dx / d) * this.speed * drift + Math.sin(this.scene.time.now / 500 + this.wobble) * 20;
    this.vy = (dy / d) * this.speed * drift;
    this.tryContact(dist, 0.8);
    if (this.cd <= 0) {
      this.cd = this.def.cooldown ?? 2.6;
      if (Math.random() < 0.4) {
        this.state = 'fade';
        this.t = 0.9;
        this.invulnerable = true;
        this.scene.tweens.add({ targets: this.sprite, alpha: 0.25, duration: 200 });
      } else if (this.def.pattern) this.shoot(this.def.pattern);
    }
  }

  private aiBurrower(_dt: number, dx: number, dy: number, dist: number): void {
    if (this.state === 'burrowed') {
      this.invulnerable = true;
      this.sprite.setVisible(false);
      this.shadow.setScale(1.4, 1.2).setAlpha(0.6);
      this.moveToward(1.3);
      if ((dist < 50 && this.cd <= 0) || this.t < -4) {
        this.state = 'emerge';
        this.t = 0.5;
        this.stop();
        this.w.sfx('burrow', 0.5);
      }
    } else if (this.state === 'emerge') {
      this.stop();
      if (this.t <= 0) {
        this.invulnerable = false;
        this.sprite.setVisible(true).setAlpha(1);
        this.shadow.setAlpha(0.9);
        this.state = 'recover';
        this.t = 1.6;
        this.cd = this.def.cooldown ?? 2;
        this.w.shake(0.003, 100);
        if (this.def.pattern) this.shoot(this.def.pattern);
        this.tryContact(dist, 1.2);
      }
    } else if (this.state === 'recover' || this.state === 'move') {
      this.stop();
      this.face(dx, dy);
      if (this.t <= 0) {
        this.state = 'burrowed';
        this.t = 0;
        this.cd = 1.5;
      }
    }
  }

  private aiBomber(_dt: number, _dx: number, _dy: number, dist: number): void {
    if (this.state === 'fuse') {
      this.stop();
      if (Math.floor(this.t * 12) % 2 === 0) this.flash(0xffffff, 0.04);
      if (this.t <= 0) this.detonate();
      return;
    }
    this.moveToward(1.1);
    if (dist < 22) {
      this.state = 'fuse';
      this.t = 0.55;
      this.w.sfx('fuse', 0.6);
    }
  }

  detonate(): void {
    if (!this.alive) return;
    this.w.explode(this.x, this.y, 32, this.atk, this.def.element ?? 'fire', false, this.def.onHit as [StatusKind, number] | undefined);
    this.hp = 0;
    this.w.killEnemy(this);
  }

  private aiTurret(_dt: number, dx: number, dy: number, dist: number): void {
    this.stop();
    this.face(dx, dy);
    if (this.cd <= 0 && dist < 170) {
      this.cd = this.def.cooldown ?? 2.4;
      this.scene.tweens.add({ targets: this.sprite, scaleY: this.sprite.scaleY * 0.8, yoyo: true, duration: 120 });
      this.shoot(this.def.pattern ?? 'ring6');
    }
    this.tryContact(dist, 0.5);
  }

  private aiTank(_dt: number, dx: number, dy: number, dist: number): void {
    if (this.state === 'move') {
      this.moveToward();
      this.tryContact(dist, 0.8);
      if (dist < 34 && this.cd <= 0) {
        this.state = 'windup';
        this.t = 0.75;
        this.stop();
        this.drawTelegraphCircle(34);
      }
    } else if (this.state === 'windup') {
      this.stop();
      this.face(dx, dy);
      if (this.t <= 0) {
        this.clearTelegraph();
        this.w.explode(this.x, this.y, 34, this.atk * 1.3, this.def.element ?? 'physical', false, this.def.onHit as [StatusKind, number] | undefined);
        this.w.shake(0.006, 150);
        this.state = 'recover';
        this.t = 0.7;
        this.cd = this.def.cooldown ?? 3;
      }
    } else if (this.state === 'recover') {
      this.stop();
      if (this.t <= 0) this.state = 'move';
    }
  }

  // ------------------------------------------------------------------ patterns
  shoot(pattern: Pattern): void {
    const w = this.w;
    const aim = Math.atan2(w.player.y - this.y, w.player.x - this.x);
    const speed = this.def.projSpeed ?? 90;
    const dmg = this.atk * 0.85;
    const el = this.def.element ?? 'physical';
    const status = this.def.onHit as [StatusKind, number] | undefined;
    const kind = el === 'fire' ? 'fire' : el === 'ice' ? 'ice' : el === 'shadow' ? 'shadow' : el === 'poison' ? 'spore' : 'bolt';
    const shot = (angle: number, sp = speed) =>
      w.fire({ x: this.x, y: this.y - 6, angle, speed: sp, friendly: false, damage: dmg, element: el, kind, tint: this.def.projTint, status, range: 260 });
    w.sfx('enemy_shoot', 0.35);
    switch (pattern) {
      case 'aimed': shot(aim); break;
      case 'spread3': for (const o of [-0.25, 0, 0.25]) shot(aim + o); break;
      case 'spread5': for (const o of [-0.5, -0.25, 0, 0.25, 0.5]) shot(aim + o); break;
      case 'ring6': for (let i = 0; i < 6; i++) shot(aim + (i / 6) * Math.PI * 2); break;
      case 'ring10': for (let i = 0; i < 10; i++) shot(aim + (i / 10) * Math.PI * 2, speed * 0.9); break;
      case 'spiral': this.spiralLeft = 14; this.spiralAngle = aim; break;
      case 'burst3': this.burstLeft = 3; break;
      case 'homing':
        w.fire({ x: this.x, y: this.y - 6, angle: aim, speed: speed * 0.8, friendly: false, damage: dmg * 1.2, element: el, kind: 'orb', tint: this.def.projTint, status, homing: 1.6, range: 300, radius: 5 });
        break;
      case 'wave':
        for (const o of [-0.35, 0, 0.35]) w.fire({ x: this.x, y: this.y - 6, angle: aim + o, speed, friendly: false, damage: dmg, element: el, kind: 'shadow', tint: this.def.projTint, status, range: 260, bounce: 1 });
        break;
      case 'lob':
        w.fire({ x: this.x, y: this.y - 6, angle: aim, speed: speed * 0.9, friendly: false, damage: dmg * 1.3, element: el, kind: 'orb', tint: this.def.projTint, status, lob: true, range: Math.hypot(w.player.x - this.x, w.player.y - this.y) });
        break;
    }
  }

  private patternTimer = 0;
  private tickPatterns(dt: number): void {
    if (this.spiralLeft <= 0 && this.burstLeft <= 0) return;
    this.patternTimer -= dt;
    if (this.patternTimer > 0) return;
    const w = this.w;
    const speed = this.def.projSpeed ?? 80;
    const el = this.def.element ?? 'physical';
    const status = this.def.onHit as [StatusKind, number] | undefined;
    if (this.spiralLeft > 0) {
      this.patternTimer = 0.07;
      this.spiralLeft--;
      this.spiralAngle += 0.45;
      for (const off of [0, Math.PI]) {
        w.fire({ x: this.x, y: this.y - 6, angle: this.spiralAngle + off, speed, friendly: false, damage: this.atk * 0.7, element: el, kind: el === 'ice' ? 'ice' : 'shadow', tint: this.def.projTint, status, range: 240 });
      }
    } else if (this.burstLeft > 0) {
      this.patternTimer = 0.14;
      this.burstLeft--;
      const aim = Math.atan2(w.player.y - this.y, w.player.x - this.x);
      w.fire({ x: this.x, y: this.y - 6, angle: aim, speed, friendly: false, damage: this.atk * 0.75, element: el, kind: 'bolt', tint: this.def.projTint, status, range: 260 });
    }
  }

  private summon(): void {
    const id = this.def.summon!;
    this.w.sfx('summon', 0.5);
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = this.x + Math.cos(a) * 20;
      const y = this.y + Math.sin(a) * 20;
      if (!this.w.isWalkableAt(x, y, false)) continue;
      const e = this.w.spawnEnemy(id, x, y);
      if (e) this.summoned.push(e);
    }
  }

  private blink(): void {
    const w = this.w;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 50 + Math.random() * 40;
      const x = w.player.x + Math.cos(a) * r;
      const y = w.player.y + Math.sin(a) * r;
      if (!w.isWalkableAt(x, y, this.def.flying ?? false)) continue;
      w.light(this.x, this.y, 20, this.def.projTint ?? 0xb080ff, 300);
      this.body.reset(x, y);
      w.light(x, y, 20, this.def.projTint ?? 0xb080ff, 300);
      w.sfx('blink', 0.4);
      return;
    }
  }

  // ------------------------------------------------------------------ telegraphs
  private drawTelegraphLine(angle: number, len: number): void {
    this.clearTelegraph();
    const g = this.scene.add.graphics().setDepth(5);
    g.fillStyle(0xff3030, 0.28);
    const w = this.radius * 1.6;
    const pts = [
      new Phaser.Math.Vector2(0, -w / 2), new Phaser.Math.Vector2(len, -w / 2),
      new Phaser.Math.Vector2(len, w / 2), new Phaser.Math.Vector2(0, w / 2),
    ].map((p) => p.rotate(angle));
    g.fillPoints(pts, true);
    g.setPosition(this.x, this.y);
    this.telegraph = g;
    this.scene.tweens.add({ targets: g, alpha: 0.4, yoyo: true, repeat: -1, duration: 90 });
  }

  private drawTelegraphCircle(r: number): void {
    this.clearTelegraph();
    const g = this.scene.add.graphics().setDepth(5);
    g.fillStyle(0xff3030, 0.25).fillCircle(0, 0, r);
    g.lineStyle(1, 0xff6060, 0.8).strokeCircle(0, 0, r);
    g.setPosition(this.x, this.y);
    this.telegraph = g;
    this.scene.tweens.add({ targets: g, alpha: 0.45, yoyo: true, repeat: -1, duration: 100 });
  }

  clearTelegraph(): void {
    if (this.telegraph) {
      this.scene.tweens.killTweensOf(this.telegraph);
      this.telegraph.destroy();
      this.telegraph = undefined;
    }
  }

  private onDot(amount: number): void {
    this.w.dotEnemy(this, amount);
  }

  destroy(): void {
    this.clearTelegraph();
    super.destroy();
  }
}
