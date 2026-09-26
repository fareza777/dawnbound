import Phaser from 'phaser';
import { StatusSet } from '@/systems/combat';
import type { Dir } from '@/gfx/animations';
import { snapWorld } from '@/core/viewport';
import { a11y } from '@/core/a11y';

/**
 * A physics anchor (invisible zone with an Arcade body at the feet) plus a separately positioned visual sprite.
 * Decoupling lets animation frames of different sizes (32px walk, 64px attack) swap without moving the hitbox.
 */
export abstract class Actor {
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  readonly statuses = new StatusSet();
  hp = 1;
  maxHp = 1;
  radius: number;
  facing: Dir = 'down';
  alive = true;
  /** Visual offset of the sprite relative to the feet anchor. */
  spriteOffsetY = -8;
  hitFlash = 0;
  knockX = 0;
  knockY = 0;
  private flashTint = 0xffffff;
  private baseTint = 0xffffff;
  private punchBase?: { x: number; y: number };
  private punchTween?: Phaser.Tweens.Tween;

  constructor(protected scene: Phaser.Scene, x: number, y: number, radius: number, atlas: string, frame: string) {
    this.radius = radius;
    this.zone = scene.add.zone(x, y, radius * 2, radius * 2);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(radius);
    this.body.setCollideWorldBounds(true);
    this.shadow = scene.add.image(x, y, 'fx_shadow');
    this.shadow.setScale(Math.max(0.6, radius / 6), 1).setAlpha(0.9);
    this.sprite = scene.add.sprite(x, y + this.spriteOffsetY, atlas, frame);
  }

  get x(): number {
    return this.zone.x;
  }

  get y(): number {
    return this.zone.y;
  }

  setBaseTint(c: number): void {
    this.baseTint = c;
    this.sprite.setTint(c);
  }

  flash(color = 0xffffff, time = 0.08): void {
    this.hitFlash = time;
    this.flashTint = color;
    this.sprite.setTintFill(color);
  }

  /** Quick squash-and-stretch so hits read as impacts. */
  punch(strength = 1): void {
    if (!this.alive) return;
    if (!this.punchBase) this.punchBase = { x: this.sprite.scaleX, y: this.sprite.scaleY };
    const b = this.punchBase;
    this.punchTween?.stop();
    this.sprite.setScale(b.x * (1 + 0.18 * strength), b.y * (1 - 0.14 * strength));
    this.punchTween = this.scene.tweens.add({ targets: this.sprite, scaleX: b.x, scaleY: b.y, duration: 120, ease: 'Back.easeOut' });
  }

  /** Sync visuals to the physics anchor; call once per frame. */
  syncVisual(dt: number): void {
    this.sprite.setPosition(snapWorld(this.zone.x), snapWorld(this.zone.y + this.spriteOffsetY));
    this.shadow.setPosition(snapWorld(this.zone.x), snapWorld(this.zone.y + 1));
    this.sprite.setDepth(this.zone.y);
    this.shadow.setDepth(this.zone.y - 20);
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      if (this.hitFlash <= 0) {
        this.sprite.clearTint();
        if (this.baseTint !== 0xffffff) this.sprite.setTint(this.baseTint);
        this.statusTint();
      } else this.sprite.setTintFill(this.flashTint);
    }
  }

  protected statusTint(): void {
    if (this.hitFlash > 0) return;
    if (this.statuses.has('freeze')) this.sprite.setTint(0xa8e8ff);
    else if (this.statuses.has('burn')) this.sprite.setTint(0xffb080);
    else if (this.statuses.has('poison')) this.sprite.setTint(a11y.colorblind ? 0xb0b0ff : 0xb8f090);
    else if (this.statuses.has('chill')) this.sprite.setTint(0xc8eeff);
    else if (this.baseTint !== 0xffffff) this.sprite.setTint(this.baseTint);
    else this.sprite.clearTint();
  }

  applyKnockback(fromX: number, fromY: number, force: number): void {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.knockX += (dx / d) * force;
    this.knockY += (dy / d) * force;
  }

  /** Knockback decays quickly; returns the velocity contribution this frame. */
  consumeKnockback(dt: number): { x: number; y: number } {
    const k = { x: this.knockX, y: this.knockY };
    const decay = Math.pow(0.0005, dt);
    this.knockX *= decay;
    this.knockY *= decay;
    if (Math.abs(this.knockX) < 1) this.knockX = 0;
    if (Math.abs(this.knockY) < 1) this.knockY = 0;
    return k;
  }

  destroy(): void {
    this.zone.destroy();
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
