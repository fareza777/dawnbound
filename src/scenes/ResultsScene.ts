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
    const tt = label(this, W / 2, 50, title, FONT.title, this.victory ? COLORS.gold : COLORS.red, 0.5, 0.5).setScale(2).setAlpha(0);
    this.tweens.add({ targets: tt, alpha: 1, scale: 2.2, duration: 700, ease: 'Back.easeOut' });
    label(this, W / 2, 84, this.victory ? t('victorySub') : t('wakeAtDawn'), FONT.body, COLORS.textDim, 0.5, 0.5);

    const px = 14;
    const pw = W - 28;
    const top = 104;
    panel(this, px, top, pw, H - top - 70, 'ui_panel_ornate');
    let y = top + 12;
    const row = (k: string, v: string, color: number = COLORS.text) => {
      label(this, px + 14, y, k, FONT.body, COLORS.textDim);
      const value = label(this, px + pw - 14, y, v, FONT.body, color, 1, 0);
      y += 18;
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
      label(this, px + 14, y, `${t('boons')} & ${t('relics')}`, FONT.head, COLORS.gold);
      y += 18;
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
    label(this, px + 14, y, `${t('itemsFound')} (${itemsFound.length})`, FONT.head, COLORS.gold);
    y += 18;
    const maxItems = Math.max(0, Math.floor((H - 140 - y) / 14) - (mats.length ? 3 : 0));
    itemsFound.sort((a, b) => b!.rarity - a!.rarity).slice(0, maxItems).forEach((it) => {
      label(this, px + 18, y, itemName(it!), FONT.small, RARITY_COLORS[it!.rarity]);
      y += 12;
    });
    if (itemsFound.length > maxItems) {
      label(this, px + 18, y, `+${itemsFound.length - maxItems}...`, FONT.small, COLORS.textDim);
      y += 12;
    }
    if (mats.length) {
      y += 6;
      label(this, px + 14, y, t('materials'), FONT.head, COLORS.gold);
      y += 18;
      const txt = mats.slice(0, 8).map(([id, n]) => `${tr(materialDef(id)?.name ?? { en: id, id })} x${n}`).join(', ');
      this.add.bitmapText(px + 18, y, FONT.small, txt).setMaxWidth(pw - 30).setTint(COLORS.blue);
    }
    // Optional rewarded video: double the embers from this run.
    if (embers > 0 && services.ads?.canReward()) {
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
