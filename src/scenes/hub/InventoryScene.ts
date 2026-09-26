import Phaser from 'phaser';
import { OverlayScene } from '../overlays/OverlayScene';
import { COLORS, FONT } from '@/ui/theme';
import { Button, label, panel, toast } from '@/ui/widgets';
import { confirm } from '@/ui/modal';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { ScrollPanel } from '@/ui/scroll';
import { itemCard, itemSlot, materialIcon } from '@/ui/items';
import { SLOTS, type ItemInstance, type Slot } from '@/data/types';
import { ITEM_BASES, SLOT_NAMES, baseById } from '@/data/items';
import { MATERIALS } from '@/data/materials';
import { itemPower, salvageYield } from '@/systems/loot';
import { buildContext, equippedItems } from '@/game/RunManager';
import { checkProgress } from '@/game/Progress';
import { bestLoadout, loadoutGain } from '@/game/equipBest';

export const INVENTORY_CAP = 150;
type Filter = 'all' | 'weapon' | 'armor' | 'jewel' | 'materials';
const FILTER_SLOTS: Record<Filter, Slot[]> = {
  all: SLOTS, weapon: ['weapon'], armor: ['helm', 'armor', 'boots'], jewel: ['ring', 'amulet', 'charm'], materials: [],
};

export class InventoryScene extends OverlayScene {
  private filter: Filter = 'all';
  private sortMode: 'power' | 'rarity' | 'new' = 'power';
  private grid!: ScrollPanel;
  private detail?: Phaser.GameObjects.Container;
  private detailBtns: Phaser.GameObjects.GameObject[] = [];
  private eqRow: Phaser.GameObjects.Container[] = [];
  private powerText!: Phaser.GameObjects.BitmapText;
  private inner!: { x: number; y: number; w: number; h: number };
  private countText!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Inventory');
  }

  create(): void {
    this.inner = this.frame(t('inventory'), 0.94);
    const { x, y, w } = this.inner;
    this.powerText = label(this, x, y - 2, '', FONT.small, COLORS.gold);
    this.countText = label(this, x + w, y - 2, '', FONT.small, COLORS.textDim, 1, 0);
    this.drawEquipped();
    const tabs: [Filter, string][] = [['all', t('all')], ['weapon', tr(SLOT_NAMES.weapon)], ['armor', tr(SLOT_NAMES.armor)], ['jewel', t('jewelry')], ['materials', t('materials')]];
    const tw = w / tabs.length;
    tabs.forEach(([f, name], i) => {
      const bg = panel(this, x + i * tw + 1, y + 58, tw - 2, 20, f === this.filter ? 'ui_tab_on' : 'ui_tab').setInteractive();
      label(this, x + i * tw + tw / 2, y + 68, name, FONT.small, COLORS.text, 0.5, 0.5);
      bg.on('pointerup', () => {
        this.filter = f;
        this.scene.restart({ from: this.from, filter: f, sort: this.sortMode });
      });
    });
    new Button(this, x + 36, y + 94, t('sort'), () => {
      this.sortMode = this.sortMode === 'power' ? 'rarity' : this.sortMode === 'rarity' ? 'new' : 'power';
      this.drawGrid();
    }, { w: 72, h: 22, font: FONT.small });
    new Button(this, x + w / 2 - 4, y + 94, t('equipBest'), () => this.equipBest(), { w: 104, h: 22, font: FONT.small, style: 'primary' });
    new Button(this, x + w - 50, y + 94, t('salvageAll'), () => this.salvageJunk(), { w: 100, h: 22, font: FONT.small });
    this.grid = new ScrollPanel(this, x, y + 110, w, Math.round(this.inner.h * 0.42));
    this.drawGrid();
  }

  init(d: { from?: string; filter?: Filter; sort?: 'power' | 'rarity' | 'new' }): void {
    super.init(d);
    this.filter = d.filter ?? 'all';
    this.sortMode = d.sort ?? 'power';
    this.detail = undefined;
    this.detailBtns = [];
    this.eqRow = [];
  }

  private drawEquipped(): void {
    const s = this.save;
    const { x, y, w } = this.inner;
    this.eqRow.forEach((c) => c.destroy());
    this.eqRow = [];
    const size = Math.min(40, Math.floor((w - 12) / 7));
    SLOTS.forEach((slot, i) => {
      const uid = s.equipped[slot];
      const it = uid ? s.inventory.find((q) => q.uid === uid) ?? null : null;
      const ghost = ITEM_BASES.find((b) => b.slot === slot)?.icon;
      const c = itemSlot(this, x + size / 2 + i * (size + 2), y + 30, it, size, tr(SLOT_NAMES[slot]).slice(0, 4), ghost);
      c.setSize(size, size).setInteractive();
      c.on('pointerup', () => it && this.showDetail(it));
      this.eqRow.push(c);
    });
    const ctx = buildContext(s, null);
    const power = equippedItems(s).reduce((a, it) => a + itemPower(it), 0);
    this.powerText.setText(`${t('gearScore', { n: power })}  ·  HP ${Math.round(ctx.stats.maxHp)}  ATK ${Math.round(ctx.stats.atk)}  DEF ${Math.round(ctx.stats.def)}`);
    this.countText.setText(`${s.inventory.length}/${INVENTORY_CAP}`);
  }

  private visibleItems(): ItemInstance[] {
    const s = this.save;
    const eq = new Set(Object.values(s.equipped));
    const slots = FILTER_SLOTS[this.filter];
    const list = s.inventory.filter((it) => !eq.has(it.uid) && slots.includes(baseById(it.baseId)?.slot as Slot));
    const cmp: Record<string, (a: ItemInstance, b: ItemInstance) => number> = {
      power: (a, b) => itemPower(b) - itemPower(a),
      rarity: (a, b) => b.rarity - a.rarity || itemPower(b) - itemPower(a),
      new: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.uid.localeCompare(a.uid),
    };
    return list.sort(cmp[this.sortMode]);
  }

  private drawGrid(): void {
    this.grid.clear();
    const s = this.save;
    const w = this.grid.w;
    if (this.filter === 'materials') {
      let y = 0;
      const owned = MATERIALS.filter((m) => (s.materials[m.id] ?? 0) > 0);
      if (!owned.length) this.grid.add(this.add.bitmapText(4, 4, FONT.body, t('nothingHere')).setTint(COLORS.textDim));
      for (const m of owned) {
        this.grid.add(materialIcon(this, 12, y + 10, m.id, 18));
        this.grid.add(this.add.bitmapText(28, y + 2, FONT.body, `${tr(m.name)}  x${s.materials[m.id]}`).setTint(COLORS.text));
        const d = this.add.bitmapText(28, y + 17, FONT.small, tr(m.desc)).setMaxWidth(w - 34).setTint(COLORS.textDim);
        this.grid.add(d);
        y += 22 + d.height;
      }
      this.grid.setContentHeight(y + 4);
      return;
    }
    const items = this.visibleItems();
    const size = 40;
    const cols = Math.max(4, Math.floor(w / (size + 4)));
    const gap = (w - cols * size) / (cols - 1);
    items.forEach((it, i) => {
      const cx = (i % cols) * (size + gap) + size / 2;
      const cy = Math.floor(i / cols) * (size + 4) + size / 2;
      const c = itemSlot(this, cx, cy, it, size);
      c.setSize(size, size).setInteractive();
      c.on('pointerup', () => {
        if (this.grid.wasDrag) return;
        this.showDetail(it);
      });
      this.grid.add(c);
    });
    if (!items.length) this.grid.add(this.add.bitmapText(4, 4, FONT.body, t('nothingHere')).setTint(COLORS.textDim));
    this.grid.setContentHeight(Math.ceil(items.length / cols) * (size + 4) + 4);
  }

  private setCount(it: ItemInstance): number {
    if (!it.setId) return 0;
    return equippedItems(this.save).filter((e) => e.setId === it.setId).length;
  }

  private showDetail(it: ItemInstance): void {
    const s = this.save;
    this.detail?.destroy();
    this.detailBtns.forEach((b) => b.destroy());
    this.detailBtns = [];
    if (it.isNew) {
      it.isNew = false;
      services.save!.markDirty();
    }
    const slot = baseById(it.baseId)!.slot;
    const equippedUid = s.equipped[slot];
    const isEquipped = equippedUid === it.uid;
    const current = equippedUid && !isEquipped ? s.inventory.find((q) => q.uid === equippedUid) : null;
    const top = this.grid.y + this.grid.h + 6;
    const { container, height } = itemCard(this, this.inner.x, top, this.inner.w, it, current, this.setCount(it));
    this.detail = container;
    const maxH = this.panelY + this.panelH - 44 - top;
    if (height > maxH) container.setScale(Math.max(0.7, maxH / height));
    const by = this.panelY + this.panelH - 22;
    const bw = (this.inner.w - 12) / 3;
    const bx = this.inner.x + bw / 2;
    const b1 = new Button(this, bx, by, isEquipped ? t('unequip') : t('equip'), () => {
      if (isEquipped) delete s.equipped[slot];
      else s.equipped[slot] = it.uid;
      services.audio?.sfx('anvil', { volume: 0.4 });
      services.save!.markDirty();
      checkProgress();
      this.refreshAll(it);
    }, { w: bw, h: 26, style: 'primary' });
    const b2 = new Button(this, bx + bw + 6, by, it.locked ? t('unlock') : t('lock'), () => {
      it.locked = !it.locked;
      services.save!.markDirty();
      this.refreshAll(it);
    }, { w: bw, h: 26 });
    const b3 = new Button(this, bx + (bw + 6) * 2, by, t('salvage'), () => {
      confirm(this, t('salvage'), `${t('salvageConfirm')}`, () => {
        this.salvage([it]);
        this.detail?.destroy();
        this.detailBtns.forEach((b) => b.destroy());
        this.refreshAll();
      }, true);
    }, { w: bw, h: 26, style: 'danger', disabled: !!it.locked || isEquipped });
    this.detailBtns.push(b1, b2, b3);
  }

  private refreshAll(focus?: ItemInstance): void {
    this.drawEquipped();
    this.drawGrid();
    if (focus) this.showDetail(focus);
  }

  /** Wear the strongest loadout in the stash in one tap. */
  private equipBest(): void {
    const s = this.save;
    const next = bestLoadout(s);
    const gain = loadoutGain(s, next);
    if (SLOTS.every((slot) => next[slot] === s.equipped[slot])) {
      toast(this, t('equipBestNone'), COLORS.textDim, this.panelY + this.panelH - 60);
      return;
    }
    s.equipped = next;
    services.audio?.sfx('anvil', { volume: 0.5 });
    services.save!.markDirty();
    checkProgress();
    // A percentage only reads well for upgrades; from empty slots the number would be meaningless (+16000%).
    const msg = gain >= 0.01 && gain <= 3 ? t('equipBestDone', { n: Math.round(gain * 100) }) : t('equipBestDoneSmall');
    toast(this, msg, COLORS.gold, this.panelY + this.panelH - 60);
    this.refreshAll();
  }

  private salvage(items: ItemInstance[]): void {
    const s = this.save;
    const gained: Record<string, number> = {};
    for (const it of items) {
      for (const [id, n] of salvageYield(it)) {
        s.materials[id] = (s.materials[id] ?? 0) + n;
        gained[id] = (gained[id] ?? 0) + n;
      }
    }
    const uids = new Set(items.map((i) => i.uid));
    s.inventory = s.inventory.filter((i) => !uids.has(i.uid));
    services.save!.markDirty();
    services.audio?.sfx('break', { volume: 0.7 });
    toast(this, `${t('salvaged', { n: items.length })}`, COLORS.blue);
  }

  private salvageJunk(): void {
    const s = this.save;
    const eq = new Set(Object.values(s.equipped));
    const junk = s.inventory.filter((i) => i.rarity <= 1 && !i.locked && !eq.has(i.uid));
    if (!junk.length) {
      toast(this, t('nothingHere'), COLORS.textDim);
      return;
    }
    confirm(this, t('salvageAll'), t('salvageJunkConfirm', { n: junk.length }), () => {
      this.salvage(junk);
      this.refreshAll();
    });
  }
}
