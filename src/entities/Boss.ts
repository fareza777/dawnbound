import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { BossAttack, BossDef, BossPhase } from '@/data/bosses';
import type { EnemyDef } from '@/data/enemies';
import type { World } from '@/game/World';
import { tr } from '@/core/i18n';
import type { StatusKind } from '@/systems/combat';

type BState = 'intro' | 'idle' | 'attack' | 'dead';

/**
 * Bosses use the large front-facing battler art, animated with tweens (breathing, lunges, squash) instead of frames.
 * Attacks are scripted sequences picked by weight from the current phase.
 */
export class Boss extends Enemy {
  bstate: BState = 'intro';
  phaseIndex = 0;
  partner: Boss | null = null;
  x0: number;
  private next = 2.2;
  private breathe?: Phaser.Tweens.Tween;
  private baseScale: number;
  private enraged = false;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly bdef: BossDef, readonly slot: number, world: () => World, hpMul: number, atkMul: number) {
    const pseudo: EnemyDef = {
      id: bdef.id, name: bdef.name, lore: bdef.title,
      sprite: { atlas: 'monsters', key: 'm01_0', frontOnly: true },
      ai: 'turret', hp: bdef.hp, atk: bdef.atk, def: bdef.def, speed: bdef.phases[0].speed, radius: bdef.radius,
      xp: 0, gold: [0, 0], element: bdef.element, projTint: bdef.tint,
    };
    super(scene, x, y, pseudo, { hp: hpMul, atk: atkMul }, world, false);
    this.boss = true;
    this.x0 = x;
    this.sprite.anims.stop();
    this.sprite.setTexture('battlers', bdef.frame);
    this.baseScale = bdef.scale;
    this.sprite.setScale(bdef.scale).setAlpha(0).setOrigin(0.5, 1);
    this.spriteOffsetY = 6;
    this.shadow.setScale(bdef.radius / 5, 2);
    this.body.setCircle(bdef.radius);
    this.body.setImmovable(true);
    this.body.setMass(50);
    this.invulnerable = true;
    this.state = 'move';
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 900, delay: 200 });
    scene.time.delayedCall(1600, () => {
      this.invulnerable = false;
      this.bstate = 'idle';
      this.startBreathing();
    });
  }

  get phase(): BossPhase {
    return this.bdef.phases[this.phaseIndex];
  }

  get displayName(): string {
    return tr(this.bdef.name);
  }

  private startBreathing(): void {
    this.breathe?.stop();
    this.sprite.setScale(this.baseScale);
    this.breathe = this.scene.tweens.add({
      targets: this.sprite, scaleY: this.baseScale * 1.035, scaleX: this.baseScale * 0.985,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  update(dt: number): void {
    if (!this.alive) return;
    const w = this.w;
    const p = w.player;
    const dot = this.statuses.tick(dt);
    if (dot > 0) w.dotEnemy(this, dot);
    if (!this.alive) return;
    this.sprite.setFlipX(p.x < this.x);
    this.checkPhase();
    const kb = this.consumeKnockback(dt);
    const canAct = this.statuses.canAct();
    if (this.bstate === 'idle' && canAct) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const want = d > 70 ? 1 : d < 40 ? -0.6 : 0.15;
      const sp = this.phase.speed * this.statuses.speedMult() * (this.enraged ? 1.3 : 1);
      this.body.setVelocity((dx / d) * sp * want + kb.x, (dy / d) * sp * want + kb.y);
      this.next -= dt;
      if (this.next <= 0) this.chooseAttack();
    } else if (this.bstate !== 'attack') {
      this.body.setVelocity(kb.x, kb.y);
    }
    this.contactCd -= dt;
    const dist = Math.hypot(p.x - this.x, p.y - this.y);
    if (dist < this.radius + p.radius + 2 && this.contactCd <= 0) {
      this.contactCd = 0.9;
      w.damagePlayer(this.atk * 0.8, this.bdef.element, { x: this.x, y: this.y });
    }
    this.statusTint();
    this.syncVisual(dt);
  }

  private checkPhase(): void {
    const ratio = this.hp / this.maxHp;
    let idx = 0;
    this.bdef.phases.forEach((ph, i) => {
      if (ratio <= ph.below) idx = i;
    });
    if (idx > this.phaseIndex) {
      this.phaseIndex = idx;
      const w = this.w;
      w.shake(0.01, 500);
      w.light(this.x, this.y - 30, 90, this.bdef.tint, 700);
      w.sfx('boss_phase', 1);
      if (this.phase.line) w.floatText(this.x, this.y - 70, tr(this.phase.line), 0xffd84a, true);
      if (this.bdef.frame2 && idx === 1) {
        this.sprite.setTexture('battlers', this.bdef.frame2);
      }
      this.statuses.clear();
      this.next = 0.8;
      w.hudEvent('bossPhase', this);
    }
  }

  private chooseAttack(): void {
    const w = this.w;
    const atk = w.rng.weighted(this.phase.attacks);
    this.bstate = 'attack';
    this.body.setVelocity(0, 0);
    const done = (extra = 0) => {
      if (!this.alive) return;
      this.bstate = 'idle';
      this.next = this.phase.pause * (this.enraged ? 0.7 : 1) + extra;
    };
    this.perform(atk, done);
  }

  private later(ms: number, fn: () => void): void {
    this.scene.time.delayedCall(ms, () => {
      if (this.alive) fn();
    });
  }

  private shot(angle: number, speed: number, dmgMul = 0.8, kind: 'orb' | 'bolt' | 'fire' | 'ice' | 'shadow' | 'spore' = 'orb', extra: { homing?: number; status?: [StatusKind, number]; radius?: number } = {}): void {
    const el = this.bdef.element;
    this.w.fire({
      x: this.x, y: this.y - 20, angle, speed, friendly: false, damage: this.atk * dmgMul, element: el, kind,
      tint: this.bdef.tint, range: 320, status: extra.status ?? this.elementStatus(), homing: extra.homing, radius: extra.radius,
    });
  }

  private elementStatus(): [StatusKind, number] | undefined {
    switch (this.bdef.element) {
      case 'fire': return ['burn', 0.3];
      case 'ice': return ['chill', 0.4];
      case 'poison': return ['poison', 0.4];
      default: return undefined;
    }
  }

  private telegraphCircle(x: number, y: number, r: number, ms: number): void {
    const g = this.scene.add.graphics().setDepth(4);
    g.fillStyle(0xff3030, 0.22).fillCircle(0, 0, r).lineStyle(1, 0xff6060, 0.9).strokeCircle(0, 0, r);
    g.setPosition(x, y).setScale(0.2);
    this.scene.tweens.add({ targets: g, scale: 1, duration: ms * 0.6 });
    this.scene.time.delayedCall(ms, () => g.destroy());
  }

  private perform(a: BossAttack, done: (extra?: number) => void): void {
    const w = this.w;
    const p = w.player;
    const aim = () => Math.atan2(p.y - (this.y - 10), p.x - this.x);
    const kind = this.bdef.element === 'fire' ? 'fire' : this.bdef.element === 'ice' ? 'ice' : this.bdef.element === 'shadow' ? 'shadow' : this.bdef.element === 'poison' ? 'spore' : 'bolt';
    const speedMul = this.enraged ? 1.2 : 1;
    switch (a) {
      case 'charge':
      case 'charge3': {
        const n = a === 'charge3' ? 3 : 1;
        const doCharge = (i: number) => {
          const ang = aim();
          const g = this.scene.add.graphics().setDepth(4);
          g.fillStyle(0xff3030, 0.25);
          const pts = [[0, -12], [220, -12], [220, 12], [0, 12]].map(([x, y]) => new Phaser.Math.Vector2(x, y).rotate(ang));
          g.fillPoints(pts, true).setPosition(this.x, this.y);
          this.scene.tweens.add({ targets: this.sprite, x: this.sprite.x + Math.cos(ang) * -4, duration: 60, yoyo: true, repeat: 4 });
          w.sfx('telegraph', 0.6);
          this.later(i === 0 ? 650 : 420, () => {
            g.destroy();
            w.sfx('charge', 0.9);
            this.body.setVelocity(Math.cos(ang) * 300 * speedMul, Math.sin(ang) * 300 * speedMul);
            this.later(480, () => {
              this.body.setVelocity(0, 0);
              w.shake(0.006, 150);
              if (i + 1 < n) doCharge(i + 1);
              else done(0.4);
            });
          });
        };
        doCharge(0);
        break;
      }
      case 'slam': {
        const tx = p.x;
        const ty = p.y;
        this.telegraphCircle(tx, ty, 38, 850);
        this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y - 40, alpha: 0.6, duration: 380, ease: 'Quad.easeOut' });
        w.sfx('boss_jump', 0.8);
        this.invulnerable = true;
        this.later(420, () => this.body.reset(tx, ty));
        this.later(850, () => {
          this.invulnerable = false;
          this.sprite.setAlpha(1);
          w.explode(tx, ty, 38, this.atk * 1.4, 'physical', false);
          w.shake(0.012, 250);
          w.sfx('slam', 1);
          for (let i = 0; i < 10; i++) this.shot((i / 10) * Math.PI * 2, 85 * speedMul, 0.6, kind);
          done(0.5);
        });
        break;
      }
      case 'fan': {
        let waves = 0;
        const fire = () => {
          const base = aim();
          const count = this.phaseIndex > 0 ? 7 : 5;
          for (let i = 0; i < count; i++) this.shot(base + (i - (count - 1) / 2) * 0.18, 125 * speedMul, 0.8, kind);
          w.sfx('boss_shoot', 0.6);
          waves++;
          if (waves < 3) this.later(380, fire);
          else done();
        };
        this.flash(0xffffff, 0.08);
        this.later(350, fire);
        break;
      }
      case 'ring': {
        let rings = 0;
        const fire = () => {
          const off = rings * 0.2;
          for (let i = 0; i < 16; i++) this.shot(off + (i / 16) * Math.PI * 2, 80 * speedMul, 0.7, kind);
          w.sfx('boss_shoot', 0.6);
          rings++;
          if (rings < 3) this.later(500, fire);
          else done();
        };
        this.later(300, fire);
        break;
      }
      case 'spiral': {
        let t = 0;
        let ang = aim();
        const arms = this.phaseIndex >= 2 ? 4 : 3;
        const step = () => {
          for (let k = 0; k < arms; k++) this.shot(ang + (k / arms) * Math.PI * 2, 75 * speedMul, 0.6, kind);
          ang += 0.28;
          t++;
          if (t < 26) this.later(90, step);
          else done();
        };
        w.light(this.x, this.y - 20, 50, this.bdef.tint, 2500);
        this.later(300, step);
        break;
      }
      case 'burst': {
        let n = 0;
        const step = () => {
          this.shot(aim(), 170 * speedMul, 0.75, 'bolt');
          n++;
          if (n < 6) this.later(110, step);
          else done();
        };
        this.later(250, step);
        break;
      }
      case 'homing': {
        const count = this.phaseIndex > 0 ? 5 : 3;
        for (let i = 0; i < count; i++) {
          this.later(i * 220, () => this.shot(aim() + (i - (count - 1) / 2) * 0.5, 70, 1, 'orb', { homing: 1.4, radius: 5 }));
        }
        w.sfx('boss_cast', 0.7);
        this.later(count * 220 + 200, () => done());
        break;
      }
      case 'summon': {
        const id = this.bdef.summon;
        w.sfx('summon', 0.9);
        if (id) {
          const alive = w.enemies.filter((e) => e.alive && !e.boss).length;
          const n = alive > 4 ? 1 : this.phaseIndex > 0 ? 3 : 2;
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const x = this.x + Math.cos(ang) * 40;
            const y = this.y + Math.sin(ang) * 30;
            if (w.isWalkableAt(x, y, false)) {
              w.light(x, y, 20, this.bdef.tint, 700);
              this.later(500, () => w.spawnEnemy(id, x, y));
            }
          }
        }
        this.later(700, () => done());
        break;
      }
      case 'rain': {
        const n = this.phaseIndex > 0 ? 10 : 7;
        for (let i = 0; i < n; i++) {
          this.later(i * 140, () => {
            const x = i % 3 === 0 ? p.x : Phaser.Math.Clamp(p.x + Phaser.Math.Between(-80, 80), 24, w.roomWidth - 24);
            const y = i % 3 === 0 ? p.y : Phaser.Math.Clamp(p.y + Phaser.Math.Between(-80, 80), 70, w.roomHeight - 24);
            this.telegraphCircle(x, y, 20, 700);
            this.later(700, () => w.explode(x, y, 20, this.atk, this.bdef.element, false, this.elementStatus()));
          });
        }
        w.sfx('boss_cast', 0.8);
        this.later(n * 140 + 800, () => done());
        break;
      }
      case 'sweep': {
        let ang = aim() - 1.2;
        let t = 0;
        const g = this.scene.add.graphics().setDepth(4);
        g.lineStyle(3, 0xff3030, 0.4);
        g.lineBetween(0, 0, Math.cos(ang) * 200, Math.sin(ang) * 200).setPosition(this.x, this.y - 20);
        this.later(500, () => {
          g.destroy();
          const step = () => {
            for (let k = 0; k < 2; k++) this.shot(ang + k * Math.PI, 150, 0.55, 'bolt');
            ang += 0.1;
            t++;
            if (t < 26) this.later(55, step);
            else done();
          };
          step();
        });
        break;
      }
      case 'teleport': {
        this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 250 });
        this.invulnerable = true;
        w.sfx('blink', 0.8);
        this.later(300, () => {
          const x = Phaser.Math.Clamp(p.x + Phaser.Math.Between(-70, 70), 30, w.roomWidth - 30);
          const y = Phaser.Math.Clamp(p.y - Phaser.Math.Between(50, 90), 70, w.roomHeight - 40);
          this.body.reset(x, y);
          w.light(x, y - 20, 50, this.bdef.tint, 500);
          this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 250 });
          this.later(260, () => {
            this.invulnerable = false;
            for (let i = 0; i < 8; i++) this.shot((i / 8) * Math.PI * 2, 90, 0.6, kind);
            done(0.2);
          });
        });
        break;
      }
      case 'nova': {
        this.telegraphCircle(this.x, this.y, 70, 900);
        w.sfx('boss_cast', 0.9);
        this.later(900, () => {
          w.explode(this.x, this.y, 70, this.atk * 1.3, this.bdef.element, false, this.elementStatus());
          w.shake(0.01, 250);
          done(0.3);
        });
        break;
      }
      case 'cross': {
        let t = 0;
        const step = () => {
          const off = (t % 2) * (Math.PI / 4);
          for (let k = 0; k < 4; k++) {
            this.shot(off + (k * Math.PI) / 2, 110, 0.65, kind);
            this.shot(off + (k * Math.PI) / 2 + 0.08, 100, 0.65, kind);
          }
          t++;
          if (t < 8) this.later(240, step);
          else done();
        };
        this.later(300, step);
        break;
      }
    }
  }

  onDeath(): void {
    const w = this.w;
    this.breathe?.stop();
    w.floatText(this.x, this.y - 60, tr(this.bdef.defeat), 0xffd9a0, true);
    if (this.partner && this.partner.alive) {
      this.partner.enrage();
      return;
    }
    w.bossDefeated();
  }

  enrage(): void {
    this.enraged = true;
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
    this.setBaseTint(0xff9090);
    this.w.floatText(this.x, this.y - 60, 'ENRAGED', 0xff4f6d, true);
    this.w.sfx('boss_roar', 1);
    this.phaseIndex = this.bdef.phases.length - 1;
  }
}
