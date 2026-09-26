import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { COLORS, FONT } from '@/ui/theme';
import { Button, label } from '@/ui/widgets';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { INTRO, type CinematicShot } from '@/data/story';
import { addEmberParticles } from './SplashScene';
import { vx, vy } from '@/core/viewport';

/** Story cinematic: Ken Burns pans over illustrated shots with typewriter narration and optional voice-over. */
export class IntroScene extends BaseScene {
  private shot = 0;
  private img?: Phaser.GameObjects.Image;
  private textObj?: Phaser.GameObjects.BitmapText;
  private typing?: Phaser.Time.TimerEvent;
  private fullText = '';
  private voice?: Phaser.Sound.BaseSound;
  private shots: CinematicShot[] = INTRO;
  private next: string = 'Hub';
  private done = false;

  constructor() {
    super('Intro');
  }

  init(data: { shots?: CinematicShot[]; next?: string }): void {
    this.shots = data.shots ?? INTRO;
    this.next = data.next ?? 'Hub';
    this.shot = 0;
    this.done = false;
    this.transitioning = false;
  }

  create(): void {
    const { W, H } = this;
    this.cameras.main.setBackgroundColor(0x000000);
    services.audio?.playMusic('m_intro', 1200);
    addEmberParticles(this, W, H, 20);
    // Letterbox bars
    const bar = Math.round(H * 0.08);
    this.add.rectangle(0, 0, W, bar, 0x000000).setOrigin(0, 0).setDepth(30);
    this.add.rectangle(0, H - bar, W, bar, 0x000000).setOrigin(0, 0).setDepth(30);
    const grad = this.add.graphics().setDepth(10);
    grad.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.95, 0.95).fillRect(0, H * 0.55, W, H * 0.45);
    new Button(this, W - 44, bar / 2, t('skip'), () => this.finish(), { w: 64, h: 22, font: FONT.small }).setDepth(40);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (vy(p) < bar + 4 && vx(p) > W - 90) return;
      this.advance();
    });
    this.handleBack(() => {
      this.finish();
      return true;
    });
    this.showShot(0);
  }

  private showShot(i: number): void {
    const { W, H } = this;
    const s = this.shots[i];
    const key = this.textures.exists(s.image) ? s.image : s.fallback;
    const old = this.img;
    if (old) this.tweens.add({ targets: old, alpha: 0, duration: 700, onComplete: () => old.destroy() });
    const img = this.add.image(W / 2, H * 0.4, key).setAlpha(0).setDepth(1);
    const cover = Math.max(W / img.width, (H * 0.8) / img.height) * 1.15;
    img.setScale(cover);
    if (!this.textures.exists(s.image) && s.tint) img.setTint(s.tint);
    this.tweens.add({ targets: img, alpha: 1, duration: 900 });
    const dur = 9000;
    switch (s.pan) {
      case 'up': img.y += 20; this.tweens.add({ targets: img, y: img.y - 40, duration: dur }); break;
      case 'down': img.y -= 20; this.tweens.add({ targets: img, y: img.y + 40, duration: dur }); break;
      case 'left': img.x += 20; this.tweens.add({ targets: img, x: img.x - 40, duration: dur }); break;
      case 'right': img.x -= 20; this.tweens.add({ targets: img, x: img.x + 40, duration: dur }); break;
      case 'zoom': this.tweens.add({ targets: img, scale: cover * 1.12, duration: dur }); break;
    }
    this.img = img;
    this.textObj?.destroy();
    this.fullText = tr(s.text);
    const txt = this.add.bitmapText(24, Math.round(H * 0.72), FONT.body, '').setMaxWidth(W - 48).setTint(0xf4ecd8).setDepth(20);
    this.textObj = txt;
    let n = 0;
    this.typing?.remove();
    this.typing = this.time.addEvent({
      delay: 28, repeat: this.fullText.length - 1,
      callback: () => {
        n++;
        txt.setText(this.fullText.slice(0, n));
        if (n % 3 === 0) services.audio?.sfx('type', { volume: 0.25, minGapMs: 30 });
      },
    });
    this.voice?.stop();
    const voiceKey = s.voice;
    // The SFX sprite may still be decoding on slow devices: start the line as soon as it is ready.
    if (voiceKey) services.audio?.onReady(() => {
      if (this.done || this.shot !== i) return;
      const v = services.audio?.voice(voiceKey, 1.25) ?? undefined;
      if (v) {
        this.voice = v;
        services.audio?.setDuck(0.4);
        v.once('complete', () => services.audio?.setDuck(1));
      }
    });
    const counter = label(this, W / 2, H - Math.round(H * 0.08) - 14, `${i + 1} / ${this.shots.length}`, FONT.small, COLORS.textDim, 0.5, 0.5).setDepth(20);
    this.time.delayedCall(700, () => counter.destroy());
  }

  private advance(): void {
    if (this.done) return;
    if (this.typing && this.typing.getRepeatCount() > 0) {
      this.typing.remove();
      this.textObj?.setText(this.fullText);
      return;
    }
    if (this.shot < this.shots.length - 1) {
      this.shot++;
      this.showShot(this.shot);
    } else this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.voice?.stop();
    services.audio?.setDuck(1);
    const s = this.save;
    if (this.next === 'Hub') {
      s.profile.introSeen = true;
      services.save!.markDirty();
    }
    this.goTo(this.next, { fromIntro: true }, 900);
  }
}
