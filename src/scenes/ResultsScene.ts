import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { COLORS, FONT, RARITY_COLORS } from '@/ui/theme';
import { Button, label, panel, toast } from '@/ui/widgets';
import { VIDEO_ICON } from './overlays/AdOverlays';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { RunManager } from '@/game/RunManager';
import { biomeForDepth } from '@/data/biomes';
import { materialDef } from '@/data/materials';
import { itemName } from '@/systems/loot';
import { addEmberParticles } from './SplashScene';
import { vowEmberMult } from '@/data/vows';
import { ENDING_NORMAL, ENDING_TRUE } from '@/data/story';
import { relicDef } from '@/data/relics';
import { ScrollPanel } from '@/ui/scroll';

/** End-of-run summary. Converts the run into permanent rewards and sends the player home. */
export class ResultsScene extends BaseScene {
  private victory = false;
  private abandoned = false;

  constructor() {
    super('Results');
  }

  init(data: { victory: boolean; abandoned?: boolean }): void {
    this.victory = data.victory;
    this.abandoned = !!data.abandoned;
    this.transitioning = false;
  }

  create(): void {
    const run = RunManager.run;
    this.fadeIn(600);
    const W = this.W;
    const H = this.H - this.useBanner();
    this.cameras.main.setBackgroundColor(this.victory ? 0x1a1426 : 0x0b0a14);
    addEmberParticles(this, W, H, 1);
    services.audio?.playMusic(this.victory ? 'm_victory' : 'm_defeat', 400);
    if (!run) {
      this.goTo('Hub');
      return;
    }
    const heat = vowEmberMult(run.vows);
    const itemsFound = run.itemsFound.map((uid) => this.save.inventory.find((i) => i.uid === uid)).filter((i) => !!i);
    const mats = Object.entries(run.materialsFound);
    const summary = {
      depth: run.depth, floor: run.floor, kills: run.kills, elites: run.eliteKills, time: run.timeSec, rooms: run.roomsCleared,
      boons: run.boons.length, relics: run.relics.length, level: run.level, seed: run.seed,
    };
    // Build recap icons (boons first, then relics), captured before the run is closed.
    const buildIcons = [
      ...run.boons.map((b) => `icons_boon_${b.id}`),
      ...run.relics.map((id) => relicDef(id)?.icon ?? ''),
    ].filter((k) => k && this.textures.exists(k));
    const res = RunManager.end(run, this.victory);
    const embers = Math.round(res.embers * heat);
    if (heat > 1) this.save.currency.embers += embers - res.embers;
    services.save!.flush();

    const title = this.victory ? t('victory') : this.abandoned ? t('abandoned') : t('defeated');
    const tt = label(this, W / 2, 50, title, FONT.title, this.victory ? COLORS.gold : COLORS.red, 0.5, 0.5).setAlpha(0);
    const titleScale = Math.min(2.2, (W - 24) / tt.width);
    tt.setScale(titleScale * 0.9);
    this.tweens.add({ targets: tt, alpha: 1, scale: titleScale, duration: 700, ease: 'Back.easeOut' });
    const subtitle = label(this, W / 2, 84, this.victory ? t('victorySub') : t('wakeAtDawn'), FONT.body, COLORS.textDim, 0.5, 0).setMaxWidth(W - 28).setCenterAlign();

    const px = 14;
    const pw = W - 28;
    const top = subtitle.y + subtitle.height + 14;
    const rewarded = embers > 0 && !!services.ads?.canReward();
    const panelBottom = H - (rewarded ? 116 : 82);
    panel(this, px, top, pw, panelBottom - top, 'ui_panel_ornate');
    const contentStart = this.children.list.length;
    let y = top + 12;
    const row = (k: string, v: string, color: number = COLORS.text) => {
      const name = label(this, px + 14, y, k, FONT.small, COLORS.textDim);
      const value = label(this, px + pw - 14, y, v, FONT.body, color, 1, 0);
      if (name.width + value.width + 12 > pw - 28) {
        value.setOrigin(0, 0).setPosition(px + 14, y + name.height + 3).setMaxWidth(pw - 28);
      }
      y = Math.max(name.y + name.height, value.y + value.height) + 8;
      return value;
    };
    const mins = Math.floor(summary.time / 60);
    row(t('depthReached'), `${tr(biomeForDepth(summary.depth, run.regions).name)} ${summary.depth}-${summary.floor}`);
    row(t('time'), `${mins}m ${Math.floor(summary.time % 60)}s`);
    row(t('kills'), `${summary.kills} (${summary.elites} ${t('elites')})`);
    row(t('roomsCleared'), `${summary.rooms}`);
    row(t('boons') + ' / ' + t('relics'), `${summary.boons} / ${summary.relics}`);
    const embersValue = row(t('embersEarned'), `+${embers}${heat > 1 ? ` (x${heat.toFixed(1)})` : ''}`, COLORS.ember);
    row(t('goldBanked'), `+${res.goldBanked}`, COLORS.gold);
    if (buildIcons.length) {
      y += 6;
      const build = label(this, px + 14, y, `${t('boons')} & ${t('relics')}`, FONT.head, COLORS.gold);
      y += build.height + 8;
      const size = 22;
      const perRow = Math.floor((pw - 28) / (size + 4));
      const shown = buildIcons.slice(0, perRow * 3);
      shown.forEach((key, i) => {
        const ix = px + 14 + (i % perRow) * (size + 4) + size / 2;
        const iy = y + Math.floor(i / perRow) * (size + 4) + size / 2;
        const img = this.add.image(ix, iy, key).setDisplaySize(size, size).setAlpha(0);
        this.tweens.add({ targets: img, alpha: 1, delay: 500 + i * 40, duration: 200 });
      });
      y += Math.ceil(shown.length / perRow) * (size + 4);
    }
    y += 6;
    const itemsTitle = label(this, px + 14, y, `${t('itemsFound')} (${itemsFound.length})`, FONT.head, COLORS.gold);
    y += itemsTitle.height + 8;
    itemsFound.sort((a, b) => b!.rarity - a!.rarity).forEach((it) => {
      const item = label(this, px + 18, y, itemName(it!), FONT.small, RARITY_COLORS[it!.rarity]).setMaxWidth(pw - 36);
      y += item.height + 4;
    });
    if (mats.length) {
      y += 6;
      const materials = label(this, px + 14, y, t('materials'), FONT.head, COLORS.gold);
      y += materials.height + 8;
      const txt = mats.slice(0, 8).map(([id, n]) => `${tr(materialDef(id)?.name ?? { en: id, id })} x${n}`).join(', ');
      const materialText = this.add.bitmapText(px + 18, y, FONT.small, txt).setMaxWidth(pw - 36).setTint(COLORS.blue);
      y += materialText.height + 8;
    }
    const content = this.children.list.slice(contentStart);
    const scroll = new ScrollPanel(this, px + 8, top + 8, pw - 16, panelBottom - top - 16);
    scroll.adopt(content).setContentHeight(y - top);
    // Optional rewarded video: double the embers from this run.
    if (rewarded) {
      const dbl = new Button(this, W / 2, H - 70 - 24, `${t('adDoubleEmbers')}  +${embers}`, async () => {
        dbl.setEnabled(false);
        const ok = await services.ads!.showRewarded('double_embers');
        if (!ok) {
          dbl.setEnabled(true);
          toast(this, t('adNotReady'), COLORS.textDim);
          return;
        }
        this.save.currency.embers += embers;
        services.save!.flush();
        embersValue.setText(`+${embers * 2}`);
        dbl.setCaption(t('adDoubled', { n: embers }));
        services.audio?.sfx('coin');
      }, { w: Math.min(250, pw - 30), h: 30, icon: VIDEO_ICON, color: COLORS.ember });
    }
    label(this, W / 2, H - 58, `${t('seed')}: ${summary.seed.toString(36).toUpperCase()}`, FONT.small, COLORS.textDim, 0.5, 0.5);
    let leaving = false;
    new Button(this, W / 2, H - 32, t('returnVillage'), () => {
      if (leaving) return;
      leaving = true;
      const s = this.save;
      if (this.victory && s.flags.true_path && !s.flags.true_ending_seen) {
        s.flags.true_ending_seen = 1;
        this.goTo('Intro', { shots: ENDING_TRUE, next: 'Hub' }, 600);
      } else if (this.victory && !s.flags.normal_ending_seen) {
        s.flags.normal_ending_seen = 1;
        this.goTo('Intro', { shots: ENDING_NORMAL, next: 'Hub' }, 600);
      } else {
        // A natural break between runs: the (paced) interstitial slot. Never before an ending cinematic.
        const go = () => this.goTo('Hub', { fromRun: true, victory: this.victory }, 600);
        void (services.ads?.naturalBreak() ?? Promise.resolve()).then(go, go);
      }
    }, { w: Math.min(240, W - 60), h: 32, style: 'primary' });
    this.handleBack(() => true);
    void Phaser;
  }
}
