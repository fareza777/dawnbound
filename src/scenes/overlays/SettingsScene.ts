import Phaser from 'phaser';
import { OverlayScene } from './OverlayScene';
import { COLORS, FONT } from '@/ui/theme';
import { Button, label, toast } from '@/ui/widgets';
import { confirm, showModal } from '@/ui/modal';
import { setLang, t } from '@/core/i18n';
import { services } from '@/core/services';
import { ScrollPanel } from '@/ui/scroll';
import { view, vx } from '@/core/viewport';

/** Settings: audio, feel, controls, language, graphics, data. Changes apply and save immediately. */
export class SettingsScene extends OverlayScene {
  constructor() {
    super('Settings');
  }

  create(): void {
    const inner = this.frame(t('menuSettings'), 0.86);
    const s = this.save.settings;
    const scroll = new ScrollPanel(this, inner.x, inner.y, inner.w, inner.h);
    let y = 4;
    const rowH = 34;
    const persist = () => services.save!.markDirty();

    const slider = (name: string, value: number, onChange: (v: number) => void) => {
      scroll.add(this.add.bitmapText(0, y + 8, FONT.body, name).setTint(COLORS.text));
      const sx = inner.w * 0.45;
      const sw = inner.w * 0.5;
      const track = this.add.rectangle(sx, y + 16, sw, 4, COLORS.border).setOrigin(0, 0.5);
      const fill = this.add.rectangle(sx, y + 16, sw * value, 4, COLORS.gold).setOrigin(0, 0.5);
      const knob = this.add.circle(sx + sw * value, y + 16, 7, COLORS.text).setStrokeStyle(2, COLORS.goldDark);
      const zone = this.add.zone(sx - 8, y, sw + 16, rowH).setOrigin(0, 0).setInteractive({ draggable: true });
      const setFrom = (px: number) => {
        const local = px - scroll.x - sx;
        const v = Phaser.Math.Clamp(local / sw, 0, 1);
        const snapped = Math.round(v * 20) / 20;
        fill.width = sw * snapped;
        knob.x = sx + sw * snapped;
        onChange(snapped);
      };
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => setFrom(vx(p)));
      zone.on('drag', (p: Phaser.Input.Pointer) => setFrom(vx(p)));
      zone.on('pointerup', () => services.audio?.sfx('ui_click'));
      scroll.add([track, fill, knob, zone]);
      y += rowH;
    };

    const toggle = (name: string, options: string[], current: number, onChange: (i: number) => void) => {
      scroll.add(this.add.bitmapText(0, y + 8, FONT.body, name).setTint(COLORS.text));
      let idx = current;
      const bw = inner.w * 0.5;
      const btn = new Button(this, inner.w * 0.45 + bw / 2, y + 16, options[idx], () => {
        idx = (idx + 1) % options.length;
        btn.setCaption(options[idx]);
        onChange(idx);
        persist();
      }, { w: bw, h: 26, font: FONT.body });
      scroll.add(btn);
      y += rowH;
    };

    const header = (text: string) => {
      scroll.add(this.add.bitmapText(0, y + 4, FONT.head, text).setTint(COLORS.gold));
      y += 24;
    };

    header(t('audio'));
    slider(t('setMusic'), s.musicVol, (v) => {
      s.musicVol = v;
      services.audio?.setMusicVolume(v);
      persist();
    });
    slider(t('setSfx'), s.sfxVol, (v) => {
      s.sfxVol = v;
      services.audio?.setSfxVolume(v);
      persist();
    });
    header(t('gameplay'));
    toggle(t('setVibration'), [t('off'), t('on')], s.vibration ? 1 : 0, (i) => {
      s.vibration = i === 1;
      if (services.platform) services.platform.hapticsEnabled = s.vibration;
      services.platform?.haptic('medium');
    });
    toggle(t('setShake'), [t('off'), t('low'), t('full')], s.screenShake >= 1 ? 2 : s.screenShake > 0 ? 1 : 0, (i) => (s.screenShake = [0, 0.5, 1][i]));
    toggle(t('setDamageNumbers'), [t('off'), t('on')], s.damageNumbers ? 1 : 0, (i) => (s.damageNumbers = i === 1));
    toggle(t('setAutoAttack'), [t('off'), t('on')], s.autoAttack ? 1 : 0, (i) => (s.autoAttack = i === 1));
    toggle(t('setJoystick'), [t('joyFloating'), t('joyFixed')], s.joystick === 'floating' ? 0 : 1, (i) => (s.joystick = i === 0 ? 'floating' : 'fixed'));
    header(t('display'));
    toggle(t('setLanguage'), ['English', 'Bahasa Indonesia'], s.lang === 'en' ? 0 : 1, (i) => {
      s.lang = i === 0 ? 'en' : 'id';
      setLang(s.lang);
      toast(this, t('langApplied'), COLORS.gold);
    });
    toggle(t('setQuality'), [t('qualityHigh'), t('qualityLow')], view.res > 1 ? 0 : 1, (i) => {
      s.quality = i === 0 ? 'high' : 'low';
      s.qualityUser = true;
      toast(this, t('qualityRestart'), COLORS.gold);
    });
    toggle(t('setFps'), [t('off'), t('on')], s.showFps ? 1 : 0, (i) => (s.showFps = i === 1));
    header(t('accessibility'));
    const sizes = [1, 1.15, 1.3];
    const sizeIdx = Math.max(0, sizes.indexOf(s.textScale ?? 1));
    toggle(t('setTextSize'), [t('textNormal'), t('textLarge'), t('textLarger')], sizeIdx, (i) => {
      s.textScale = sizes[i];
      toast(this, t('qualityRestart'), COLORS.gold);
    });
    toggle(t('setReduceMotion'), [t('off'), t('on')], s.reduceMotion ? 1 : 0, (i) => (s.reduceMotion = i === 1));
    toggle(t('setColorblind'), [t('off'), t('on')], s.colorblind ? 1 : 0, (i) => (s.colorblind = i === 1));
    header(t('other'));
    const bw = inner.w - 8;
    const addBtn = (text: string, fn: () => void, style: 'normal' | 'danger' = 'normal') => {
      scroll.add(new Button(this, bw / 2 + 4, y + 16, text, fn, { w: bw, h: 28, style }));
      y += 36;
    };
    if (this.from === 'Menu') {
      addBtn(t('replayIntro'), () => {
        this.scene.stop();
        this.scene.stop('Menu');
        this.scene.start('Intro', { next: 'Menu' });
      });
    }
    const cloud = services.cloud;
    if (cloud?.available) {
      if (!cloud.signedIn) {
        addBtn(t('pgSignIn'), async () => {
          const ok = await cloud.signIn();
          toast(this, ok ? t('pgSignedIn') : t('pgSignInFailed'), ok ? COLORS.green : COLORS.textDim);
          if (ok) this.scene.restart({ from: this.from });
        });
      } else {
        addBtn(t('pgSyncNow'), async () => {
          const ok = await cloud.upload(true);
          toast(this, ok ? t('pgSynced') : t('pgSyncFailed'), ok ? COLORS.green : COLORS.red);
        });
        addBtn(t('pgAchievements'), () => cloud.showAchievements());
        addBtn(t('pgLeaderboards'), () => cloud.showLeaderboards());
      }
    }
    addBtn(t('setCredits'), () => showModal(this, t('setCredits'), t('creditsBody'), [{ label: t('close') }]));
    addBtn(t('privacy'), () => showModal(this, t('privacy'), t('privacyBody'), [{ label: t('close') }]));
    if (services.ads?.privacyOptionsRequired) addBtn(t('adPrivacy'), () => void services.ads?.showPrivacyOptions());
    if (!this.save.shop.noAds && services.store?.available) {
      addBtn(`${t('removeAds')}  ·  ${services.store.price}`, () => this.scene.launch('RemoveAds', { from: this.scene.key }));
    }
    if (services.store?.available) {
      addBtn(t('restorePurchases'), async () => {
        const owned = await services.store!.restore();
        toast(this, owned ? t('adsRemoved') : t('restoreNone'), owned ? COLORS.gold : COLORS.textDim);
      });
    }
    if (this.from === 'Menu') {
      addBtn(t('setReset'), () => confirm(this, t('setReset'), t('resetConfirm'), () => {
        services.save!.reset();
        toast(this, t('saveErased'), COLORS.red);
        this.close(() => this.scene.get('Menu').scene.restart());
      }, true), 'danger');
    }
    scroll.setContentHeight(y + 8);
    label(this, this.W / 2, this.panelY + this.panelH + 6, '', FONT.small, COLORS.textDim, 0.5, 0);
  }
}
