import Phaser from 'phaser';
import { services } from '@/core/services';
import type { SaveData } from '@/data/types';
import { view } from '@/core/viewport';

/** Shared helpers for every scene: sizing, fade transitions and Android back-button handling. */
export abstract class BaseScene extends Phaser.Scene {
  private unregisterBack?: () => void;
  protected transitioning = false;

  get W(): number {
    return view.w;
  }

  get H(): number {
    return view.h;
  }

  get save(): SaveData {
    return services.save!.data;
  }

  /** Call from create(). Return true from the handler to consume the back press. */
  protected handleBack(fn: () => boolean): void {
    this.unregisterBack?.();
    this.unregisterBack = services.platform?.onBack(() => (this.scene.isActive() ? fn() : false));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unregisterBack?.();
      this.unregisterBack = undefined;
    });
  }

  /**
   * Show the bottom banner ad on this screen (hidden again automatically when the scene closes).
   * Returns how many virtual pixels to keep free at the bottom. QA builds draw a placeholder instead.
   */
  protected useBanner(): number {
    const ads = services.ads;
    if (!ads || this.save.shop.noAds) return 0;
    if (!ads.native && (import.meta.env.DEV || import.meta.env.VITE_QA === '1')) {
      const h = 54;
      this.add.rectangle(0, this.H - h, this.W, h, 0x2a2a34, 1).setOrigin(0, 0).setDepth(100000);
      this.add.bitmapText(this.W / 2, this.H - h / 2, 'small', 'BANNER AD (test)').setOrigin(0.5).setTint(0x8888aa).setDepth(100001);
      return h;
    }
    void ads.showBanner();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => void ads.hideBanner());
    return ads.bannerReserve();
  }

  protected fadeIn(ms = 300): void {
    this.cameras.main.fadeIn(ms, 11, 10, 20);
  }

  /** Fade out then start another scene (stopping this one). */
  goTo(key: string, data?: object, ms = 280): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(ms, 11, 10, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
  }
}
