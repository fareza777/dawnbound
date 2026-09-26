import Phaser from 'phaser';
import { VIDEO_ICON } from './AdOverlays';
import { OverlayScene, type OverlayData } from './OverlayScene';
import { COLORS, FONT } from '@/ui/theme';
import { Button, fitBox, label, panel, toast } from '@/ui/widgets';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { SPIRITS, boonValue, type BoonDef, type SpiritId } from '@/data/boons';
import { duoUnlockedBy } from '@/game/synergy';
import { RunManager } from '@/game/RunManager';
import { Rng } from '@/core/rng';

export function boonDescription(def: BoonDef, rank: number): string {
  const { v, v2 } = boonValue(def, rank);
  return tr(def.desc, { v, v2 });
}

interface PickData extends OverlayData {
  source: 'level' | 'shrine' | 'orb';
  spirit?: SpiritId;
}

const CARD_GAP = 8;

export class BoonPickScene extends OverlayScene {
  private source: PickData['source'] = 'level';
  private spirit?: SpiritId;
  private cards: Phaser.GameObjects.Container[] = [];
  private picked = false;

  constructor() {
    super('BoonPick');
  }

  init(data: PickData): void {
    super.init(data);
    this.source = data.source;
    this.spirit = data.spirit;
    this.cards = [];
    this.picked = false;
  }

  create(): void {
    const run = RunManager.run!;
    const title = this.source === 'level' ? t('levelUp') : this.spirit ? tr(SPIRITS[this.spirit].title) : t('chooseBoon');
    const inner = this.frame(title, 0.82, false);
    services.audio?.sfx('boon_appear', { volume: 0.8 });
    if (this.spirit) {
      const sp = SPIRITS[this.spirit];
      const portrait = this.textures.exists(sp.portrait) ? this.add.image(this.W / 2, inner.y + 26, sp.portrait).setDisplaySize(44, 44) : this.add.image(this.W / 2, inner.y + 26, 'proj_orb').setTint(sp.color).setScale(4).setBlendMode('ADD');
      void portrait;
      this.add.bitmapText(this.W / 2, inner.y + 54, FONT.body, `"${tr(sp.greeting)}"`).setOrigin(0.5, 0).setMaxWidth(inner.w - 10).setCenterAlign().setTint(0xffd9a0);
      inner.y += 78;
      inner.h -= 78;
    } else {
      label(this, this.W / 2, inner.y, t('chooseBoon'), FONT.body, COLORS.textDim, 0.5, 0);
      inner.y += 20;
      inner.h -= 20;
    }
    this.buildCards(inner);
    const by = inner.y + 3 * this.cardH(inner) + 2 * CARD_GAP + 22;
    const reroll = () => {
      this.cards.forEach((c) => c.destroy());
      this.cards = [];
      this.buildCards(inner, new Rng(Date.now()));
    };
    // Once the free rerolls are spent, one extra reroll per run can come from an optional video.
    const adAvailable = () => !run.adReroll && !run.daily && !!services.ads?.canReward();
    const adBtn = new Button(this, this.W / 2, by, t('adReroll'), async () => {
      if (this.picked || !adAvailable()) return;
      adBtn.setEnabled(false);
      const ok = await services.ads!.showRewarded('reroll');
      if (!ok) {
        adBtn.setEnabled(true);
        toast(this, t('adNotReady'), COLORS.textDim);
        return;
      }
      run.adReroll = true;
      services.save!.markDirty();
      adBtn.setVisible(false);
      reroll();
    }, { w: 170, h: 26, icon: VIDEO_ICON });
    const rerollBtn = new Button(this, this.W / 2, by, t('reroll', { n: run.rerolls }), () => {
      if (run.rerolls <= 0 || this.picked) return;
      run.rerolls -= 1;
      services.save!.markDirty();
      rerollBtn.setCaption(t('reroll', { n: run.rerolls }));
      if (run.rerolls <= 0) {
        rerollBtn.setEnabled(false);
        if (adAvailable()) {
          rerollBtn.setVisible(false);
          adBtn.setVisible(true);
        }
      }
      reroll();
    }, { w: 150, h: 26, disabled: run.rerolls <= 0 });
    const showAd = run.rerolls <= 0 && adAvailable();
    rerollBtn.setVisible(!showAd);
    adBtn.setVisible(showAd);
    inner.y += this.fitTo(by + 13);
  }

  private cardH(inner: { h: number }, count = 3): number {
    return Math.min(96, Math.floor((inner.h - 40 - CARD_GAP * (count - 1)) / count));
  }

  private buildCards(inner: { x: number; y: number; w: number; h: number }, rng?: Rng): void {
    const run = RunManager.run!;
    const count = 3;
    let offers = RunManager.boonOffers(run, count, this.source === 'shrine' ? this.spirit : undefined, rng);
    if (offers.length === 0) {
      // Everything maxed: give gold instead.
      run.gold += 50;
      label(this, this.W / 2, inner.y + 40, '+50 ' + t('gold'), FONT.head, COLORS.gold, 0.5, 0);
      this.time.delayedCall(900, () => this.finish());
      return;
    }
    if (this.source === 'orb' && this.spirit) {
      const spiritOffers = RunManager.boonOffers(run, count, this.spirit, rng);
      if (spiritOffers.length >= 2) offers = spiritOffers;
    }
    const ch = this.cardH(inner, offers.length);
    offers.forEach((o, i) => {
      const y = inner.y + i * (ch + CARD_GAP);
      const c = this.makeCard(o.def, o.rank, o.upgrade, inner.x, y, inner.w, ch);
      c.setAlpha(0);
      c.x += 30;
      this.tweens.add({ targets: c, alpha: 1, x: c.x - 30, delay: i * 90, duration: 260, ease: 'Back.easeOut' });
      this.cards.push(c);
    });
  }

  private makeCard(def: BoonDef, rank: number, upgrade: boolean, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    const sp = SPIRITS[def.spirit];
    const c = this.add.container(x, y);
    const legendary = def.legendary || def.duo;
    const bg = panel(this, 0, 0, w, h, legendary ? 'ui_panel_ornate' : 'ui_panel');
    const stripe = this.add.rectangle(3, 3, 4, h - 6, sp.color).setOrigin(0, 0);
    c.add([bg, stripe]);
    const iconX = 30;
    const glow = this.add.image(iconX, h / 2, 'fx_light').setTint(sp.color).setBlendMode('ADD').setScale(0.4).setAlpha(0.6);
    const iconKey = `icons_boon_${def.id}`;
    const orb = this.textures.exists(iconKey)
      ? this.add.image(iconX, h / 2, iconKey).setDisplaySize(40, 40)
      : this.add.image(iconX, h / 2, 'proj_orb').setTint(sp.color).setScale(2.4).setBlendMode('ADD');
    c.add([glow, orb]);
    if (def.duo) {
      const orb2 = this.add.image(iconX + 8, h / 2 + 8, 'proj_orb').setTint(SPIRITS[def.duo].color).setScale(1.6).setBlendMode('ADD');
      c.add(orb2);
    }
    this.tweens.add({ targets: glow, alpha: 0.25, yoyo: true, repeat: -1, duration: 900 });
    const tx = 58;
    const name = this.add.bitmapText(tx, 8, FONT.head, tr(def.name)).setTint(sp.color);
    // Taking the first boon of a spirit can open a Duo with a spirit already in the build: say so on the card.
    const duoPartner = !upgrade && !def.duo ? duoUnlockedBy(RunManager.run!, def) : undefined;
    const tag = upgrade ? t('talentRank', { a: rank, b: def.maxRank }) : def.duo ? 'DUO' : def.legendary ? 'LEGENDARY'
      : duoPartner ? t('duoUnlock', { s: tr(SPIRITS[duoPartner].name) }) : t('new');
    const tagT = this.add.bitmapText(w - 8, 10, FONT.small, tag).setOrigin(1, 0)
      .setTint(upgrade ? COLORS.cyan : legendary ? COLORS.orange : duoPartner ? COLORS.gold : COLORS.green);
    const spiritT = this.add.bitmapText(tx, 25, FONT.small, def.duo ? `${tr(sp.name)} + ${tr(SPIRITS[def.duo].name)}` : tr(sp.name)).setTint(COLORS.textDim);
    const desc = fitBox(this.add.bitmapText(tx, 37, FONT.body, boonDescription(def, rank)).setMaxWidth(w - tx - 8).setTint(COLORS.text), w - tx - 8, h - 41);
    c.add([name, tagT, spiritT, desc]);
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerdown', () => bg.setTint(0xd0c8ff));
    c.on('pointerout', () => bg.clearTint());
    c.on('pointerup', () => this.pick(def, c));
    return c;
  }

  private pick(def: BoonDef, card: Phaser.GameObjects.Container): void {
    if (this.picked) return;
    this.picked = true;
    const run = RunManager.run!;
    RunManager.addBoon(run, def.id);
    services.audio?.sfx('boon_take', { volume: 0.9 });
    services.platform?.haptic('success');
    this.cameras.main.flash(180, 255, 230, 180);
    this.tweens.add({ targets: card, scale: 1.04, duration: 120, yoyo: true });
    for (const c of this.cards) if (c !== card) this.tweens.add({ targets: c, alpha: 0.2, duration: 150 });
    this.time.delayedCall(380, () => this.finish());
  }

  private finish(): void {
    const room = this.room;
    this.close(() => {
      room?.refreshPlayerStats();
      room?.onBoonPickClosed();
    });
  }
}

