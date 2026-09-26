import { describe, expect, it } from 'vitest';
import { Rng } from '@/core/rng';
import { generateItem, itemMods, itemName, itemPower, rollRarity, salvageYield, tierForIlvl, gearSources, upgradeCost } from '@/systems/loot';
import { baseById, ITEM_BASES, UNIQUES, SETS, AFFIXES } from '@/data/items';
import { computeStats } from '@/systems/stats';
import type { ItemInstance } from '@/data/types';

describe('item data', () => {
  it('has 96 unique bases with icons and implicit mods', () => {
    expect(ITEM_BASES.length).toBe(96);
    expect(new Set(ITEM_BASES.map((b) => b.id)).size).toBe(96);
    for (const b of ITEM_BASES) expect(b.implicit.length).toBeGreaterThan(0);
  });
  it('uniques and set pieces reference existing bases', () => {
    for (const u of UNIQUES) expect(baseById(u.baseId), u.id).toBeTruthy();
    for (const s of SETS) for (const p of s.pieces) expect(baseById(p.baseId), s.id).toBeTruthy();
  });
  it('affix ids are unique', () => {
    expect(new Set(AFFIXES.map((a) => a.id)).size).toBe(AFFIXES.length);
  });
});

describe('generateItem', () => {
  it('respects forced rarity and slot', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 200; i++) {
      const it = generateItem(rng, { ilvl: 20, depth: 2, source: 'enemy', rarity: 2, slot: 'ring', uid: 'x' + i });
      expect(baseById(it.baseId)!.slot).toBe('ring');
      if (!it.setId) expect(it.affixes.length).toBe(3);
    }
  });

  it('never repeats an affix on the same item', () => {
    const rng = new Rng(2);
    for (let i = 0; i < 500; i++) {
      const it = generateItem(rng, { ilvl: 30, depth: 3, source: 'chest', uid: 'u' + i });
      const ids = it.affixes.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('legendaries become uniques and boss-only uniques only drop from their boss', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 300; i++) {
      const it = generateItem(rng, { ilvl: 50, depth: 5, source: 'boss', rarity: 4, uid: 'l' + i });
      if (it.uniqueId) {
        const u = UNIQUES.find((x) => x.id === it.uniqueId)!;
        expect(u.bossOnly).toBeUndefined();
        expect(it.baseId).toBe(u.baseId);
      }
    }
  });

  it('item mods feed stat computation', () => {
    const it = generateItem(new Rng(5), { ilvl: 12, depth: 1, source: 'enemy', rarity: 0, slot: 'weapon', uid: 'w' });
    const s = computeStats(itemMods(it));
    expect(s.atk).toBeGreaterThan(10);
    expect(itemPower(it)).toBeGreaterThan(0);
    expect(itemName(it).length).toBeGreaterThan(2);
  });

  it('upgrades increase power', () => {
    const it = generateItem(new Rng(6), { ilvl: 25, depth: 2, source: 'enemy', rarity: 2, uid: 'p' });
    const up: ItemInstance = { ...it, plus: 5 };
    expect(itemPower(up)).toBeGreaterThan(itemPower(it));
    expect(upgradeCost(up).gold).toBeGreaterThan(upgradeCost(it).gold);
  });
});

describe('rarity', () => {
  it('bosses never drop common or magic items', () => {
    const rng = new Rng(8);
    for (let i = 0; i < 500; i++) expect(rollRarity(rng, { luck: 0, magicFind: 0, depth: 1, source: 'boss' })).toBeGreaterThanOrEqual(2);
  });
  it('magic find shifts distribution upward', () => {
    const avg = (mf: number) => {
      const rng = new Rng(9);
      let s = 0;
      for (let i = 0; i < 4000; i++) s += rollRarity(rng, { luck: 0, magicFind: mf, depth: 3, source: 'enemy' });
      return s / 4000;
    };
    expect(avg(200)).toBeGreaterThan(avg(0));
  });
  it('tier mapping covers 1..8', () => {
    expect(tierForIlvl(1)).toBe(1);
    expect(tierForIlvl(60)).toBe(8);
  });
});

describe('sets and salvage', () => {
  it('grants 2 and 4 piece bonuses', () => {
    const s = SETS[0];
    const items: ItemInstance[] = s.pieces.map((p, i) => ({ uid: 's' + i, baseId: p.baseId, rarity: 3, ilvl: 10, plus: 0, affixes: [], setId: s.id }));
    const two = gearSources(items.slice(0, 2));
    const four = gearSources(items);
    expect(four.length).toBe(two.length + 2 + 1);
  });
  it('salvage returns materials scaled by rarity', () => {
    const base: ItemInstance = { uid: 'a', baseId: 'sword_1', rarity: 0, ilvl: 5, plus: 0, affixes: [] };
    expect(salvageYield(base).length).toBe(1);
    expect(salvageYield({ ...base, rarity: 4 }).length).toBe(5);
  });
});
