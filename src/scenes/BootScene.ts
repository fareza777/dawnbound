import { bus } from '@/core/events';
import { CloudSave } from '@/core/cloudSave';
import Phaser from 'phaser';
import { createUiTextures, FONT, fontSuffix } from '@/ui/theme';
import { view } from '@/core/viewport';
import { createFxTextures } from '@/gfx/fxTextures';
import { createHiResSkin } from '@/ui/skin';
import { services } from '@/core/services';
import { SaveManager, migrate } from '@/core/save';
import { AudioManager } from '@/core/audio';
import { Platform } from '@/core/platform';
import { setLang } from '@/core/i18n';
import { Ads } from '@/core/ads';
import { Store } from '@/core/store';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const sfx = fontSuffix(view.res);
    for (const key of Object.values(FONT)) {
      this.load.bitmapFont(key, `assets/fonts/${key}${sfx}.png`, `assets/fonts/${key}${sfx}.fnt`);
    }
  }

  async create(): Promise<void> {
    createUiTextures(this);
    createHiResSkin(this);
    createFxTextures(this);
    const save = new SaveManager();
    services.save = save;
    const platform = new Platform();
    services.platform = platform;
    services.audio = new AudioManager(this.game);
    await platform.init();
    await save.restoreFromNative();
    const s = save.data.settings;
    setLang(s.lang);
    platform.hapticsEnabled = s.vibration;
    services.audio.setMusicVolume(s.musicVol);
    services.audio.setSfxVolume(s.sfxVol);
    platform.onPause(() => {
      save.flush();
      void services.cloud?.upload(true);
      services.audio?.setPaused(true);
    });
    platform.onResume(() => services.audio?.setPaused(false));
    // Ads + Remove Ads purchase start in the background so a slow network never delays loading.
    const ads = new Ads(() => save.data, () => services.audio);
    services.ads = ads;
    services.store = new Store((owned) => {
      if (save.data.shop.noAds === owned) return;
      save.data.shop.noAds = owned;
      save.markDirty();
      if (owned) ads.onAdsRemoved();
    });
    void ads.init().then(() => services.store?.init());
    // Google Play Games (cloud save, achievements, leaderboards) also starts in the background.
    services.cloud = new CloudSave(save, migrate);
    void services.cloud.init();
    bus.on('runEnded', () => {
      const cloud = services.cloud;
      cloud?.submit('bestDepth', save.data.stats.bestDepth ?? 0);
      cloud?.submit('daily', save.data.daily.best);
      cloud?.submit('endless', save.data.stats.bestEndless ?? 0);
      void cloud?.upload();
    });
    this.scene.start('Preload');
  }
}
