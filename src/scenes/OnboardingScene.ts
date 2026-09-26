import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { COLORS, FONT } from '@/ui/theme';
import { Button, label, panel } from '@/ui/widgets';
import { t } from '@/core/i18n';
import { services } from '@/core/services';
import { addEmberParticles } from './SplashScene';
import { vx } from '@/core/viewport';

interface Card {
  title: string;
  body: string;
  art: (x: number, y: number) => Phaser.GameObjects.GameObject[];
}

/** First-launch explainer: three swipeable cards with live sprite vignettes. */
export class OnboardingScene extends BaseScene {
  private index = 0;
  private cardObjs: Phaser.GameObjects.GameObject[] = [];
  private dots: Phaser.GameObjects.Arc[] = [];
  private nextBtn!: Button;

  constructor() {
    super('Onboarding');
  }

  create(): void {
    this.transitioning = false;
    this.index = 0;
    this.fadeIn(500);
    services.audio?.playMusic('m_title');
    const { W, H } = this;
    this.cameras.main.setBackgroundColor(COLORS.bg0);
    addEmberParticles(this, W, H, 0);
    this.dots = [0, 1, 2].map((i) => this.add.circle(W / 2 - 16 + i * 16, H - 96, 4, COLORS.border));
    this.nextBtn = new Button(this, W / 2, H - 56, t('next'), () => this.advance(), { w: Math.min(220, W - 60), h: 32, style: 'primary' });
    new Button(this, W - 44, 30, t('skip'), () => this.finish(), { w: 64, h: 24, font: FONT.small });
    this.showCard(0);
    let startX = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (startX = vx(p)));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (vx(p) - startX < -50) this.advance();
      else if (vx(p) - startX > 50 && this.index > 0) this.showCard(this.index - 1);
    });
    this.handleBack(() => {
      if (this.index > 0) this.showCard(this.index - 1);
      return true;
    });
  }

  private cards(): Card[] {
    return [
      {
        title: t('obTitle1'), body: t('obBody1'),
        art: (x, y) => {
          const hero = this.add.sprite(x, y, 'heroes', 'hero1/attack/right/0').setScale(3);
          hero.play({ key: 'hero1_attack_right', repeat: -1, repeatDelay: 400 });
          const slime = this.add.sprite(x + 70, y + 10, 'monsters', 'm01_0/left/0').setScale(3).play('m01_0_left');
          return [hero, slime];
        },
      },
      {
        title: t('obTitle2'), body: t('obBody2'),
        art: (x, y) => {
          const objs: Phaser.GameObjects.GameObject[] = [];
          const colors = [0xff7a2f, 0x9ee8ff, 0xfff27a, 0x8fdc4a, 0xfff0a0, 0xb080ff];
          colors.forEach((c, i) => {
            const a = (i / colors.length) * Math.PI * 2;
            const o = this.add.image(x + Math.cos(a) * 60, y + Math.sin(a) * 40, 'proj_orb').setTint(c).setScale(3).setBlendMode('ADD');
            const g = this.add.image(o.x, o.y, 'fx_light').setTint(c).setBlendMode('ADD').setScale(0.4).setAlpha(0.5);
            this.tweens.add({ targets: [o, g], y: o.y - 6, yoyo: true, repeat: -1, duration: 800 + i * 90, ease: 'Sine.easeInOut' });
            objs.push(g, o);
          });
          objs.push(this.add.sprite(x, y, 'heroes', 'hero1/breath_idle/down/0').setScale(3).play('hero1_breath_idle_down'));
          return objs;
        },
      },
      {
        title: t('obTitle3'), body: t('obBody3'),
        art: (x, y) => {
          const glow = this.add.image(x, y - 10, 'fx_light').setTint(0xffb347).setBlendMode('ADD').setScale(1.4).setAlpha(0.6);
          this.tweens.add({ targets: glow, alpha: 0.3, yoyo: true, repeat: -1, duration: 1200 });
          const torii = this.add.image(x, y + 20, 'props', 'p/torii_01').setScale(2).setOrigin(0.5, 1);
          const hero = this.add.sprite(x, y + 20, 'heroes', 'hero1/idle/up/0').setScale(3).setOrigin(0.5, 1);
          return [glow, torii, hero];
        },
      },
    ];
  }

  private showCard(i: number): void {
    const { W, H } = this;
    this.index = i;
    for (const o of this.cardObjs) o.destroy();
    this.cardObjs = [];
    const card = this.cards()[i];
    const top = Math.round(H * 0.1);
    const art = card.art(W / 2, Math.round(H * 0.32));
    const p = panel(this, 20, Math.round(H * 0.5), W - 40, Math.round(H * 0.28), 'ui_panel_ornate');
    const title = label(this, W / 2, Math.round(H * 0.5) + 16, card.title.toUpperCase(), FONT.title, COLORS.gold, 0.5, 0).setScale(1.3);
    const body = this.add.bitmapText(W / 2, Math.round(H * 0.5) + 50, FONT.body, card.body).setOrigin(0.5, 0).setMaxWidth(W - 70).setCenterAlign().setTint(COLORS.text);
    const hdr = label(this, W / 2, top, `${i + 1} / 3`, FONT.small, COLORS.textDim, 0.5, 0);
    this.cardObjs = [...art, p, title, body, hdr];
    for (const o of this.cardObjs) {
      const go = o as Phaser.GameObjects.Image;
      go.setAlpha?.(0);
      this.tweens.add({ targets: go, alpha: 1, duration: 350 });
    }
    this.dots.forEach((d, k) => d.setFillStyle(k === i ? COLORS.gold : COLORS.border));
    this.nextBtn.setCaption(i === 2 ? t('tapToStart') : t('next'));
    services.audio?.sfx('ui_page', { volume: 0.6 });
  }

  private advance(): void {
    if (this.index < 2) this.showCard(this.index + 1);
    else this.finish();
  }

  private finish(): void {
    const s = this.save;
    s.profile.onboardingDone = true;
    services.save!.markDirty();
    this.goTo('Menu', {}, 500);
  }
}
