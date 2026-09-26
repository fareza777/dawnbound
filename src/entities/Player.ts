import Phaser from 'phaser';
import { Actor } from './Actor';
import type { HeroDef } from '@/data/heroes';
import type { World } from '@/game/World';
import { controls, take } from '@/game/input';
import { dirFromVector, type Dir } from '@/gfx/animations';
import { services } from '@/core/services';
import { a11y } from '@/core/a11y';

type PState = 'idle' | 'move' | 'attack' | 'dash' | 'skill' | 'dead';

const DIR_ANGLE: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const BASE_SPEED = 82;
const MELEE_RANGE = 30;
const BOW_RANGE = 150;
/** Seconds a dash/skill press stays queued while it can't happen yet. */
const INPUT_BUFFER = 0.2;
/**
 * Skills hit every nearby monster several times; at full strength (plus cooldown boons) they wiped whole rooms.
 * This keeps them a strong, well-timed tool instead of the answer to everything.
 */
const SKILL_POWER = 0.55;

export class Player extends Actor {
  state: PState = 'idle';
  shield = 0;
  flare = 0;
  potions = 2;
  maxPotions = 2;
  dashCharges = 2;
  private dashTimers: number[] = [];
  private dashTime = 0;
  private dashVX = 0;
  private dashVY = 0;
  private attackCd = 0;
  private actionTime = 0;
  private combo = 0;
  private comboTimer = 0;
  skillCd = 0;
  skillMax = 6;
  invuln = 0;
  private trailTimer = 0;
  private aimAngle = Math.PI / 2;
  private pendingHit: (() => void) | null = null;
  private pendingAt = 0;
  moving = false;
  /** Smoothed walking velocity (dash and knockback bypass the smoothing). */
  private walkVX = 0;
  private dashBuffer = 0;
  private skillBuffer = 0;
  private walkVY = 0;
  deathSaves = 0;
  hasteMul = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly hero: HeroDef, readonly skin: number, private world: () => World) {
    super(scene, x, y, 5, hero.rig === 'hero' ? 'heroes' : 'actors', hero.rig === 'hero' ? `hero${skin}/idle/down/0` : `arpg${hero.arpgIndex}/walk/down/1`);
    this.spriteOffsetY = hero.rig === 'hero' ? -9 : -10;
    this.body.setCircle(5);
    this.body.setOffset(0, 0);
    this.skillMax = hero.skill.cooldown;
    this.playAnim('idle');
  }

  get w(): World {
    return this.world();
  }

  // ---------------------------------------------------------------- animation
  private animKey(kind: 'idle' | 'walk' | 'attack' | 'bow' | 'spin' | 'hit' | 'death', dir: Dir): string {
    const h = this.hero;
    if (h.rig === 'hero') {
      const base = `hero${this.skin}`;
      switch (kind) {
        case 'idle': return `${base}_breath_idle_${dir}`;
        case 'walk': return `${base}_run_${dir}`;
        case 'attack': return `${base}_attack_${dir}`;
        case 'bow': return `${base}_bow_${dir}`;
        case 'spin': return `${base}_spin`;
        case 'hit': return `${base}_hit_${dir}`;
        case 'death': return `${base}_death`;
      }
    }
    const a = `arpg${h.arpgIndex}`;
    switch (kind) {
      case 'idle':
      case 'walk':
      case 'hit':
      case 'death': return `${a}_walk_${dir}`;
      default: return `${a}_${h.attackSheet}_${dir}`;
    }
  }

  playAnim(kind: 'idle' | 'walk' | 'attack' | 'bow' | 'spin' | 'hit' | 'death', force = false): void {
    const key = this.animKey(kind, this.facing);
    if (!force && this.sprite.anims.currentAnim?.key === key && this.sprite.anims.isPlaying) return;
    if (!this.scene.anims.exists(key)) return;
    this.sprite.play(key, !force);
    if (this.hero.rig === 'arpg' && kind === 'idle') {
      this.sprite.anims.pause(this.sprite.anims.currentAnim!.frames[1]);
    }
  }

  // ---------------------------------------------------------------- update
  update(dt: number): void {
    if (!this.alive) {
      this.syncVisual(dt);
      return;
    }
    const st = this.w.ctx.stats;
    this.tickTimers(dt, st.cdr);
    const dot = this.statuses.tick(dt);
    if (dot > 0) this.w.damagePlayer(dot, 'physical');
    if (st.regen > 0) this.heal(st.regen * dt, false);

    if (this.pendingHit && this.actionTime <= this.pendingAt) {
      const fn = this.pendingHit;
      this.pendingHit = null;
      fn();
    }

    const mx = controls.moveX;
    const my = controls.moveY;
    const mlen = Math.hypot(mx, my);
    this.moving = mlen > 0.15;

    // Dash and skill presses are buffered briefly: pressed a moment too early (mid-dash, charge refilling, stunned),
    // they fire as soon as they can instead of being silently dropped.
    if (take('dash')) this.dashBuffer = INPUT_BUFFER;
    if (take('skill')) this.skillBuffer = INPUT_BUFFER;
    if (this.statuses.canAct()) {
      if (this.dashBuffer > 0 && this.dashCharges > 0 && this.state !== 'dash') {
        this.dashBuffer = 0;
        this.tryDash(mx, my);
      }
      if (this.skillBuffer > 0 && this.skillCd <= 0 && this.state !== 'dash') {
        this.skillBuffer = 0;
        this.trySkill();
      }
      if (take('flare')) this.tryFlare();
      if (take('potion')) this.tryPotion();
    }
    this.dashBuffer = Math.max(0, this.dashBuffer - dt);
    this.skillBuffer = Math.max(0, this.skillBuffer - dt);

    let vx = 0;
    let vy = 0;
    const speed = BASE_SPEED * (st.moveSpeed / 100) * this.statuses.speedMult() * this.hasteMul;

    if (this.state === 'dash') {
      vx = this.dashVX;
      vy = this.dashVY;
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.03;
        if (!a11y.reduceMotion) this.afterimage();
      }
      if (this.dashTime <= 0) this.state = 'idle';
    } else {
      if (this.moving && this.statuses.canAct()) {
        const slow = this.state === 'attack' || this.state === 'skill' ? 0.45 : 1;
        vx = (mx / Math.max(1, mlen)) * speed * slow;
        vy = (my / Math.max(1, mlen)) * speed * slow;
        if (this.state !== 'attack' && this.state !== 'skill') this.facing = dirFromVector(mx, my, this.facing);
      }
      const wantAttack = controls.attackHeld || (services.save?.data.settings.autoAttack && !this.moving && this.w.enemies.length > 0);
      if (wantAttack && this.attackCd <= 0 && this.statuses.canAct() && this.state !== 'skill') this.attack();
      if (this.state === 'attack' || this.state === 'skill') {
        if (this.actionTime <= 0) this.state = 'idle';
      } else {
        this.state = this.moving ? 'move' : 'idle';
        this.playAnim(this.moving ? 'walk' : 'idle');
      }
    }

    if (this.state !== 'dash') {
      // Quick ease in/out (~50 ms to 70%): fluid without feeling floaty.
      const k = 1 - Math.exp(-dt * (this.moving ? 24 : 30));
      this.walkVX += (vx - this.walkVX) * k;
      this.walkVY += (vy - this.walkVY) * k;
      vx = this.walkVX;
      vy = this.walkVY;
    } else {
      this.walkVX = vx;
      this.walkVY = vy;
    }
    const kb = this.consumeKnockback(dt);
    this.body.setVelocity(vx + kb.x, vy + kb.y);
    if (this.invuln > 0) this.sprite.setAlpha(Math.floor(this.invuln * 20) % 2 === 0 ? 0.5 : 1);
    else this.sprite.setAlpha(1);
    this.statusTint();
    this.syncVisual(dt);
  }

  private tickTimers(dt: number, cdr: number): void {
    const cdMul = 1 + cdr / 100;
    this.attackCd -= dt;
    this.actionTime -= dt;
    this.dashTime -= dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.skillCd = Math.max(0, this.skillCd - dt * cdMul);
    const maxDash = this.w.ctx.stats.dashCharges;
    if (this.dashCharges < maxDash) {
      if (this.dashTimers.length === 0) this.dashTimers.push(1.1);
      this.dashTimers[0] -= dt * cdMul;
      if (this.dashTimers[0] <= 0) {
        this.dashTimers.shift();
        this.dashCharges = Math.min(maxDash, this.dashCharges + 1);
      }
    } else this.dashTimers = [];
  }

  get dashRechargeRatio(): number {
    if (this.dashTimers.length === 0) return 1;
    return 1 - this.dashTimers[0] / 1.1;
  }

  // ---------------------------------------------------------------- actions
  private aimAt(): { angle: number; dist: number; target: boolean } {
    const target = this.w.nearestEnemy(this.x, this.y, BOW_RANGE * (this.w.ctx.stats.range / 100) + 40);
    if (target) {
      const angle = Math.atan2(target.y - this.y, target.x - this.x);
      return { angle, dist: Math.hypot(target.x - this.x, target.y - this.y) - target.radius, target: true };
    }
    if (this.moving) return { angle: Math.atan2(controls.moveY, controls.moveX), dist: 999, target: false };
    return { angle: DIR_ANGLE[this.facing], dist: 999, target: false };
  }

  private attack(): void {
    const st = this.w.ctx.stats;
    const aim = this.aimAt();
    this.aimAngle = aim.angle;
    this.facing = dirFromVector(Math.cos(aim.angle), Math.sin(aim.angle), this.facing);
    const interval = 0.42 / ((st.atkSpeed / 100) * this.hasteMul);
    this.attackCd = interval;
    this.combo = (this.combo % 3) + 1;
    this.comboTimer = interval + 0.45;
    this.state = 'attack';
    this.w.onPlayerAttack();
    const range = st.range / 100;
    switch (this.hero.style) {
      case 'swordbow': {
        if (aim.target && aim.dist > MELEE_RANGE * range + 12) {
          this.actionTime = Math.min(0.32, interval);
          this.playAnim('bow', true);
          this.w.sfx('bow', 0.7);
          this.schedule(0.1, () => {
            const n = 1 + st.extraProjectiles;
            for (let i = 0; i < n; i++) {
              const spread = (i - (n - 1) / 2) * 0.16;
              this.w.fire({ x: this.x, y: this.y - 6, angle: this.aimAngle + spread, speed: 230 * (st.projSpeed / 100), friendly: true, damage: 0.8, element: 'physical', kind: 'arrow', pierce: 0, range: 220 });
            }
          });
        } else {
          this.actionTime = Math.min(0.3, interval);
          this.playAnim('attack', true);
          this.w.sfx(this.combo === 3 ? 'swing_heavy' : 'swing', 0.8);
          const big = this.combo === 3;
          this.schedule(0.07, () => {
            this.w.melee({ x: this.x, y: this.y - 4, angle: this.aimAngle, radius: (big ? 34 : 28) * range, arc: big ? 200 : 140, mult: big ? 1.5 : 1, knock: big ? 150 : 70 });
          });
          this.lunge(big ? 60 : 35);
        }
        break;
      }
      case 'spear': {
        this.actionTime = Math.min(0.3, interval);
        this.playAnim('attack', true);
        this.w.sfx('thrust', 0.8);
        this.schedule(0.06, () => {
          const reach = 44 * range;
          // A thrust is a narrow line: sample several short arcs along the spear.
          this.w.melee({ x: this.x, y: this.y - 4, angle: this.aimAngle, radius: reach, arc: 40, mult: this.combo === 3 ? 1.5 : 1.05, knock: 90 });
        });
        this.lunge(this.combo === 3 ? 90 : 40);
        break;
      }
      case 'staff': {
        this.actionTime = Math.min(0.3, interval);
        this.playAnim('attack', true);
        this.w.sfx('cast', 0.6);
        this.schedule(0.08, () => {
          const n = 1 + st.extraProjectiles + (this.combo === 3 ? 2 : 0);
          for (let i = 0; i < n; i++) {
            const spread = (i - (n - 1) / 2) * 0.22;
            this.w.fire({ x: this.x, y: this.y - 8, angle: this.aimAngle + spread, speed: 150 * (st.projSpeed / 100), friendly: true, damage: 0.95, element: 'holy', kind: 'star', homing: 3.2, range: 240, tint: 0xe6d4ff });
          }
        });
        break;
      }
      case 'twinblade': {
        this.actionTime = Math.min(0.24, interval);
        this.playAnim('attack', true);
        this.w.sfx('swing', 0.7);
        this.schedule(0.05, () => {
          this.w.melee({ x: this.x, y: this.y - 4, angle: this.aimAngle, radius: 26 * range, arc: 160, mult: 0.8, knock: 40 });
          if (this.combo === 3) {
            this.w.fire({ x: this.x, y: this.y - 4, angle: this.aimAngle, speed: 200, friendly: true, damage: 0.7, element: 'physical', kind: 'wave', pierce: 3, range: 90, tint: this.hero.color });
          }
        });
        this.lunge(45);
        break;
      }
    }
  }

  /** Delay a hit so it lands on the strike frame of the animation. */
  private schedule(delay: number, fn: () => void): void {
    this.pendingHit = fn;
    this.pendingAt = this.actionTime - delay;
  }

  private lunge(force: number): void {
    this.knockX += Math.cos(this.aimAngle) * force;
    this.knockY += Math.sin(this.aimAngle) * force;
  }

  private tryDash(mx: number, my: number): void {
    if (this.dashCharges <= 0 || this.state === 'dash') return;
    this.dashCharges -= 1;
    let ax = mx;
    let ay = my;
    if (Math.hypot(ax, ay) < 0.15) {
      const a = DIR_ANGLE[this.facing];
      ax = Math.cos(a);
      ay = Math.sin(a);
    }
    const len = Math.hypot(ax, ay) || 1;
    const sp = 285 * (this.w.ctx.stats.moveSpeed / 100);
    this.dashVX = (ax / len) * sp;
    this.dashVY = (ay / len) * sp;
    this.facing = dirFromVector(ax, ay, this.facing);
    this.dashTime = 0.17;
    this.state = 'dash';
    this.invuln = Math.max(this.invuln, 0.24);
    this.pendingHit = null;
    this.playAnim('walk', true);
    this.w.sfx('dash', 0.7);
    services.platform?.haptic('light');
    this.w.onDash();
    const ctx = this.w.ctx;
    if (ctx.has('dash_nova')) {
      this.scene.time.delayedCall(170, () => this.w.explode(this.x, this.y, 30, ctx.p('dash_nova') / 100, 'fire', true, ['burn', 0.6]));
    }
    if (ctx.has('dash_frost')) {
      this.scene.time.delayedCall(170, () => this.w.explode(this.x, this.y, 30, ctx.p('dash_frost') / 100, 'ice', true, ['chill', 1]));
    }
  }

  private afterimage(): void {
    const ghost = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name);
    ghost.setDepth(this.sprite.depth - 1).setTintFill(this.hero.color).setAlpha(0.5).setBlendMode('ADD');
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
  }

  private trySkill(): void {
    if (this.skillCd > 0 || this.state === 'dash') return;
    const st = this.w.ctx.stats;
    this.skillCd = this.skillMax;
    this.state = 'skill';
    this.pendingHit = null;
    const skillMult = SKILL_POWER * (1 + st.skillDmg / 100);
    const aim = this.aimAt();
    this.aimAngle = aim.angle;
    const color = this.hero.color;
    services.platform?.haptic('medium');
    switch (this.hero.style) {
      case 'swordbow': {
        // Lantern Spin: two whirling blade arcs in lantern-fire colour, a shockwave and a second, wider pulse.
        const r = 40 * (st.areaSize / 100);
        this.actionTime = 0.36;
        this.playAnim('spin', true);
        this.w.sfx('spin', 0.9);
        this.invuln = Math.max(this.invuln, 0.25);
        this.w.fx.whirl(this.x, this.y - 4, r, color, 320);
        this.w.fx.ring(this.x, this.y - 4, r * 1.1, color, 320);
        this.w.melee({ x: this.x, y: this.y - 4, angle: 0, radius: r, arc: 360, mult: 1.8 * skillMult, knock: 220, full: true, isSkill: true });
        this.scene.time.delayedCall(180, () => {
          if (!this.alive) return;
          this.w.fx.ring(this.x, this.y - 4, r * 1.35, 0xfff0c8, 280);
          this.w.melee({ x: this.x, y: this.y - 4, angle: 0, radius: r * 1.15, arc: 360, mult: 0.9 * skillMult, knock: 120, full: true, isSkill: true });
        });
        this.w.light(this.x, this.y, 70, color, 350);
        this.w.shake(0.004, 160);
        break;
      }
      case 'spear': {
        // Skewer Rush: an icy charge that pierces everything in its path and ends in a frost burst.
        this.actionTime = 0.3;
        this.playAnim('attack', true);
        this.facing = dirFromVector(Math.cos(aim.angle), Math.sin(aim.angle), this.facing);
        this.dashVX = Math.cos(aim.angle) * 330;
        this.dashVY = Math.sin(aim.angle) * 330;
        this.dashTime = 0.26;
        this.state = 'dash';
        this.invuln = Math.max(this.invuln, 0.3);
        this.w.sfx('dash', 0.9);
        const sx = this.x;
        const sy = this.y;
        for (let i = 1; i <= 4; i++) {
          this.scene.time.delayedCall(i * 60, () => {
            if (!this.alive) return;
            this.w.fx.streak(sx, sy - 6, this.x, this.y - 6, color, 1.4, 260);
            this.w.melee({ x: this.x, y: this.y - 4, angle: aim.angle, radius: 30, arc: 180, mult: 0.75 * skillMult, knock: 160, isSkill: true });
          });
        }
        this.scene.time.delayedCall(290, () => {
          if (!this.alive) return;
          this.w.explode(this.x + Math.cos(aim.angle) * 14, this.y - 4 + Math.sin(aim.angle) * 14, 34 * (st.areaSize / 100), 0.9 * skillMult, 'ice', true, ['chill', 1]);
        });
        break;
      }
      case 'staff': {
        // Starfall Nova: a chilling burst of starlight, then stars rain down on up to five nearby foes.
        this.actionTime = 0.4;
        this.playAnim('attack', true);
        this.w.sfx('nova', 0.9);
        const r = 64 * (st.areaSize / 100);
        this.w.fx.ring(this.x, this.y - 4, r * 1.2, color, 420);
        this.w.fx.sparkle(this.x, this.y - 10, 0xffffff, 40, 420);
        this.w.explode(this.x, this.y - 4, r, 2.2 * skillMult, 'ice', true, ['chill', 1]);
        const targets = this.w.enemies.filter((e) => e.alive && Math.hypot(e.x - this.x, e.y - this.y) < 150).slice(0, 5);
        targets.forEach((e, i) => {
          this.scene.time.delayedCall(160 + i * 90, () => {
            if (!e.alive) return;
            this.w.fx.streak(e.x - 18, e.y - 70, e.x, e.y - 6, color, 1.2, 200);
            this.w.fx.sparkle(e.x, e.y - 6, color, 22, 360);
            this.w.explode(e.x, e.y - 4, 20, 0.8 * skillMult, 'holy', true);
          });
        });
        break;
      }
      case 'twinblade': {
        // Crescent Wave: three crimson blade waves that cut through every enemy in their path.
        this.actionTime = 0.3;
        this.playAnim('attack', true);
        this.w.sfx('swing_heavy', 0.9);
        this.w.fx.slash(this.x, this.y - 4, aim.angle, 30, color, 2.2);
        for (const off of [-0.3, 0, 0.3]) {
          this.w.fire({ x: this.x, y: this.y - 4, angle: aim.angle + off, speed: 220, friendly: true, damage: 1.3 * skillMult, element: 'physical', kind: 'wave', pierce: 99, range: 160, isSkill: true, scale: 1.3, tint: color });
        }
        this.w.shake(0.003, 120);
        break;
      }
    }
  }

  private tryFlare(): void {
    if (this.flare < 100) return;
    this.flare = 0;
    this.w.sfx('flare', 1);
    services.platform?.haptic('heavy');
    this.invuln = Math.max(this.invuln, 1);
    const st = this.w.ctx.stats;
    this.w.light(this.x, this.y, 260, 0xfff0c0, 900);
    this.w.shake(0.012, 400);
    this.w.hitStop(120);
    for (const e of [...this.w.enemies]) {
      if (!e.alive) continue;
      e.statuses.apply('stun', 0, 1.8);
      this.scene.time.delayedCall(120, () => {
        if (e.alive) this.w.melee({ x: e.x, y: e.y, angle: 0, radius: e.radius + 4, arc: 360, mult: 4 * (1 + st.skillDmg / 100), knock: 200, full: true, element: 'holy', isSkill: true });
      });
    }
  }

  private tryPotion(): void {
    if (this.potions <= 0 || this.hp >= this.maxHp) return;
    this.potions -= 1;
    const amt = this.maxHp * 0.35 * (1 + this.w.ctx.stats.potionPower / 100);
    this.heal(amt, true);
    this.w.sfx('potion', 0.9);
    this.w.light(this.x, this.y, 40, 0xff6a7a, 400);
  }

  heal(amount: number, show: boolean): void {
    if (!this.alive || amount <= 0) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (show && this.hp - before >= 1) this.w.floatText(this.x, this.y - 18, `+${Math.round(this.hp - before)}`, 0x6bd46b);
  }

  /** Returns true if damage was applied. */
  receiveHit(): boolean {
    if (!this.alive || this.invuln > 0 || this.state === 'dash') return false;
    return true;
  }

  onHurt(): void {
    this.invuln = 0.6;
    this.flash(0xff4040, 0.1);
    services.platform?.haptic('medium');
  }

  die(): void {
    this.alive = false;
    this.state = 'dead';
    this.body.setVelocity(0, 0);
    this.sprite.setAlpha(1);
    const key = this.animKey('death', this.facing);
    if (this.hero.rig === 'hero' && this.scene.anims.exists(key)) this.sprite.play(key);
    else {
      this.scene.tweens.add({ targets: this.sprite, angle: 90, alpha: 0.6, duration: 500 });
    }
  }

  /** Rise again after a rewarded revive. */
  revive(hpFraction: number): void {
    this.alive = true;
    this.state = 'idle';
    this.hp = Math.max(1, Math.round(this.maxHp * hpFraction));
    this.invuln = 2.5;
    this.statuses.clear();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAngle(0).setAlpha(1);
    this.playAnim('idle', true);
    this.flash(0xfff0c0, 0.25);
  }

  get isInvulnerable(): boolean {
    return this.invuln > 0 || this.state === 'dash';
  }
}
