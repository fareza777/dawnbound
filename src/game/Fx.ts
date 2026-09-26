import Phaser from 'phaser';
import { FONT, fontSize } from '@/ui/theme';
import { view } from '@/core/viewport';

/** Visual juice: damage numbers, hit sparks, death bursts, shockwave rings, ambient particles. */
export class Fx {
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private pixels: Phaser.GameObjects.Particles.ParticleEmitter;
  private textPool: Phaser.GameObjects.BitmapText[] = [];
  showNumbers = true;

  constructor(private scene: Phaser.Scene, private quality: 'low' | 'high') {
    this.sparks = scene.add.particles(0, 0, 'fx_spark', {
      speed: { min: 40, max: 120 }, lifespan: { min: 120, max: 260 }, scale: { start: 1, end: 0 },
      blendMode: 'ADD', emitting: false,
    }).setDepth(95000);
    this.smoke = scene.add.particles(0, 0, 'fx_smoke', {
      speed: { min: 8, max: 30 }, lifespan: { min: 300, max: 600 }, scale: { start: 1.1, end: 0.2 },
      alpha: { start: 0.6, end: 0 }, emitting: false,
    }).setDepth(94000);
    this.pixels = scene.add.particles(0, 0, 'fx_px2', {
      speed: { min: 30, max: 110 }, lifespan: { min: 250, max: 600 }, scale: { start: 1, end: 0.4 },
      alpha: { start: 1, end: 0 }, gravityY: 180, emitting: false,
    }).setDepth(94500);
  }

  hit(x: number, y: number, tint: number, crit = false): void {
    this.sparks.setParticleTint(tint);
    this.sparks.explode(crit ? 8 : 4, x, y);
    if (crit) this.ring(x, y, 16, 0xffffff, 180);
  }

  death(x: number, y: number, tint: number, big = false): void {
    this.smoke.setParticleTint(0xd8d0e8);
    this.smoke.explode(big ? 12 : 5, x, y);
    this.pixels.setParticleTint(tint);
    this.pixels.explode(this.quality === 'high' ? (big ? 30 : 12) : 6, x, y);
  }

  burst(x: number, y: number, tint: number, n = 10): void {
    this.pixels.setParticleTint(tint);
    this.pixels.explode(n, x, y);
  }

  puff(x: number, y: number, n = 4): void {
    this.smoke.setParticleTint(0xc8c0d8);
    this.smoke.explode(n, x, y);
  }

  ring(x: number, y: number, radius: number, tint: number, ms = 300): void {
    // fx_ring_hd's bright band sits ~40px from the centre of its 128px texture.
    const g = this.scene.add.image(x, y, 'fx_ring_hd').setTint(tint).setBlendMode('ADD').setDepth(95000);
    g.setScale(0.08).setAlpha(0.95);
    this.scene.tweens.add({
      targets: g, scale: radius / 40, alpha: 0, duration: ms, ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  flashCircle(x: number, y: number, radius: number, tint: number, ms = 220): void {
    const c = this.scene.add.image(x, y, 'fx_light').setTint(tint).setBlendMode('ADD').setDepth(95001);
    c.setDisplaySize(radius * 2.4, radius * 2.4).setAlpha(0.9);
    this.scene.tweens.add({ targets: c, alpha: 0, duration: ms, onComplete: () => c.destroy() });
  }

  /** Melee swoosh: a crescent that sweeps through the swing and fades. Normal blending keeps the hero's colour true on bright floors. */
  slash(x: number, y: number, angle: number, radius: number, tint = 0xffffff, sweep = 0.55): void {
    const k = radius / 46;
    const s = this.scene.add.image(x, y, 'fx_slash_hd').setTint(tint).setDepth(y + 50);
    s.setRotation(angle - sweep / 2).setScale(k * 0.92).setAlpha(1);
    this.scene.tweens.add({ targets: s, rotation: angle + sweep / 2, scale: k * 1.08, duration: 110, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: s, alpha: 0, delay: 70, duration: 150, onComplete: () => s.destroy() });
  }

  /** Full 360° whirl of two crescents (spin attacks). */
  whirl(x: number, y: number, radius: number, tint: number, ms = 320): void {
    const k = radius / 46;
    for (const off of [0, Math.PI]) {
      const s = this.scene.add.image(x, y, 'fx_slash_hd').setTint(tint).setDepth(y + 50);
      s.setRotation(off).setScale(k);
      this.scene.tweens.add({ targets: s, rotation: off + Math.PI * 2.2, duration: ms, ease: 'Cubic.easeOut' });
      this.scene.tweens.add({ targets: s, alpha: 0, scale: k * 1.15, delay: ms * 0.55, duration: ms * 0.5, onComplete: () => s.destroy() });
    }
  }

  /** Speed streak from (x1,y1) to (x2,y2). */
  streak(x1: number, y1: number, x2: number, y2: number, tint: number, thick = 1, ms = 220): void {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 2) return;
    const s = this.scene.add.image(x2, y2, 'fx_streak').setOrigin(1, 0.5).setTint(tint).setBlendMode('ADD').setDepth(y2 + 40);
    s.setRotation(Math.atan2(y2 - y1, x2 - x1)).setDisplaySize(len, 10 * thick).setAlpha(0.95);
    this.scene.tweens.add({ targets: s, alpha: 0, scaleY: s.scaleY * 0.3, duration: ms, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
  }

  /** Twinkling four-point star. */
  sparkle(x: number, y: number, tint: number, size = 12, ms = 380): void {
    const s = this.scene.add.image(x, y, 'fx_star_hd').setTint(tint).setBlendMode('ADD').setDepth(95002);
    s.setDisplaySize(size, size).setRotation(Math.random() * 0.6);
    const k = s.scaleX;
    s.setScale(k * 0.3);
    this.scene.tweens.add({ targets: s, scale: k, rotation: s.rotation + 0.8, duration: ms * 0.4, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: s, alpha: 0, delay: ms * 0.4, duration: ms * 0.6, onComplete: () => s.destroy() });
  }

  number(x: number, y: number, text: string, color: number, big = false): void {
    if (!this.showNumbers && !big && /^\d+$/.test(text)) return;
    const t = this.textPool.pop() ?? this.scene.add.bitmapText(0, 0, FONT.small, '');
    const font = big ? FONT.head : FONT.small;
    t.setFont(font, fontSize(font, view.res));
    t.setScale(1).setText(text).setTint(color).setOrigin(0.5, 1);
    // Keep the whole text on screen, even when the hero stands against a wall.
    const wv = this.scene.cameras.main.worldView;
    const half = t.width / 2 + 2;
    const px = wv.width > half * 2 ? Phaser.Math.Clamp(x + Phaser.Math.Between(-4, 4), wv.x + half, wv.right - half) : x;
    t.setPosition(Math.round(px), Math.round(y));
    t.setDepth(96000).setAlpha(1).setVisible(true).setScale(big ? 0.6 : 1);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 90 });
    this.scene.tweens.add({
      targets: t, y: y - (big ? 22 : 14), alpha: 0, delay: big ? 380 : 220, duration: 380, ease: 'Quad.easeIn',
      onComplete: () => {
        t.setVisible(false);
        this.textPool.push(t);
      },
    });
  }

  ambient(kind: string, w: number, h: number, tint: number): Phaser.GameObjects.Particles.ParticleEmitter | null {
    if (this.quality === 'low') return null;
    const common = { x: { min: 0, max: w }, frequency: 220, blendMode: 'ADD' as const };
    let cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
    switch (kind) {
      case 'snow': cfg = { ...common, y: -4, lifespan: 7000, speedY: { min: 10, max: 22 }, speedX: { min: -8, max: 8 }, scale: { min: 0.5, max: 1 }, alpha: { start: 0.9, end: 0.2 }, tint: 0xffffff }; break;
      case 'leaves': cfg = { ...common, y: -4, lifespan: 8000, speedY: { min: 8, max: 16 }, speedX: { min: -12, max: 12 }, rotate: { min: 0, max: 360 }, alpha: { start: 0.8, end: 0 }, tint: [0x9fd18a, 0xd8e070, 0x6fa85a], blendMode: 'NORMAL', frequency: 500 }; break;
      case 'sand': cfg = { ...common, y: { min: 0, max: h }, x: -4, lifespan: 5000, speedX: { min: 20, max: 45 }, speedY: { min: -4, max: 4 }, alpha: { start: 0.5, end: 0 }, tint: 0xf0d090, blendMode: 'NORMAL', frequency: 180 }; break;
      case 'embers': cfg = { ...common, y: h + 4, lifespan: 6000, speedY: { min: -26, max: -10 }, speedX: { min: -6, max: 6 }, alpha: { start: 1, end: 0 }, scale: { start: 1, end: 0.3 }, tint: [0xff7a2f, 0xffb347] }; break;
      case 'spores': cfg = { ...common, y: { min: 0, max: h }, lifespan: 6000, speedY: { min: -6, max: 6 }, speedX: { min: -6, max: 6 }, alpha: { start: 0, end: 0.8 }, tint: 0xb8f090 }; break;
      default: cfg = { ...common, y: { min: 0, max: h }, lifespan: 6000, speedY: { min: -4, max: 4 }, speedX: { min: -4, max: 4 }, alpha: { start: 0.5, end: 0 }, tint: tint };
    }
    const tex = kind === 'leaves' ? 'fx_leaf' : 'fx_px2';
    return this.scene.add.particles(0, 0, tex, cfg).setDepth(89000);
  }
}
