import { BaseScene } from './BaseScene';
import { addEmberParticles } from './SplashScene';
import { COLORS, FONT } from '@/ui/theme';
import { Button, label, shrinkToFit, toast } from '@/ui/widgets';
import { confirm, showModal } from '@/ui/modal';
import { t } from '@/core/i18n';
import { services } from '@/core/services';
import { nine } from '@/ui/skin';

export const GAME_VERSION = '1.0.0';

export class MenuScene extends BaseScene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.transitioning = false;
    this.fadeIn(500);
    services.audio?.playMusic('m_title');
    this.buildBackground();
    this.buildTitle();
    this.buildButtons();
    this.watchCloudOffer();
    const bottom = this.H - this.useBanner();
    label(this, this.W - 6, bottom - 6, t('version', { v: GAME_VERSION }), FONT.small, COLORS.textDim, 1, 1).setAlpha(0.7);
    this.handleBack(() => {
      confirm(this, t('menuQuit'), '?', () => services.platform?.exitApp());
      return true;
    });
  }

  private buildBackground(): void {
    const { W, H } = this;
    if (this.textures.exists('art_title')) {
      const img = this.add.image(W / 2, H / 2, 'art_title');
      const s = Math.max(W / img.width, H / img.height);
      img.setScale(s);
      this.tweens.add({ targets: img, scale: s * 1.06, duration: 20000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      const bg = this.add.image(W / 2, H * 0.42, 'bg_ForestC');
      bg.setScale(Math.max(W / bg.width, (H * 0.9) / bg.height)).setTint(0x4a3d6e);
    }
    const shade = this.add.graphics();
    shade.fillGradientStyle(COLORS.bg0, COLORS.bg0, COLORS.bg0, COLORS.bg0, 0.1, 0.1, 0.95, 0.95);
    shade.fillRect(0, H * 0.35, W, H * 0.65);
    this.add.image(W / 2, H / 2, 'fx_vignette').setDisplaySize(W * 1.3, H * 1.2).setAlpha(0.9);
    addEmberParticles(this, W, H, 3);
  }

  private buildTitle(): void {
    const { W, H } = this;
    const y = Math.round(H * 0.2);
    const glow = this.add.image(W / 2, y + 4, 'fx_light').setTint(COLORS.ember).setBlendMode('ADD').setAlpha(0.45);
    glow.setDisplaySize(W * 1.2, 120);
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (this.textures.exists('ui_logo')) {
      const logo = this.add.image(W / 2, y, 'ui_logo');
      logo.setScale(Math.min(1, (W - 30) / logo.width));
    } else {
      const title = this.add.bitmapText(W / 2, y, FONT.title, 'DAWNBOUND').setOrigin(0.5).setScale(3).setTint(COLORS.gold);
      this.tweens.add({ targets: title, y: y - 3, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    label(this, W / 2, y + 38, t('subtitle').toUpperCase(), FONT.head, 0xffd9a0, 0.5, 0.5);
  }

  private buildButtons(): void {
    const { W, H } = this;
    const save = this.save;
    const hasProgress = save.profile.introSeen || save.stats.runs > 0 || save.run !== null;
    const bw = Math.min(200, W - 80);
    let y = Math.round(H * 0.56);
    const step = 36;
    const buttons: Button[] = [];
    if (hasProgress) {
      buttons.push(new Button(this, W / 2, y, t('menuContinue'), () => this.continueGame(), { w: bw, h: 30, style: 'primary' }));
      y += step;
    }
    buttons.push(new Button(this, W / 2, y, t('menuNewGame'), () => this.newGame(hasProgress), { w: bw, h: 30, style: hasProgress ? 'normal' : 'primary' }));
    y += step;
    buttons.push(new Button(this, W / 2, y, t('menuSettings'), () => this.scene.launch('Settings', { from: 'Menu' }), { w: bw, h: 30 }));
    y += step;
    buttons.push(new Button(this, W / 2, y, t('menuCodex'), () => this.scene.launch('Codex', { from: 'Menu' }), { w: bw, h: 30 }));
    y += step + 8;
    const small = Math.floor((bw - 12) / 3);
    const x0 = W / 2 - bw / 2 + small / 2;
    buttons.push(new Button(this, x0, y, t('menuAbout'), () => this.showAbout(), { w: small, h: 26, font: FONT.small }));
    buttons.push(new Button(this, x0 + small + 6, y, t('menuShare'), () => this.share(), { w: small, h: 26, font: FONT.small }));
    buttons.push(new Button(this, x0 + (small + 6) * 2, y, t('menuRate'), () => this.rate(), { w: small, h: 26, font: FONT.small }));
    this.buildRemoveAds();
    buttons.forEach((b, i) => {
      b.setAlpha(0);
      b.y += 10;
      this.tweens.add({ targets: b, alpha: 1, y: b.y - 10, delay: 250 + i * 70, duration: 300, ease: 'Back.easeOut' });
    });
  }

  /** A newer save on Google Play Games (another device): let the player pick which progress to keep. */
  private watchCloudOffer(): void {
    const cloud = services.cloud;
    if (!cloud) return;
    const off = cloud.onOffer((o) => {
      const fmt = (sec: number) => `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
      showModal(this, t('cloudFoundTitle'), t('cloudFoundBody', { cloud: fmt(o.cloudPlaySec), local: fmt(o.localPlaySec) }), [
        { label: t('cloudUseCloud'), style: 'primary', onClick: () => cloud.acceptOffer() },
        { label: t('cloudKeepLocal'), onClick: () => cloud.declineOffer() },
      ]);
    });
    this.events.once('shutdown', off);
  }

  /** Crown button (top-right) that opens the Remove Ads offer; hidden once purchased. */
  private buildRemoveAds(): void {
    if (this.save.shop.noAds || !services.store?.available) return;
    const b = this.add.container(this.W - 38, 24);
    const bg = nine(this, 0, 0, 'ui_btn', 38, 38);
    const glow = this.add.image(0, 0, 'fx_light').setTint(COLORS.gold).setBlendMode('ADD').setScale(0.4).setAlpha(0.4);
    const ic = this.add.image(0, 0, this.textures.exists('ui_icon_crown') ? 'ui_icon_crown' : 'pk_coin').setDisplaySize(28, 28);
    // Caption under the button (its length depends on the language), on a small plate so it reads over the art.
    const txt = this.add.bitmapText(0, 27, FONT.small, t('adsBadge')).setOrigin(0.5).setTint(COLORS.gold);
    shrinkToFit(txt, 68);
    const plate = nine(this, 0, 27, 'ui_panel_dark', txt.displayWidth + 10, txt.displayHeight + 4).setAlpha(0.85);
    b.add([glow, bg, ic, plate, txt]);
    // Centred hit box (±32) covers both the button and its caption.
    b.setSize(48, 68).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: glow, alpha: 0.15, yoyo: true, repeat: -1, duration: 900 });
    b.on('pointerup', () => {
      services.audio?.sfx('ui_click');
      this.scene.launch('RemoveAds', { from: 'Menu' });
    });
  }

  private continueGame(): void {
    const save = this.save;
    if (!save.profile.introSeen) this.goTo('Intro');
    else if (save.run) this.goTo('RunMap');
    else this.goTo('Hub');
  }

  private newGame(hasProgress: boolean): void {
    const start = () => {
      services.save!.reset();
      this.goTo('Intro');
    };
    if (hasProgress) confirm(this, t('menuNewGame'), t('newGameConfirm'), start, true);
    else start();
  }

  private showAbout(): void {
    showModal(
      this,
      t('menuAbout'),
      `Dawnbound — The Last Lantern  v${GAME_VERSION}\n\n` +
        'Pixel art: Super Retro Collection by Gif.\n' +
        'Fonts: Pixelify Sans, Jersey, Tiny5 (SIL OFL).\n' +
        'Engine: Phaser 3. Built with love for every Lanternkeeper.',
      [{ label: t('close') }],
    );
  }

  private async share(): Promise<void> {
    const ok = await services.platform?.share('Dawnbound', t('shareText'));
    if (ok && !services.platform?.native) toast(this, t('ok'));
  }

  private rate(): void {
    showModal(this, t('rateTitle'), t('rateBody'), [
      { label: t('later') },
      { label: t('rateNow'), style: 'primary', onClick: () => services.platform?.rate() },
    ]);
  }
}

