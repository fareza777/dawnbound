import Phaser from 'phaser';
import { OverlayScene } from '../overlays/OverlayScene';
import { COLORS, FONT } from '@/ui/theme';
import { fitBox, label, panel, toast } from '@/ui/widgets';
import { nine } from '@/ui/skin';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { ScrollPanel } from '@/ui/scroll';
import { QUESTS, type QuestDef } from '@/data/quests';
import { objectiveProgress } from '@/systems/quests';
import { objectiveText, rewardChips } from '@/systems/questText';
import { npcById } from '@/data/npcs';

type Tab = 'active' | 'done';

const MAIN_COLOR = COLORS.gold;
const SIDE_COLOR = COLORS.cyan;
const PORTRAIT = 40;

/** Quest journal: story progress, active/completed tabs and rich quest cards (tap a card to track it). */
export class QuestLogScene extends OverlayScene {
  private focus?: string;
  private tab: Tab = 'active';

  constructor() {
    super('QuestLog');
  }

  init(d: { from?: string; focus?: string; tab?: Tab }): void {
    super.init(d);
    this.focus = d.focus;
    this.tab = d.tab ?? 'active';
  }

  create(): void {
    const inner = this.frame(t('quests'), 0.92);
    const s = this.save;
    const status = (q: QuestDef) => s.quests[q.id]?.status ?? 'locked';
    const active = QUESTS.filter((q) => status(q) === 'active' || status(q) === 'complete');
    const done = QUESTS.filter((q) => status(q) === 'claimed');

    // Story progress: how far along the main chapters the player is.
    const mains = QUESTS.filter((q) => q.type === 'main');
    const mainsDone = mains.filter((q) => status(q) === 'claimed').length;
    let y = inner.y;
    label(this, inner.x, y, t('qStory'), FONT.head, MAIN_COLOR);
    fitBox(label(this, inner.x + inner.w, y + 3, t('qChapter', { a: Math.min(mains.length, mainsDone + 1), b: mains.length }), FONT.small, COLORS.textDim, 1, 0), inner.w - 70);
    y += 22;
    this.add.rectangle(inner.x, y, inner.w, 6, 0x0d0b1a).setOrigin(0, 0).setStrokeStyle(1, COLORS.border);
    const fill = this.add.rectangle(inner.x + 1, y + 1, Math.max(2, (inner.w - 2) * (mainsDone / mains.length)), 4, MAIN_COLOR).setOrigin(0, 0);
    fill.scaleX = 0;
    this.tweens.add({ targets: fill, scaleX: 1, duration: 500, ease: 'Cubic.easeOut' });
    y += 14;

    // Tabs.
    const tabs: [Tab, string][] = [['active', `${t('qActive')} (${active.length})`], ['done', `${t('qDone')} (${done.length})`]];
    const tw = inner.w / 2;
    tabs.forEach(([key, name], i) => {
      const bg = panel(this, inner.x + i * tw + 1, y, tw - 2, 22, key === this.tab ? 'ui_tab_on' : 'ui_tab').setInteractive();
      fitBox(label(this, inner.x + i * tw + tw / 2, y + 11, name, FONT.small, key === this.tab ? COLORS.gold : COLORS.textDim, 0.5, 0.5), tw - 10, 18);
      bg.on('pointerup', () => {
        if (key !== this.tab) this.scene.restart({ from: this.from, tab: key });
      });
    });
    y += 28;
    if (this.tab === 'active') {
      label(this, inner.x + inner.w / 2, y, t('qTapTrack'), FONT.small, COLORS.textDim, 0.5, 0).setAlpha(0.7);
      y += 16;
    }

    const scroll = new ScrollPanel(this, inner.x, y, inner.w, inner.y + inner.h - y);
    const list = this.tab === 'active'
      ? active.sort((a, b) => Number(b.type === 'main') - Number(a.type === 'main') || Number(status(b) === 'complete') - Number(status(a) === 'complete'))
      : done.reverse();
    let cy = 0;
    let focusY = -1;
    if (!list.length) {
      scroll.add(this.add.bitmapText(inner.w / 2, 20, FONT.body, this.tab === 'active' ? t('qEmptyActive') : t('qEmptyDone')).setOrigin(0.5, 0)
        .setMaxWidth(inner.w - 20).setCenterAlign().setTint(COLORS.textDim));
    }
    for (const q of list) {
      if (q.id === this.focus || (focusY < 0 && q.id === s.trackedQuest && this.tab === 'active')) focusY = cy;
      cy += this.card(scroll, q, cy, inner.w) + 8;
    }
    scroll.setContentHeight(cy + 4);
    if (focusY > 0) scroll.setScroll(focusY - 4);
  }

  /** One quest card; returns its height. */
  private card(scroll: ScrollPanel, q: QuestDef, top: number, w: number): number {
    const s = this.save;
    const st = s.quests[q.id]?.status ?? 'locked';
    const tracked = s.trackedQuest === q.id && st !== 'claimed';
    const ready = st === 'complete';
    const claimed = st === 'claimed';
    const color = q.type === 'main' ? MAIN_COLOR : SIDE_COLOR;
    const giver = npcById(q.giver);
    const tx = 12 + PORTRAIT + 8;
    const tw = w - tx - 10;
    const parts: Phaser.GameObjects.GameObject[] = [];

    // Header: type chip + giver, title, status on the right.
    const chip = this.add.bitmapText(tx + 4, top + 7, FONT.smallPlain, q.type === 'main' ? t('qMain') : t('qSide')).setTint(0x0d0b1a);
    const chipBg = this.add.rectangle(tx, top + 6, chip.width + 8, chip.height + 2, claimed ? COLORS.border : color).setOrigin(0, 0);
    parts.push(chipBg, chip);
    parts.push(fitBox(this.add.bitmapText(tx + chip.width + 14, top + 7, FONT.small, giver ? tr(giver.name) : '').setTint(COLORS.textDim), tw - chip.width - 90));
    let y = top + 9 + chip.height;
    const title = fitBox(this.add.bitmapText(tx, y, FONT.body, tr(q.title)).setTint(claimed ? COLORS.textDim : color), tw);
    parts.push(title);
    y += title.displayHeight + 2;

    const statusText = tracked ? t('qTrackedChip') : ready ? t('qReady') : claimed ? t('complete') : '';
    if (statusText) {
      const stT = this.add.bitmapText(w - 10, top + 7, FONT.small, statusText).setOrigin(1, 0).setTint(ready ? COLORS.green : tracked ? COLORS.gold : COLORS.textDim);
      parts.push(stT);
      if (tracked) parts.push(this.add.image(w - 14 - stT.width, top + 7 + stT.height / 2, 'proj_star').setTint(COLORS.gold).setScale(0.8));
      if (ready) this.tweens.add({ targets: stT, alpha: 0.45, yoyo: true, repeat: -1, duration: 600 });
    }

    // Description.
    const desc = this.add.bitmapText(tx, y, FONT.small, tr(q.desc)).setMaxWidth(tw).setTint(COLORS.textDim);
    parts.push(desc);
    y += desc.height + 6;

    // Objectives with checkboxes and progress bars.
    if (!claimed) {
      q.objectives.forEach((o, i) => {
        const p = objectiveProgress(s, q, o, i);
        const ok = p.have >= p.need;
        parts.push(this.add.rectangle(tx + 4, y + 6, 8, 8, ok ? COLORS.green : 0x0d0b1a).setStrokeStyle(1, ok ? COLORS.green : COLORS.borderLight));
        const txt = this.add.bitmapText(tx + 14, y, FONT.small, objectiveText(o)).setMaxWidth(tw - 60).setTint(ok ? COLORS.green : COLORS.text);
        parts.push(txt);
        if (p.need > 1) {
          parts.push(this.add.bitmapText(w - 10, y, FONT.small, `${p.have}/${p.need}`).setOrigin(1, 0).setTint(ok ? COLORS.green : COLORS.gold));
          const barY = y + txt.height + 2;
          parts.push(this.add.rectangle(tx + 14, barY, tw - 14, 3, 0x0d0b1a).setOrigin(0, 0));
          parts.push(this.add.rectangle(tx + 14, barY, Math.max(1, (tw - 14) * Math.min(1, p.have / p.need)), 3, ok ? COLORS.green : color).setOrigin(0, 0));
          y += txt.height + 8;
        } else y += txt.height + 4;
      });
      if (ready && giver) {
        parts.push(this.add.bitmapText(tx, y, FONT.small, t('returnTo', { n: tr(giver.name) })).setTint(COLORS.green));
        y += 14;
      }
    }

    // Rewards.
    let rx = tx;
    const ry = y + 2;
    for (const c of rewardChips(q.rewards)) {
      if (c.icon && this.textures.exists(c.icon)) {
        parts.push(this.add.image(rx + 6, ry + 6, c.icon).setDisplaySize(12, 12).setAlpha(claimed ? 0.5 : 1));
        rx += 14;
      }
      const rt = this.add.bitmapText(rx, ry, FONT.small, c.text).setTint(claimed ? COLORS.textDim : c.color);
      parts.push(rt);
      rx += rt.width + 10;
    }
    y = ry + 16;

    const h = Math.max(y - top + 6, PORTRAIT + 16);
    const bg = panel(this, 0, top, w, h, tracked ? 'ui_panel_ornate' : ready ? 'ui_panel' : 'ui_panel_dark');
    const stripe = this.add.rectangle(2, top + 4, 3, h - 8, color).setOrigin(0, 0).setAlpha(claimed ? 0.3 : 0.9);
    const slot = nine(this, 12, top + 8, 'ui_slot', PORTRAIT, PORTRAIT).setOrigin(0, 0);
    const face = giver && this.textures.exists(`portraits_${giver.id}`)
      ? this.add.image(12 + PORTRAIT / 2, top + 8 + PORTRAIT / 2, `portraits_${giver.id}`).setDisplaySize(PORTRAIT - 4, PORTRAIT - 4).setAlpha(claimed ? 0.55 : 1)
      : null;
    scroll.add([bg, stripe, slot, ...(face ? [face] : []), ...parts]);

    if (!claimed) {
      const zone = this.add.zone(0, top, w, h).setOrigin(0, 0).setInteractive();
      zone.on('pointerup', () => {
        if (scroll.wasDrag || tracked) return;
        s.trackedQuest = q.id;
        services.save!.markDirty();
        services.audio?.sfx('ui_click');
        toast(this, t('qNowTracking', { q: tr(q.title) }), COLORS.gold);
        this.scene.restart({ from: this.from, tab: this.tab, focus: q.id });
      });
      scroll.add(zone);
    }
    return h;
  }
}
