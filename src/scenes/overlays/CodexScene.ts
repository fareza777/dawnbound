import Phaser from 'phaser';
import { OverlayScene } from './OverlayScene';
import { nine } from '@/ui/skin';
import { COLORS, FONT, RARITY_COLORS } from '@/ui/theme';
import { fitBox, label, panel, toast } from '@/ui/widgets';
import { t, tr } from '@/core/i18n';
import { ScrollPanel } from '@/ui/scroll';
import { ENEMIES } from '@/data/enemies';
import { BOSSES } from '@/data/bosses';
import { RELICS, RELIC_TIER_COLOR } from '@/data/relics';
import { BOONS, SPIRITS, boonValue } from '@/data/boons';
import { ITEM_BASES, UNIQUES } from '@/data/items';
import { LORE } from '@/data/story';
import { ACHIEVEMENTS } from '@/data/achievements';
import { EVENTS } from '@/data/events';
import { showDetailCard, type DetailSpec } from '@/ui/detailCard';
import { baseDetail, bossDetail, boonDetail, monsterDetail, relicDetail, uniqueDetail } from './codexDetails';

type Tab = 'bestiary' | 'items' | 'relics' | 'boons' | 'lore' | 'achievements' | 'stats';
const TABS: Tab[] = ['bestiary', 'items', 'relics', 'boons', 'lore', 'achievements', 'stats'];

/** Collection book. Undiscovered entries show as ??? to drive completion. */
export class CodexScene extends OverlayScene {
  private scroll!: ScrollPanel;
  private tabBtns: Phaser.GameObjects.BitmapText[] = [];
  private countText!: Phaser.GameObjects.BitmapText;
  private detailOpen = false;
  private tapHint!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Codex');
  }

  create(): void {
    const inner = this.frame(t('menuCodex'), 0.9);
    this.tabBtns = [];
    const tabW = inner.w / 4;
    TABS.forEach((tb, i) => {
      const x = inner.x + (i % 4) * tabW;
      const y = inner.y + Math.floor(i / 4) * 22;
      const bg = panel(this, x + 1, y, tabW - 2, 20, 'ui_tab').setInteractive();
      const txt = fitBox(label(this, x + tabW / 2, y + 10, t(tb === 'bestiary' ? 'bestiary' : tb === 'items' ? 'equipment' : tb), FONT.small, COLORS.text, 0.5, 0.5), tabW - 8, 18);
      bg.on('pointerup', () => this.show(tb));
      this.tabBtns.push(txt);
      (txt as unknown as { bgRef: Phaser.GameObjects.NineSlice }).bgRef = bg;
    });
    this.detailOpen = false;
    this.tapHint = label(this, inner.x, inner.y + 48, t('cxTapHint'), FONT.small, COLORS.textDim).setAlpha(0.7);
    this.countText = label(this, inner.x + inner.w, inner.y + 48, '', FONT.small, COLORS.textDim, 1, 0);
    this.scroll = new ScrollPanel(this, inner.x, inner.y + 62, inner.w, inner.h - 62);
    this.show('bestiary');
  }

  private show(tab: Tab): void {
    this.tabBtns.forEach((b, i) => {
      const bg = (b as unknown as { bgRef: Phaser.GameObjects.NineSlice }).bgRef;
      bg.setTexture(TABS[i] === tab ? 'ui_tab_on' : 'ui_tab');
      b.setTint(TABS[i] === tab ? COLORS.gold : COLORS.textDim);
    });
    this.scroll.clear();
    this.tapHint.setVisible(tab !== 'lore' && tab !== 'achievements' && tab !== 'stats');
    const s = this.save;
    const w = this.scroll.w;
    let y = 0;
    /** icon.frame omitted = icon.atlas is a standalone texture key (generated icons). */

    const entry = (known: boolean, title: string, body: string, color: number, icon?: { atlas: string; frame?: string }, detail?: () => DetailSpec) => {
      const top = y;
      const x0 = icon ? 36 : 4;
      const hasIcon = icon && this.textures.exists(icon.atlas) && (!icon.frame || this.textures.get(icon.atlas).has(icon.frame));
      if (icon) {
        this.scroll.add(nine(this, 1, y, 'ui_slot', 28, 28).setOrigin(0, 0));
        if (hasIcon) {
          const img = this.add.image(15, y + 14, icon.atlas, icon.frame);
          // Centre and size on the visible (trimmed) pixels, not the padded sprite cell.
          const f = img.frame;
          img.setOrigin((f.x + f.width / 2) / f.realWidth, (f.y + f.height / 2) / f.realHeight);
          img.setScale(Math.min(icon.frame ? 1 : 0.75, 24 / Math.max(f.width, f.height)));
          // Undiscovered entries show a dark silhouette as a teaser.
          if (!known) img.setTintFill(0x5a5080).setAlpha(0.8);
          this.scroll.add(img);
        }
      }
      this.scroll.add(this.add.bitmapText(x0, y, FONT.body, known ? title : t('undiscovered')).setTint(known ? color : COLORS.textDim));
      const d = this.add.bitmapText(x0, y + 15, FONT.small, known ? body : t(`codexHint_${tab}`)).setMaxWidth(w - x0 - 6)
        .setTint(COLORS.textDim).setAlpha(known ? 1 : 0.6);
      this.scroll.add(d);
      y += Math.max(icon ? 30 : 0, 17 + d.height) + 6;
      if (detail) {
        // Whole row is the tap target; taps that ended a scroll drag are ignored.
        const zone = this.add.zone(0, top - 2, w, y - top).setOrigin(0, 0).setInteractive();
        zone.on('pointerup', () => {
          if (this.scroll.wasDrag || this.detailOpen) return;
          if (!known) {
            toast(this, t('cxUnknown'), COLORS.textDim);
            return;
          }
          this.detailOpen = true;
          this.scroll.locked = true;
          showDetailCard(this, detail(), () => {
            this.detailOpen = false;
            this.scroll.locked = false;
          });
        });
        this.scroll.add(zone);
      }
    };
    let found = 0;
    let total = 0;
    switch (tab) {
      case 'bestiary': {
        for (const e of Object.values(ENEMIES)) {
          total++;
          const kills = s.codex.enemies[e.id];
          const known = kills !== undefined;
          if (known) found++;
          const frame = e.sprite.atlas === 'monsters' ? `${e.sprite.key}/down/1` : `${e.sprite.key.replace('_walk', '')}/walk/down/1`;
          entry(known, `${tr(e.name)}  ·  ${t('kills')}: ${kills ?? 0}`, tr(e.lore), COLORS.text, { atlas: e.sprite.atlas, frame }, () => monsterDetail(e, kills ?? 0));
        }
        for (const b of Object.values(BOSSES)) {
          total++;
          const known = s.unlocks.bossesDefeated.length > 0 && (s.codex.enemies[b.id] !== undefined || s.unlocks.bossesDefeated.some((x) => x === b.id || (x === 'twin_lamias' && (b.id === 'ivra' || b.id === 'sseth'))));
          if (known) found++;
          entry(known, `${tr(b.name)} — ${tr(b.title)}`, tr(b.intro), COLORS.orange, { atlas: 'battlers', frame: b.frame }, () => bossDetail(b, s.unlocks.bossesDefeated.length > 0 && known));
        }
        break;
      }
      case 'items': {
        for (const u of UNIQUES) {
          total++;
          const known = s.codex.items.includes(u.id);
          if (known) found++;
          entry(known, tr(u.name), `${tr(u.power)}\n"${tr(u.flavor)}"`, u.mythic ? RARITY_COLORS[5] : RARITY_COLORS[4], { atlas: `icons_unique_${u.id}` }, () => uniqueDetail(u));
        }
        for (const b of ITEM_BASES) {
          total++;
          const known = s.codex.items.includes(b.id);
          if (known) found++;
          entry(known, tr(b.name), t('cxTier', { n: b.tier }), COLORS.text, { atlas: b.icon }, () => baseDetail(b));
        }
        break;
      }
      case 'relics': {
        for (const r of RELICS) {
          total++;
          const known = s.codex.relics.includes(r.id);
          if (known) found++;
          entry(known, tr(r.name), tr(r.desc), RELIC_TIER_COLOR[r.tier], { atlas: r.icon }, () => relicDetail(r));
        }
        break;
      }
      case 'boons': {
        for (const b of BOONS) {
          total++;
          const known = s.codex.boons.includes(b.id);
          if (known) found++;
          const { v, v2 } = boonValue(b, 1);
          entry(known, `${tr(b.name)} (${tr(SPIRITS[b.spirit].name)}${b.duo ? ' + ' + tr(SPIRITS[b.duo].name) : ''})`, tr(b.desc, { v, v2 }), SPIRITS[b.spirit].color, { atlas: `icons_boon_${b.id}` }, () => boonDetail(b));
        }
        break;
      }
      case 'lore': {
        for (const l of LORE) {
          total++;
          const known = s.codex.lore.includes(l.id);
          if (known) found++;
          entry(known, tr(l.title), tr(l.text), 0xc8b0ff);
        }
        total += EVENTS.length;
        found += s.codex.events.length;
        break;
      }
      case 'achievements': {
        for (const a of ACHIEVEMENTS) {
          total++;
          const known = !!s.achievements[a.id];
          if (known) found++;
          this.scroll.add(this.add.bitmapText(4, y, FONT.body, tr(a.name)).setTint(known ? COLORS.gold : COLORS.textDim));
          this.scroll.add(this.add.bitmapText(4, y + 15, FONT.small, tr(a.desc)).setMaxWidth(w - 10).setTint(known ? COLORS.text : COLORS.border));
          y += 34;
        }
        break;
      }
      case 'stats': {
        const st = s.stats;
        const rows: [string, string][] = [
          [t('statRuns'), `${st.runs ?? 0}`], [t('statWins'), `${st.wins ?? 0}`], [t('statDeaths'), `${st.deaths ?? 0}`],
          [t('kills'), `${st.kills ?? 0}`], [t('statBestDepth'), `${st.bestDepth ?? 0}`], [t('statBestEndless'), `${st.bestEndless ?? 0}`], [t('statEmbers'), `${st.totalEmbers ?? 0}`],
          [t('statPlaytime'), `${Math.floor((s.playTimeSec ?? 0) / 3600)}h ${Math.floor(((s.playTimeSec ?? 0) % 3600) / 60)}m`],
          [t('shards'), `${s.currency.shards}`],
        ];
        for (const [k, v] of rows) {
          this.scroll.add(this.add.bitmapText(4, y, FONT.body, k).setTint(COLORS.textDim));
          this.scroll.add(this.add.bitmapText(w - 4, y, FONT.body, v).setOrigin(1, 0).setTint(COLORS.text));
          y += 20;
        }
        break;
      }
    }
    this.countText.setText(total ? t('discovered', { a: found, b: total }) : '');
    this.scroll.setContentHeight(y + 10);
  }
}
