import Phaser from 'phaser';
import { COLORS, FONT, RARITY_COLORS } from './theme';
import { panel } from './widgets';
import { t, tr } from '@/core/i18n';
import { RARITY_NAMES, SLOT_NAMES, baseById, setById, uniqueById, affixById } from '@/data/items';
import type { ItemInstance } from '@/data/types';
import { itemName, itemPower, upgradeMult } from '@/systems/loot';
import { formatMod } from '@/systems/stats';
import { materialDef } from '@/data/materials';
import { nine } from './skin';

const SLOT_FALLBACK_TINT: Record<string, number> = {
  weapon: 0xd0d8e0, helm: 0xb0b8c8, armor: 0x9aa4b8, boots: 0xa08060, ring: 0xf2c14e, amulet: 0xff9ad0, charm: 0x8fdc4a,
};

export function itemIconKey(it: ItemInstance): string {
  if (it.uniqueId) return `icons_unique_${it.uniqueId}`;
  return baseById(it.baseId)?.icon ?? '';
}

/** Item icon inside a rarity-coloured slot frame. */
export function itemSlot(
  scene: Phaser.Scene, x: number, y: number, it: ItemInstance | null, size = 36, slotName?: string, ghostIcon?: string,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const bg = nine(scene, 0, 0, 'ui_slot', size, size);
  c.add(bg);
  if (!it) {
    // Empty equipment slot: a dark silhouette of the slot's item type reads better than a clipped word.
    if (ghostIcon && scene.textures.exists(ghostIcon)) {
      c.add(scene.add.image(0, 0, ghostIcon).setDisplaySize(size - 10, size - 10).setTintFill(COLORS.border).setAlpha(0.55));
    } else if (slotName) c.add(scene.add.bitmapText(0, 0, FONT.small, slotName).setOrigin(0.5).setTint(COLORS.border));
    return c;
  }
  const color = RARITY_COLORS[it.rarity];
  if (it.rarity >= 1) {
    const glow = scene.add.rectangle(0, 0, size - 6, size - 6, color, it.rarity >= 4 ? 0.28 : 0.14);
    c.add(glow);
  }
  const border = scene.add.rectangle(0, 0, size - 2, size - 2).setStrokeStyle(1, color, it.rarity >= 1 ? 0.95 : 0.4);
  c.add(border);
  const key = itemIconKey(it);
  const base = baseById(it.baseId);
  if (key && scene.textures.exists(key)) c.add(scene.add.image(0, 0, key).setDisplaySize(size - 8, size - 8));
  else c.add(scene.add.image(0, 0, 'pk_gem').setTint(SLOT_FALLBACK_TINT[base?.slot ?? 'ring']).setScale(size / 14));
  if (it.plus > 0) c.add(scene.add.bitmapText(size / 2 - 3, size / 2 - 2, FONT.small, `+${it.plus}`).setOrigin(1, 1).setTint(COLORS.cyan));
  if (it.locked) c.add(scene.add.bitmapText(-size / 2 + 3, -size / 2 + 2, FONT.small, 'L').setTint(COLORS.gold));
  if (it.isNew) c.add(scene.add.circle(size / 2 - 4, -size / 2 + 4, 2.5, COLORS.red));
  if (it.setId) c.add(scene.add.bitmapText(-size / 2 + 3, size / 2 - 2, FONT.small, 'S').setOrigin(0, 1).setTint(COLORS.green));
  return c;
}

export function materialIcon(scene: Phaser.Scene, x: number, y: number, id: string, size = 18): Phaser.GameObjects.Image {
  const def = materialDef(id);
  const key = def?.icon ?? '';
  if (key && scene.textures.exists(key)) return scene.add.image(x, y, key).setDisplaySize(size, size);
  return scene.add.image(x, y, 'pk_gem').setScale(size / 10);
}

/** Detailed item card with optional comparison against the currently equipped item in the same slot. */
export function itemCard(scene: Phaser.Scene, x: number, y: number, w: number, it: ItemInstance, compare?: ItemInstance | null, equippedSetCount = 0): { container: Phaser.GameObjects.Container; height: number } {
  const c = scene.add.container(x, y);
  const base = baseById(it.baseId)!;
  const color = RARITY_COLORS[it.rarity];
  const lines: Phaser.GameObjects.GameObject[] = [];
  let cy = 8;
  const add = (o: Phaser.GameObjects.BitmapText | Phaser.GameObjects.Image | Phaser.GameObjects.Container, h: number) => {
    lines.push(o);
    cy += h;
  };
  const icon = itemSlot(scene, 26, 26, it, 40);
  lines.push(icon);
  const name = scene.add.bitmapText(52, cy, FONT.head, itemName(it)).setTint(color).setMaxWidth(w - 60);
  lines.push(name);
  cy += Math.max(name.height, 16) + 2;
  lines.push(scene.add.bitmapText(52, cy, FONT.small, `${tr(RARITY_NAMES[it.rarity])} ${tr(SLOT_NAMES[base.slot])} · iLv ${it.ilvl}`).setTint(COLORS.textDim));
  cy += 12;
  const power = itemPower(it);
  const diff = compare ? power - itemPower(compare) : 0;
  const pw = scene.add.bitmapText(52, cy, FONT.small, t('gearScore', { n: power })).setTint(COLORS.text);
  lines.push(pw);
  if (compare) {
    lines.push(scene.add.bitmapText(52 + pw.width + 6, cy, FONT.small, diff === 0 ? '=' : `${diff > 0 ? '+' : ''}${diff}`).setTint(diff > 0 ? COLORS.green : diff < 0 ? COLORS.red : COLORS.textDim));
  }
  cy = Math.max(cy + 16, 56);
  const mul = upgradeMult(it.plus);
  for (const m of base.implicit) add(scene.add.bitmapText(10, cy, FONT.small, formatMod({ ...m, value: Math.round(m.value * mul * 10) / 10 })).setTint(0xd8d4e6), 11);
  if (it.affixes.length) cy += 3;
  for (const a of it.affixes) {
    const def = affixById(a.id);
    if (!def) continue;
    add(scene.add.bitmapText(10, cy, FONT.small, formatMod({ stat: def.stat, type: def.type, value: Math.round(a.value * mul * 10) / 10 })).setTint(COLORS.blue), 11);
  }
  const u = it.uniqueId ? uniqueById(it.uniqueId) : undefined;
  if (u) {
    cy += 3;
    for (const m of u.mods) add(scene.add.bitmapText(10, cy, FONT.small, formatMod(m)).setTint(COLORS.orange), 11);
    const pwr = scene.add.bitmapText(10, cy + 2, FONT.small, tr(u.power)).setMaxWidth(w - 20).setTint(0xffd9a0);
    add(pwr, pwr.height + 4);
    const fl = scene.add.bitmapText(10, cy, FONT.small, `"${tr(u.flavor)}"`).setMaxWidth(w - 20).setTint(COLORS.textDim);
    add(fl, fl.height + 2);
  }
  const set = it.setId ? setById(it.setId) : undefined;
  if (set) {
    cy += 3;
    add(scene.add.bitmapText(10, cy, FONT.small, `${tr(set.name)} (${equippedSetCount}/4)`).setTint(COLORS.green), 11);
    const b2 = scene.add.bitmapText(14, cy, FONT.small, `(2) ${tr(set.bonus2.desc)}`).setMaxWidth(w - 24).setTint(equippedSetCount >= 2 ? COLORS.green : COLORS.textDim);
    add(b2, b2.height + 1);
    const b4 = scene.add.bitmapText(14, cy, FONT.small, `(4) ${tr(set.bonus4.desc)}`).setMaxWidth(w - 24).setTint(equippedSetCount >= 4 ? COLORS.green : COLORS.textDim);
    add(b4, b4.height + 1);
  }
  const height = cy + 8;
  const bg = panel(scene, 0, 0, w, height, it.rarity >= 4 ? 'ui_panel_ornate' : 'ui_panel');
  c.add(bg);
  c.add(lines);
  return { container: c, height };
}
