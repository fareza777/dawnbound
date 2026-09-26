import Phaser from 'phaser';
import type { ProjectileSpec } from './World';

export interface Projectile {
  spec: ProjectileSpec;
  img: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  traveled: number;
  hits: Set<unknown>;
  pierceLeft: number;
  bounceLeft: number;
  alive: boolean;
  age: number;
  startX: number;
  startY: number;
}

const TEX: Record<ProjectileSpec['kind'], string> = {
  arrow: 'proj_arrow', orb: 'proj_orb', star: 'proj_star', wave: 'proj_wave', bolt: 'proj_bolt',
  thorn: 'proj_bolt', spore: 'proj_spore', fire: 'proj_orb', ice: 'proj_orb', shadow: 'proj_orb',
};

const DEFAULT_TINT: Record<string, number> = {
  physical: 0xf0e6d0, fire: 0xff8a3c, ice: 0x9ee8ff, shock: 0xfff27a, poison: 0xa8e05f, holy: 0xfff0a0, shadow: 0xb080ff,
};

/** Pooled projectile manager with manual integration (cheaper and more controllable than physics bodies). */
export class Projectiles {
  list: Projectile[] = [];
  private pool: Phaser.GameObjects.Image[] = [];
  private glowPool: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene, private highQuality: boolean) {}

  spawn(spec: ProjectileSpec): Projectile {
    const img = this.pool.pop() ?? this.scene.add.image(0, 0, TEX[spec.kind]);
    img.setTexture(TEX[spec.kind]).setVisible(true).setActive(true).setAlpha(1);
    const tint = spec.tint ?? DEFAULT_TINT[spec.element] ?? 0xffffff;
    if (spec.kind === 'arrow') img.clearTint();
    else img.setTint(tint);
    img.setScale(spec.scale ?? (spec.friendly ? 1 : 1));
    img.setBlendMode(spec.kind === 'arrow' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
    img.setRotation(spec.angle);
    img.setPosition(spec.x, spec.y);
    img.setDepth(spec.y + 2000);
    let glow: Phaser.GameObjects.Image | undefined;
    if (this.highQuality && spec.kind !== 'arrow') {
      glow = this.glowPool.pop() ?? this.scene.add.image(0, 0, 'fx_light_px');
      glow.setVisible(true).setActive(true).setTint(tint).setAlpha(spec.friendly ? 0.35 : 0.45).setBlendMode(Phaser.BlendModes.ADD);
      glow.setScale((spec.radius ?? 3) / 10 + 0.18);
      glow.setPosition(spec.x, spec.y);
      glow.setDepth(spec.y + 1999);
    }
    const p: Projectile = {
      spec,
      img,
      glow,
      x: spec.x,
      y: spec.y,
      vx: Math.cos(spec.angle) * spec.speed,
      vy: Math.sin(spec.angle) * spec.speed,
      traveled: 0,
      hits: new Set(),
      pierceLeft: spec.pierce ?? 0,
      bounceLeft: spec.bounce ?? 0,
      alive: true,
      age: 0,
      startX: spec.x,
      startY: spec.y,
    };
    this.list.push(p);
    return p;
  }

  kill(p: Projectile): void {
    if (!p.alive) return;
    p.alive = false;
    p.img.setVisible(false).setActive(false);
    this.pool.push(p.img);
    if (p.glow) {
      p.glow.setVisible(false).setActive(false);
      this.glowPool.push(p.glow);
    }
  }

  compact(): void {
    if (this.list.length > 64 && this.list.some((p) => !p.alive)) this.list = this.list.filter((p) => p.alive);
    else if (this.list.every((p) => !p.alive)) this.list.length = 0;
  }

  clearHostile(): void {
    for (const p of this.list) if (p.alive && !p.spec.friendly) this.kill(p);
  }

  clearAll(): void {
    for (const p of this.list) this.kill(p);
    this.list.length = 0;
  }
}
