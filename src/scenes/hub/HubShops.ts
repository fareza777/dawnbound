import Phaser from 'phaser';
import { OverlayScene } from '../overlays/OverlayScene';
import { COLORS, FONT, RARITY_COLORS } from '@/ui/theme';
import { Button, label, panel, para, resizePanel, shrinkToFit, toast } from '@/ui/widgets';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { bus } from '@/core/events';
import { ScrollPanel } from '@/ui/scroll';
import { itemCard, itemSlot, materialIcon } from '@/ui/items';
import type { ItemInstance, Rarity, Slot } from '@/data/types';
import { SLOTS } from '@/data/types';
import { SLOT_NAMES, affixById, baseById } from '@/data/items';
import { ELIXIRS, MATERIALS, SEED_GROWTH, SEED_PLANT, materialDef } from '@/data/materials';
import {
  MAX_PLUS, affixesForSlot, generateItem, itemName, itemPower, rollAffixValue, sellValue, tierForIlvl, upgradeCost, upgradeSuccessChance,
} from '@/systems/loot';
import { Rng } from '@/core/rng';
import { checkProgress } from '@/game/Progress';
import { today } from '@/systems/bounties';
import { equippedItems } from '@/game/RunManager';
import { shakeCamera, view } from '@/core/viewport';
import { a11y } from '@/core/a11y';

function haveMats(s: { materials: Record<string, number> }, mats: [string, number][]): boolean {
  return mats.every(([id, n]) => (s.materials[id] ?? 0) >= n);
}

function payMats(s: { materials: Record<string, number> }, mats: [string, number][]): void {
  for (const [id, n] of mats) s.materials[id] = (s.materials[id] ?? 0) - n;
}

function costLine(scene: Phaser.Scene, x: number, y: number, gold: number, mats: [string, number][], s: { currency: { gold: number }; materials: Record<string, number> }): number {
  let cx = x;
  if (gold > 0) {
    scene.add.image(cx + 5, y + 5, 'pk_coin').setScale(1.2);
    const tt = label(scene, cx + 12, y, `${gold}`, FONT.small, s.currency.gold >= gold ? COLORS.gold : COLORS.red);
    cx += 18 + tt.width;
  }
  for (const [id, n] of mats) {
    materialIcon(scene, cx + 6, y + 5, id, 12);
    const have = s.materials[id] ?? 0;
    const tt = label(scene, cx + 13, y, `${have}/${n}`, FONT.small, have >= n ? COLORS.text : COLORS.red);
    cx += 20 + tt.width;
  }
  return cx;
}

// ============================================================================ Blacksmith
export class BlacksmithScene extends OverlayScene {
  private mode: 'upgrade' | 'forge' | 'reforge' = 'upgrade';
  private selected?: ItemInstance;

  constructor() {
    super('Blacksmith');
  }

  init(d: { from?: string; mode?: 'upgrade' | 'forge' | 'reforge'; uid?: string }): void {
    super.init(d);
    this.mode = d.mode ?? 'upgrade';
    this.selected = d.uid ? services.save!.data.inventory.find((i) => i.uid === d.uid) : undefined;
  }

  private restartWith(mode: BlacksmithScene['mode'], uid?: string): void {
    this.scene.restart({ from: this.from, mode, uid });
  }

  create(): void {
    const inner = this.frame(t('blacksmith'), 0.94);
    const s = this.save;
    const tabs: [BlacksmithScene['mode'], string][] = [['upgrade', t('upgrade')], ['forge', t('forge')], ['reforge', t('reforge')]];
    const tw = inner.w / 3;
    tabs.forEach(([m, name], i) => {
      const locked = m === 'reforge' && !s.unlocks.features.includes('reforge');
      const bg = panel(this, inner.x + i * tw + 1, inner.y, tw - 2, 30, m === this.mode ? 'ui_tab_on' : 'ui_tab').setInteractive();
      shrinkToFit(label(this, inner.x + i * tw + tw / 2, inner.y + 15, locked ? `${name} (${t('locked')})` : name, FONT.small, locked ? COLORS.textDim : COLORS.text, 0.5, 0.5), tw - 8);
      bg.on('pointerup', () => {
        if (locked) toast(this, t('reforgeLocked'), COLORS.textDim);
        else this.restartWith(m, this.selected?.uid);
      });
    });
    const body = { x: inner.x, y: inner.y + 38, w: inner.w, h: inner.h - 38 };
    if (this.mode === 'forge') this.drawForge(body);
    else this.drawItemPicker(body);
  }

  private drawItemPicker(b: { x: number; y: number; w: number; h: number }): void {
    const s = this.save;
    const eq = new Set(Object.values(s.equipped));
    const items = [...equippedItems(s), ...s.inventory.filter((i) => !eq.has(i.uid)).sort((a, c) => itemPower(c) - itemPower(a))]
      .filter((i) => this.mode !== 'reforge' || i.affixes.length > 0);
    const listH = 96;
    const scroll = new ScrollPanel(this, b.x, b.y, b.w, listH);
    const size = 40;
    const cols = Math.max(4, Math.floor(b.w / (size + 4)));
    const gap = (b.w - cols * size) / (cols - 1);
    items.forEach((it, i) => {
      const c = itemSlot(this, (i % cols) * (size + gap) + size / 2, Math.floor(i / cols) * (size + 4) + size / 2, it, size);
      if (eq.has(it.uid)) c.add(this.add.bitmapText(0, -size / 2 + 2, FONT.small, 'E').setOrigin(0.5, 0).setTint(COLORS.gold));
      if (this.selected?.uid === it.uid) c.add(this.add.rectangle(0, 0, size, size).setStrokeStyle(2, COLORS.gold));
      c.setSize(size, size).setInteractive().on('pointerup', () => !scroll.wasDrag && this.restartWith(this.mode, it.uid));
      scroll.add(c);
    });
    scroll.setContentHeight(Math.ceil(items.length / cols) * (size + 4));
    if (!items.length) label(this, b.x, b.y + 4, t('nothingHere'), FONT.body, COLORS.textDim);
    const it = this.selected;
    if (!it) {
      para(this, b.x, b.y + listH + 12, t('smithPick'), b.w, FONT.body, COLORS.textDim);
      return;
    }
    const cardY = b.y + listH + 8;
    const { container, height } = itemCard(this, 0, 0, b.w - 6, it);
    const maxCard = Math.max(64, b.h - listH - (this.mode === 'reforge' ? 150 : 116));
    const detail = new ScrollPanel(this, b.x, cardY, b.w, maxCard);
    detail.add(container).setContentHeight(height);
    const bottom = this.panelY + this.panelH - 16;
    if (this.mode === 'upgrade') this.upgradePanel(it, b, bottom);
    else this.reforgePanel(it, b, bottom);
  }

  private upgradePanel(it: ItemInstance, b: { x: number; w: number }, bottom: number): void {
    const s = this.save;
    if (it.plus >= MAX_PLUS) {
      label(this, view.w / 2, bottom - 30, t('maxed'), FONT.head, COLORS.gold, 0.5, 0.5);
      return;
    }
    const cost = upgradeCost(it);
    const chance = upgradeSuccessChance(it.plus);
    label(this, b.x, bottom - 86, `+${it.plus} -> +${it.plus + 1}   ${t('chance')}: ${Math.round(chance * 100)}%`, FONT.body, COLORS.text).setMaxWidth(b.w);
    costLine(this, b.x, bottom - 48, cost.gold, cost.mats, s);
    const can = s.currency.gold >= cost.gold && haveMats(s, cost.mats);
    new Button(this, view.w / 2, bottom - 16, t('upgrade'), () => {
      if (!can) return;
      s.currency.gold -= cost.gold;
      payMats(s, cost.mats);
      const ok = Math.random() < chance;
      if (ok) {
        it.plus += 1;
        services.audio?.sfx('forge');
        this.cameras.main.flash(200, 255, 220, 150);
        toast(this, `${itemName(it)}!`, COLORS.gold);
        bus.emit('itemUpgraded', { level: it.plus });
      } else {
        services.audio?.sfx('upgrade_fail');
        if (!a11y.reduceMotion) shakeCamera(this.cameras.main, 200, 0.006);
        toast(this, t('upgradeFailed'), COLORS.red);
      }
      services.save!.markDirty();
      checkProgress();
      this.time.delayedCall(350, () => this.restartWith('upgrade', it.uid));
    }, { w: 180, h: 28, style: 'primary', disabled: !can });
  }

  private reforgePanel(it: ItemInstance, b: { x: number; w: number }, bottom: number): void {
    const s = this.save;
    const gold = Math.round(60 + it.ilvl * 4 + it.rarity * 40);
    const mats: [string, number][] = [['arcane_dust', 2 + it.rarity], ['rare_shard', Math.max(1, it.rarity - 1)]];
    label(this, b.x, bottom - 112, t('reforgeHint'), FONT.small, COLORS.textDim).setMaxWidth(b.w);
    costLine(this, b.x, bottom - 46, gold, mats, s);
    const can = s.currency.gold >= gold && haveMats(s, mats) && it.affixes.length > 0;
    new Button(this, view.w / 2, bottom - 16, t('reforge'), () => {
      if (!can) return;
      s.currency.gold -= gold;
      payMats(s, mats);
      const rng = new Rng(Date.now());
      const slot = baseById(it.baseId)!.slot;
      const idx = rng.int(0, it.affixes.length - 1);
      const taken = new Set(it.affixes.map((a) => a.id));
      const pool = affixesForSlot(slot).filter((a) => !taken.has(a.id) || a.id === it.affixes[idx].id);
      const def = rng.weighted(pool.map((a) => [a, a.weight] as const));
      it.affixes[idx] = { id: def.id, value: rollAffixValue(def, Math.max(tierForIlvl(it.ilvl), baseById(it.baseId)!.tier), rng) };
      services.audio?.sfx('forge');
      services.save!.markDirty();
      toast(this, `${tr(affixById(def.id)!.name)}!`, COLORS.blue);
      this.time.delayedCall(250, () => this.restartWith('reforge', it.uid));
    }, { w: 180, h: 28, style: 'primary', disabled: !can });
  }

  private drawForge(b: { x: number; y: number; w: number; h: number }): void {
    const s = this.save;
    const hint = para(this, b.x, b.y, t('forgeHint'), b.w, FONT.body, COLORS.textDim);
    const depth = Math.max(1, s.unlocks.maxDepthReached);
    const ilvl = depth * 10 + 2;
    const gold = 80 + depth * 60;
    const mats: [string, number][] = [['iron_ore', 6 + depth * 2], ['arcane_dust', 2 + depth]];
    if (depth >= 3) mats.push(['rare_shard', depth - 2]);
    const costY = hint.y + hint.height + 12;
    costLine(this, b.x, costY, gold, mats, s);
    const can = s.currency.gold >= gold && haveMats(s, mats);
    const cols = 2;
    const bw = (b.w - 8) / cols;
    SLOTS.forEach((slot: Slot, i) => {
      const x = b.x + (i % cols) * (bw + 8) + bw / 2;
      const y = costY + 46 + Math.floor(i / cols) * 42;
      new Button(this, x, y, tr(SLOT_NAMES[slot]), () => {
        if (!can) return;
        s.currency.gold -= gold;
        payMats(s, mats);
        const item = generateItem(new Rng(Date.now()), { ilvl, depth, source: 'forge', slot, uid: services.save!.nextUid(), luck: 0, magicFind: 20 });
        if (item.rarity === 0) item.rarity = 1 as Rarity;
        s.inventory.push(item);
        bus.emit('itemCrafted', { itemId: item.baseId });
        services.audio?.sfx('forge');
        services.save!.markDirty();
        checkProgress();
        this.showForged(item);
      }, { w: bw, h: 34, disabled: !can });
    });
  }

  private showForged(item: ItemInstance): void {
    const dim = this.add.rectangle(0, 0, view.w, view.h, 0x000000, 0.7).setOrigin(0, 0).setInteractive();
    const { container, height } = itemCard(this, 16, 0, view.w - 32, item);
    container.y = (view.h - height) / 2;
    const glow = this.add.image(view.w / 2, container.y + 26, 'fx_light').setTint(RARITY_COLORS[item.rarity]).setBlendMode('ADD').setScale(1.2);
    this.children.moveBelow(glow, container);
    dim.on('pointerup', () => this.restartWith('forge'));
  }
}

// ============================================================================ Alchemist
export class AlchemistScene extends OverlayScene {
  constructor() {
    super('Alchemist');
  }

  create(): void {
    const inner = this.frame(t('alchemist'), 0.92);
    const s = this.save;
    const scroll = new ScrollPanel(this, inner.x, inner.y, inner.w, inner.h);
    let y = 0;
    // Flask upgrades
    const flaskMax = 3;
    const flaskCost = [120, 300, 700][s.flaskLevel] ?? 0;
    const flaskMats: [string, number][] = [['slime_gel', 4 + s.flaskLevel * 4], ['moonpetal', 1 + s.flaskLevel]];
    const flask = this.add.bitmapText(0, y, FONT.head, `${t('flaskUpgrade')} (${s.flaskLevel}/${flaskMax})`).setMaxWidth(inner.w).setTint(COLORS.gold);
    scroll.add(flask);
    y += flask.height + 4;
    const flaskDesc = this.add.bitmapText(0, y, FONT.small, t('flaskUpgradeDesc', { n: 2 + s.flaskLevel })).setMaxWidth(inner.w).setTint(COLORS.textDim);
    scroll.add(flaskDesc);
    y += flaskDesc.height + 6;
    if (s.flaskLevel < flaskMax) {
      const can = s.currency.gold >= flaskCost && haveMats(s, flaskMats);
      const g = this.add.bitmapText(0, y, FONT.small, `${flaskCost}g + ${flaskMats.map(([id, n]) => `${n} ${tr(materialDef(id)!.name)}`).join(', ')}`).setMaxWidth(inner.w).setTint(COLORS.text);
      scroll.add(g);
      y += g.height + 8;
      const btn = new Button(this, inner.w - 54, y + 17, t('upgrade'), () => {
        if (!can) return;
        s.currency.gold -= flaskCost;
        payMats(s, flaskMats);
        s.flaskLevel += 1;
        services.audio?.sfx('brew');
        services.save!.markDirty();
        this.scene.restart({ from: this.from });
      }, { w: 104, h: 34, style: 'primary', disabled: !can });
      scroll.add(btn);
      y += 44;
    }
    y += 10;
    const elixirs = this.add.bitmapText(0, y, FONT.head, t('elixirs')).setTint(COLORS.gold);
    scroll.add(elixirs);
    y += elixirs.height + 4;
    const hint = this.add.bitmapText(0, y, FONT.small, t('elixirHint')).setMaxWidth(inner.w).setTint(COLORS.textDim);
    scroll.add(hint);
    y += hint.height + 12;
    for (const e of ELIXIRS) {
      const unlocked = s.unlocks.maxDepthReached >= e.unlockDepth;
      const owned = s.elixirs[e.id] ?? 0;
      const active = s.activeElixir === e.id;
      const box = panel(this, 0, y, inner.w, 64, active ? 'ui_panel_ornate' : 'ui_panel_dark');
      scroll.add(box);
      const icon = this.textures.exists(e.icon) ? this.add.image(18, y + 20, e.icon).setDisplaySize(24, 24) : this.add.image(18, y + 20, 'pk_heart');
      scroll.add(icon);
      const name = this.add.bitmapText(36, y + 5, FONT.body, `${tr(e.name)}  x${owned}`).setMaxWidth(inner.w - 46).setTint(unlocked ? COLORS.text : COLORS.textDim);
      const desc = this.add.bitmapText(36, name.y + name.height + 3, FONT.small, unlocked ? tr(e.desc) : t('requiresDepth', { d: e.unlockDepth })).setMaxWidth(inner.w - 46).setTint(COLORS.textDim);
      scroll.add([name, desc]);
      const costTxt = `${e.gold}g, ${e.cost.map(([id, n]) => `${n} ${tr(materialDef(id)!.name)}`).join(', ')}`;
      const cost = this.add.bitmapText(36, desc.y + desc.height + 6, FONT.small, costTxt).setMaxWidth(inner.w - 46).setTint(COLORS.gold);
      scroll.add(cost);
      const actionY = cost.y + cost.height + 24;
      const can = unlocked && s.currency.gold >= e.gold && haveMats(s, e.cost);
      scroll.add(new Button(this, inner.w - 48, actionY, t('brew'), () => {
        if (!can) return;
        s.currency.gold -= e.gold;
        payMats(s, e.cost);
        s.elixirs[e.id] = owned + 1;
        services.audio?.sfx('brew');
        services.save!.markDirty();
        this.scene.restart({ from: this.from });
      }, { w: 86, h: 32, font: FONT.small, disabled: !can }));
      if (owned > 0) {
        scroll.add(new Button(this, inner.w - 144, actionY, active ? t('active') : t('use'), () => {
          s.activeElixir = active ? null : e.id;
          services.save!.markDirty();
          this.scene.restart({ from: this.from });
        }, { w: 86, h: 32, font: FONT.small, style: active ? 'primary' : 'normal' }));
      }
      const h = actionY + 24 - y;
      resizePanel(box, inner.w, h);
      y += h + 10;
    }
    scroll.setContentHeight(y + 10);
  }
}

// ============================================================================ Merchant
interface Stock {
  item: ItemInstance;
  price: number;
}

export class MerchantScene extends OverlayScene {
  private tab: 'buy' | 'sell' | 'seeds' = 'buy';

  constructor() {
    super('Merchant');
  }

  init(d: { from?: string; tab?: 'buy' | 'sell' | 'seeds' }): void {
    super.init(d);
    this.tab = d.tab ?? 'buy';
  }

  private stock(): Stock[] {
    const s = this.save;
    const day = today();
    const key = `pip_bought_${day}`;
    const bought = (s.flags[key] ?? 0) as number;
    const rng = new Rng(`pip:${day}`);
    const depth = Math.max(1, s.unlocks.maxDepthReached);
    const n = 6;
    const out: Stock[] = [];
    for (let i = 0; i < n; i++) {
      const legendary = i === n - 1 && !!s.flags.pip_legendary;
      const rarity = (legendary ? 4 : rng.weighted([[1, 45], [2, 40], [3, 15]] as const)) as Rarity;
      const item = generateItem(rng, { ilvl: depth * 10 + 2, depth, source: 'shop', rarity, uid: `pip${day}_${i}` });
      if ((bought >> i) & 1) continue;
      out.push({ item, price: Math.round(sellValue(item) * 3.2) });
    }
    return out;
  }

  create(): void {
    const inner = this.frame(t('merchantTitle'), 0.94);
    const s = this.save;
    const tabs: ['buy' | 'sell' | 'seeds', string][] = [['buy', t('buy')], ['sell', t('sell')], ['seeds', t('seeds')]];
    const tw = inner.w / 3;
    tabs.forEach(([m, name], i) => {
      const bg = panel(this, inner.x + i * tw + 1, inner.y, tw - 2, 30, m === this.tab ? 'ui_tab_on' : 'ui_tab').setInteractive();
      label(this, inner.x + i * tw + tw / 2, inner.y + 15, name, FONT.small, COLORS.text, 0.5, 0.5);
      bg.on('pointerup', () => this.scene.restart({ from: this.from, tab: m }));
    });
    label(this, inner.x + inner.w, inner.y + 36, `${t('gold')}: ${s.currency.gold}`, FONT.body, COLORS.gold, 1, 0);
    const scroll = new ScrollPanel(this, inner.x, inner.y + 70, inner.w, inner.h - 70);
    let y = 0;
    const row = (it: ItemInstance, price: number, btnLabel: string, onClick: () => void, disabled: boolean) => {
      const bg = panel(this, 0, y, inner.w, 60, 'ui_panel_dark');
      scroll.add(bg);
      scroll.add(itemSlot(this, 22, y + 23, it, 36));
      const name = this.add.bitmapText(46, y + 6, FONT.body, itemName(it)).setMaxWidth(inner.w - 150).setTint(RARITY_COLORS[it.rarity]);
      const desc = this.add.bitmapText(46, Math.max(name.y + name.height + 4, y + 42), FONT.small, `${tr(SLOT_NAMES[baseById(it.baseId)!.slot])} · ${t('gearScore', { n: itemPower(it) })}`).setMaxWidth(inner.w - 54).setTint(COLORS.textDim);
      scroll.add([name, desc]);
      scroll.add(new Button(this, inner.w - 48, y + 23, `${btnLabel} ${price}`, onClick, { w: 88, h: 32, font: FONT.small, disabled }));
      const h = desc.y + desc.height + 8 - y;
      resizePanel(bg, inner.w, h);
      y += h + 10;
    };
    if (this.tab === 'buy') {
      const stock = this.stock();
      if (!stock.length) scroll.add(this.add.bitmapText(0, 0, FONT.body, t('soldOutToday')).setTint(COLORS.textDim));
      stock.forEach((st) => {
        const idx = Number(st.item.uid.split('_')[1]);
        row(st.item, st.price, t('buy'), () => {
          if (s.currency.gold < st.price) return toast(this, t('notEnoughGold'), COLORS.red);
          s.currency.gold -= st.price;
          s.inventory.push({ ...st.item, uid: services.save!.nextUid(), isNew: true });
          const key = `pip_bought_${today()}`;
          s.flags[key] = ((s.flags[key] ?? 0) as number) | (1 << idx);
          bus.emit('purchase', { shop: 'pip', cost: st.price });
          services.audio?.sfx('buy');
          services.save!.markDirty();
          checkProgress();
          this.scene.restart({ from: this.from, tab: 'buy' });
        }, s.currency.gold < st.price);
      });
    } else if (this.tab === 'sell') {
      const eq = new Set(Object.values(s.equipped));
      const items = s.inventory.filter((i) => !eq.has(i.uid) && !i.locked).sort((a, b) => itemPower(a) - itemPower(b));
      if (!items.length) scroll.add(this.add.bitmapText(0, 0, FONT.body, t('nothingHere')).setTint(COLORS.textDim));
      items.forEach((it) => {
        const price = sellValue(it);
        row(it, price, t('sell'), () => {
          s.currency.gold += price;
          s.inventory = s.inventory.filter((i) => i.uid !== it.uid);
          services.audio?.sfx('coin');
          services.save!.markDirty();
          this.scene.restart({ from: this.from, tab: 'sell' });
        }, false);
      });
    } else {
      const seeds = MATERIALS.filter((m) => m.kind === 'seed' && (m.id !== 'seed_golden' || s.unlocks.maxDepthReached >= 4));
      seeds.forEach((m) => {
        const price = m.value * 4;
        const bg = panel(this, 0, y, inner.w, 60, 'ui_panel_dark');
        scroll.add(bg);
        scroll.add(materialIcon(this, 20, y + 20, m.id, 22));
        const name = this.add.bitmapText(40, y + 5, FONT.body, `${tr(m.name)}  x${s.materials[m.id] ?? 0}`).setMaxWidth(inner.w - 144).setTint(COLORS.text);
        const desc = this.add.bitmapText(40, Math.max(name.y + name.height + 4, y + 42), FONT.small, tr(m.desc)).setTint(COLORS.textDim).setMaxWidth(inner.w - 48);
        scroll.add([name, desc]);
        scroll.add(new Button(this, inner.w - 44, y + 20, `${t('buy')} ${price}`, () => {
          if (s.currency.gold < price) return toast(this, t('notEnoughGold'), COLORS.red);
          s.currency.gold -= price;
          s.materials[m.id] = (s.materials[m.id] ?? 0) + 1;
          services.audio?.sfx('buy');
          services.save!.markDirty();
          this.scene.restart({ from: this.from, tab: 'seeds' });
        }, { w: 80, h: 32, font: FONT.small, disabled: s.currency.gold < price }));
        const h = desc.y + desc.height + 8 - y;
        resizePanel(bg, inner.w, h);
        y += h + 10;
      });
    }
    scroll.setContentHeight(y + 10);
  }
}

// ============================================================================ Garden
export class GardenScene extends OverlayScene {
  constructor() {
    super('Garden');
  }

  create(): void {
    const inner = this.frame(t('garden'), 0.8);
    const s = this.save;
    if (s.unlocks.features.includes('garden_plot') && s.garden.length < 4) s.garden.push({ seedId: null, plantedAtRun: 0 });
    const contentStart = this.children.list.length;
    const hint = para(this, inner.x, inner.y, t('gardenHint'), inner.w, FONT.small, COLORS.textDim);
    const runs = s.stats.runs ?? 0;
    let y = hint.y + hint.height + 12;
    s.garden.forEach((plot, i) => {
      const bg = panel(this, inner.x, y, inner.w, 90, 'ui_panel_dark');
      const title = label(this, inner.x + 10, y + 6, `${t('plot')} ${i + 1}`, FONT.head, COLORS.gold);
      let bottom = title.y + title.height + 6;
      if (plot.seedId) {
        const grow = SEED_GROWTH[plot.seedId];
        const left = Math.max(0, grow.runs - (runs - plot.plantedAtRun));
        const name = para(this, inner.x + 10, bottom, tr(materialDef(plot.seedId)!.name), inner.w - 116, FONT.body, COLORS.text);
        const status = para(this, inner.x + 10, name.y + name.height + 3, left > 0 ? t('growsIn', { n: left }) : t('ready'), inner.w - 116, FONT.small, left > 0 ? COLORS.textDim : COLORS.green);
        bottom = status.y + status.height + 10;
        new Button(this, inner.x + inner.w - 50, y + 48, t('harvest'), () => {
          for (const [id, n] of grow.yields) s.materials[id] = (s.materials[id] ?? 0) + n;
          if (grow.bonus === 'embers') s.currency.embers += 100;
          plot.seedId = null;
          s.stats.harvests = (s.stats.harvests ?? 0) + 1;
          for (const q of Object.keys(s.quests)) {
            const st = s.quests[q];
            if (st.status === 'active' && q === 'sq_harvest') st.progress.o0 = (st.progress.o0 ?? 0) + 1;
          }
          services.audio?.sfx('harvest');
          services.save!.markDirty();
          checkProgress();
          this.scene.restart({ from: this.from });
        }, { w: 84, h: 34, style: 'primary', disabled: left > 0 });
      } else {
        const seeds = Object.keys(SEED_PLANT).filter((id) => (s.materials[id] ?? 0) > 0);
        const empty = para(this, inner.x + 10, bottom, seeds.length ? t('empty') : t('noSeeds'), inner.w - 20, FONT.body, COLORS.textDim);
        bottom = empty.y + empty.height + 8;
        const seedW = (inner.w - 30) / 2;
        seeds.slice(0, 3).forEach((id, k) => {
          new Button(this, inner.x + 10 + (k % 2) * (seedW + 10) + seedW / 2, bottom + 18 + Math.floor(k / 2) * 42, tr(materialDef(id)!.name).split(' ')[0], () => {
            s.materials[id] -= 1;
            plot.seedId = id;
            plot.plantedAtRun = runs;
            services.audio?.sfx('plant');
            services.save!.markDirty();
            this.scene.restart({ from: this.from });
          }, { w: seedW, h: 36, font: FONT.small });
        });
        if (seeds.length) bottom += Math.ceil(Math.min(3, seeds.length) / 2) * 42;
      }
      resizePanel(bg, inner.w, bottom - y + 6);
      y = bottom + 16;
    });
    const content = this.children.list.slice(contentStart);
    const scroll = new ScrollPanel(this, inner.x, inner.y, inner.w, inner.h);
    scroll.adopt(content).setContentHeight(y - inner.y);
  }
}
