import Phaser from 'phaser';
import { OverlayScene, type OverlayData } from './OverlayScene';
import { COLORS, FONT } from '@/ui/theme';
import { Button, label, para, toast, type ButtonOpts } from '@/ui/widgets';
import { t } from '@/core/i18n';
import { services } from '@/core/services';

/** Button decoration marking a rewarded video (the player always knows a video will play). */
export const VIDEO_ICON: NonNullable<ButtonOpts['icon']> = { atlas: 'ui_play', scale: 14 / 48, tint: 0xffe2a0 };

/** Offered once per run when the hero falls: watch a video to rise again with half health. */
export class ReviveScene extends OverlayScene {
  private countdown?: Phaser.Time.TimerEvent;
  private barTween?: Phaser.Tweens.Tween;
  private busy = false;

  constructor() {
    super('Revive');
  }

  create(): void {
    this.busy = false;
    const inner = this.frame(t('adReviveTitle'), 0.6, false);
    this.add.image(this.W / 2, inner.y + 30, 'fx_light').setTint(0xfff0c0).setBlendMode('ADD').setScale(0.9).setAlpha(0.5);
    const heroPortrait = this.room?.player.hero.portrait;
    if (heroPortrait && this.textures.exists(heroPortrait)) this.add.image(this.W / 2, inner.y + 30, heroPortrait).setDisplaySize(52, 52).setTint(0x8a80a8);
    const body = para(this, inner.x + 6, inner.y + 66, t('adReviveBody'), inner.w - 12, FONT.body, COLORS.text).setCenterAlign()
      .setX(this.W / 2).setOrigin(0.5, 0);
    // A visible countdown keeps the decision quick; running out means giving up.
    const barW = inner.w - 30;
    const barY = body.y + body.height + 16;
    this.add.rectangle(this.W / 2, barY, barW, 3, COLORS.border).setOrigin(0.5);
    const bar = this.add.rectangle(this.W / 2 - barW / 2, barY, barW, 3, COLORS.gold).setOrigin(0, 0.5);
    const by = barY + 30;
    new Button(this, this.W / 2, by, t('adReviveBtn'), () => void this.revive(), { w: inner.w - 30, h: 36, style: 'primary', icon: VIDEO_ICON });
    new Button(this, this.W / 2, by + 44, t('adGiveUp'), () => this.giveUp(), { w: 160, h: 28 });
    this.fitTo(by + 58);
    this.barTween = this.tweens.add({ targets: bar, scaleX: 0, duration: 9000, ease: 'Linear' });
    this.countdown = this.time.delayedCall(9000, () => this.giveUp());
    // Android back = give up (registered after frame(), so it runs first).
    const unregister = services.platform?.onBack(() => {
      if (!this.scene.isActive()) return false;
      this.giveUp();
      return true;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unregister?.());
  }

  private setWaiting(waiting: boolean): void {
    if (this.countdown) this.countdown.paused = waiting;
    if (waiting) this.barTween?.pause();
    else this.barTween?.resume();
  }

  private async revive(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.setWaiting(true);
    const ok = await (services.ads?.showRewarded('revive') ?? Promise.resolve(false));
    if (!ok) {
      this.busy = false;
      this.setWaiting(false);
      toast(this, t('adNotReady'), COLORS.textDim);
      return;
    }
    const room = this.room;
    this.close(() => room?.revivePlayer());
  }

  private giveUp(): void {
    if (this.busy) return;
    this.busy = true;
    const room = this.room;
    this.close(() => room?.finishDeath());
  }
}

/** Remove Ads purchase dialog (also reachable from Settings). */
export class RemoveAdsScene extends OverlayScene {
  constructor() {
    super('RemoveAds');
  }

  init(data: OverlayData): void {
    super.init({ ...data, from: data.from ?? 'Menu' });
  }

  create(): void {
    const inner = this.frame(t('removeAds'), 0.8);
    const store = services.store;
    const owned = this.save.shop.noAds;
    this.add.image(this.W / 2, inner.y + 30, 'fx_light').setTint(COLORS.gold).setBlendMode('ADD').setScale(0.8).setAlpha(0.45);
    label(this, this.W / 2, inner.y + 30, t('adsBadge'), FONT.title, COLORS.gold, 0.5, 0.5).setScale(1.2);
    const body = para(this, inner.x + 6, inner.y + 62, t('removeAdsBody'), inner.w - 12, FONT.body, COLORS.text).setCenterAlign().setX(this.W / 2).setOrigin(0.5, 0);
    let y = body.y + body.height + 14;
    for (let i = 1; i <= 4; i++) {
      this.add.image(inner.x + 24, y + 7, 'proj_star').setTint(COLORS.gold).setScale(0.9);
      const perk = label(this, inner.x + 38, y, t(`removeAdsPerk${i}`), FONT.body, COLORS.textDim).setMaxWidth(inner.w - 44);
      y += Math.max(22, perk.height + 6);
    }
    const by = y + 26;
    if (owned) {
      new Button(this, this.W / 2, by, t('adsRemovedLabel'), () => undefined, { w: inner.w - 30, h: 36, disabled: true });
    } else {
      new Button(this, this.W / 2, by, t('removeAdsBuy', { price: store?.price ?? '' }), () => void this.buy(), {
        w: inner.w - 30, h: 36, style: 'primary', disabled: !store?.available,
      });
    }
    new Button(this, this.W / 2, by + 42, t('restorePurchases'), () => void this.restore(), { w: 200, h: 26, font: FONT.small });
    this.fitTo(by + 55);
  }

  private async buy(): Promise<void> {
    const result = await (services.store?.buyRemoveAds() ?? Promise.resolve('unavailable' as const));
    if (result === 'ok') {
      services.audio?.sfx('ui_confirm');
      services.notify?.(t('adsRemoved'), COLORS.gold, 'achievement');
      this.close();
    } else if (result === 'unavailable') toast(this, t('purchaseUnavailable'), COLORS.red);
    else if (result === 'error') toast(this, t('purchaseFailed'), COLORS.red);
  }

  private async restore(): Promise<void> {
    const owned = await (services.store?.restore() ?? Promise.resolve(false));
    if (owned) {
      services.notify?.(t('adsRemoved'), COLORS.gold);
      this.close();
    } else toast(this, t('restoreNone'), COLORS.textDim);
  }
}
