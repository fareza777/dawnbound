import Phaser from 'phaser';
import type { Element } from '@/data/types';
import { a11y } from '@/core/a11y';

interface AuraSource {
  x: number;
  y: number;
  alive: boolean;
  def: { element?: Element };
}

type AuraElement = Exclude<Element, 'physical'>;

/** Particle look per element: fire embers, frost glitter, storm sparks, poison bubbles, holy motes, shadow wisps. */
const AURAS: Record<AuraElement, { tex: string; cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig }> = {
  fire: { tex: 'fx_px2', cfg: { speedY: { min: -30, max: -14 }, speedX: { min: -6, max: 6 }, lifespan: 650, alpha: { start: 1, end: 0 }, scale: { start: 1, end: 0.3 }, tint: [0xffd27a, 0xff8a3c], blendMode: 'ADD' } },
  ice: { tex: 'fx_px2', cfg: { speedY: { min: 4, max: 12 }, speedX: { min: -8, max: 8 }, lifespan: 800, alpha: { start: 1, end: 0 }, scale: { start: 0.9, end: 0.2 }, tint: [0xe8fbff, 0x9ee8ff], blendMode: 'ADD' } },
  shock: { tex: 'fx_px2', cfg: { speed: { min: 20, max: 45 }, lifespan: 180, alpha: { start: 1, end: 0 }, scale: { start: 1, end: 0.5 }, tint: [0xfff27a, 0xffffff], blendMode: 'ADD' } },
  poison: { tex: 'fx_px2', cfg: { speedY: { min: -16, max: -8 }, speedX: { min: -4, max: 4 }, lifespan: 900, alpha: { start: 0.9, end: 0 }, scale: { start: 0.6, end: 1.2 }, tint: [0x8fdc4a, 0xb6f06a] } },
  holy: { tex: 'fx_px2', cfg: { speedY: { min: -18, max: -8 }, lifespan: 750, alpha: { start: 1, end: 0 }, scale: { start: 0.9, end: 0.2 }, tint: [0xfff0b0, 0xffd84a], blendMode: 'ADD' } },
  shadow: { tex: 'fx_smoke', cfg: { speedY: { min: -12, max: -4 }, speedX: { min: -6, max: 6 }, lifespan: 900, alpha: { start: 0.45, end: 0 }, scale: { start: 0.25, end: 0.5 }, tint: [0x5a3a8a, 0x2a1a44] } },
};

/** Seconds between particles per enemy: a light shimmer that tells palette-swapped enemies apart at a glance. */
const INTERVAL = 0.16;

/**
 * Elemental auras for enemies. One pooled emitter per element serves every enemy of that element,
 * so the cost stays flat no matter how many monsters are on screen.
 */
export class EnemyAuras {
  private emitters = new Map<AuraElement, Phaser.GameObjects.Particles.ParticleEmitter>();
  private timer = 0;

  constructor(private scene: Phaser.Scene, private enabled: boolean) {}

  update(dt: number, enemies: readonly AuraSource[]): void {
    if (!this.enabled) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = INTERVAL;
    for (const e of enemies) {
      const el = e.def.element;
      if (!e.alive || !el || el === 'physical') continue;
      if (el === 'poison' && a11y.colorblind) this.emitter(el).particleTint = 0xa0a0ff;
      this.emitter(el).emitParticleAt(e.x + Phaser.Math.Between(-5, 5), e.y - Phaser.Math.Between(2, 12), 1);
    }
  }

  private emitter(el: AuraElement): Phaser.GameObjects.Particles.ParticleEmitter {
    let em = this.emitters.get(el);
    if (!em) {
      const a = AURAS[el];
      em = this.scene.add.particles(0, 0, a.tex, { ...a.cfg, emitting: false }).setDepth(95000);
      this.emitters.set(el, em);
    }
    return em;
  }
}
