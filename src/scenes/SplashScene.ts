import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { COLORS, FONT } from '@/ui/theme';
import { services } from '@/core/services';

/** Studio card -> title card, then onboarding (first launch) or main menu. */
export class SplashScene extends BaseScene {
  constructor() {
    super('Splash');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg0);
    const cx = this.W / 2;
    const cy = this.H / 2;
    const hasLogo = this.textures.exists('ui_studio_logo');
    const studio = hasLogo
      ? this.add.image(cx, cy - 10, 'ui_studio_logo').setScale(Math.min(1, (this.W * 0.5) / this.textures.get('ui_studio_logo').getSourceImage().width))
      : this.add.bitmapText(cx, cy - 10, FONT.title, 'EMBERLIGHT STUDIO').setOrigin(0.5).setTint(COLORS.gold);
    const sub = this.add.bitmapText(cx, cy + 40, FONT.small, 'presents').setOrigin(0.5).setTint(COLORS.textDim);
    studio.setAlpha(0);
    sub.setAlpha(0);
    this.tweens.add({ targets: [studio, sub], alpha: 1, duration: 600, ease: 'Sine.easeOut' });
    services.audio?.sfx('ui_splash', { volume: 0.7 });

    const next = () => {
      if (this.transitioning) return;
      const save = this.save;
      if (!save.profile.onboardingDone) this.goTo('Onboarding', {}, 500);
      else this.goTo('Menu', {}, 500);
    };
    this.time.delayedCall(2000, next);
    this.input.once('pointerdown', next);
  }
}

export function addEmberParticles(scene: Phaser.Scene, w: number, h: number, depth = 5): Phaser.GameObjects.Particles.ParticleEmitter {
  const em = scene.add.particles(0, 0, 'fx_px2', {
    x: { min: 0, max: w },
    y: h + 4,
    lifespan: { min: 3500, max: 7000 },
    speedY: { min: -30, max: -12 },
    speedX: { min: -6, max: 6 },
    scale: { start: 1, end: 0.3 },
    alpha: { start: 0.9, end: 0 },
    tint: [COLORS.ember, COLORS.gold, 0xffd9a0],
    frequency: 140,
    blendMode: 'ADD',
  });
  em.setDepth(depth);
  return em;
}
