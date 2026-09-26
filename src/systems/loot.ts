import { Rng } from '@/core/rng';
import { getLang, tr } from '@/core/i18n';
import {
  AFFIXES, ITEM_BASES, SETS, UNIQUES, affixById, baseById, setById, uniqueById, type AffixDef, type ItemBase,
} from '@/data/items';
import type { Mod } from '@/data/stats';
import type { EffectRef, ItemInstance, Rarity, Slot } from '@/data/types';
import { modPower } from './stats';

export type LootSource = 'enemy' | 'elite' | 'boss' | 'chest' | 'shop' | 'forge' | 'reward';

export const MAX_PLUS = 15;

export function tierForIlvl(ilvl: number): number {
  return Math.max(1, Math.min(8, 1 + Math.floor((ilvl - 4) / 7)));
}

export function ilvlFor(depth: number, floor: number, rng: Rng): number {
  return Math.max(1, depth * 10 + floor * 2 + rng.int(-2, 3));
}

export function rollRarity(rng: Rng, opts: { luck: number; magicFind: number; depth: number; source: LootSource }): Rarity {
  const mf = 1 + (opts.magicFind + opts.luck * 0.5) / 100;
  const srcMul = opts.source === 'boss' ? 6 : opts.source === 'elite' ? 2.2 : opts.source === 'chest' ? 1.8 : opts.source === 'forge' ? 1.6 : 1;
  const depthMul = 1 + (opts.depth - 1) * 0.25;
  const w: [Rarity, number][] = [
    [0, opts.source === 'boss' ? 0 : 58],
    [1, opts.source === 'boss' ? 0 : 30],
    [2, 9 * mf * srcMul],
    [3, 2.6 * mf * srcMul * depthMul],
    [4, 0.55 * mf * srcMul * depthMul],
    [5, opts.depth >= 4 ? 0.06 * mf * srcMul * depthMul : 0],
  ];
  return rng.weighted(w);
}

function affixCount(rarity: Rarity, rng: Rng): number {
  switch (rarity) {
    case 0: return 0;
    case 1: return rng.int(1, 2);
    case 2: return 3;
    case 3: return 4;
    case 4: return 2;
    case 5: return 3;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function rollAffixValue(a: AffixDef, tier: number, rng: Rng): number {
  const t = (tier - 1) / 7;
  const lo = lerp(a.min[0], a.min[1], t);
  const hi = lerp(a.max[0], a.max[1], t);
  const v = rng.float(lo, hi);
  return hi >= 5 ? Math.round(v) : Math.round(v * 10) / 10;
}

export function affixesForSlot(slot: Slot): AffixDef[] {
  return AFFIXES.filter((a) => a.slots === 'all' || a.slots.includes(slot));
}

function pickBase(rng: Rng, tier: number, slot?: Slot): ItemBase {
  const t = Math.max(1, Math.min(8, tier + rng.weighted([[-1, 2], [0, 6], [1, 1]] as const)));
  const pool = ITEM_BASES.filter((b) => b.tier === t && (!slot || b.slot === slot));
  if (pool.length) return rng.pick(pool);
  return rng.pick(ITEM_BASES.filter((b) => !slot || b.slot === slot));
}

export interface GenOptions {
  ilvl: number;
  depth: number;
  source: LootSource;
  luck?: number;
  magicFind?: number;
  rarity?: Rarity;
  slot?: Slot;
  bossId?: string;
  uid: string;
}

export function generateItem(rng: Rng, o: GenOptions): ItemInstance {
  let rarity = o.rarity ?? rollRarity(rng, { luck: o.luck ?? 0, magicFind: o.magicFind ?? 0, depth: o.depth, source: o.source });
  const tier = tierForIlvl(o.ilvl);
  let base = pickBase(rng, tier, o.slot);
  let uniqueId: string | undefined;
  let setId: string | undefined;

  if (rarity >= 4) {
    const pool = UNIQUES.filter((u) =>
      u.minDepth <= o.depth &&
      (rarity === 5 ? u.mythic : !u.mythic) &&
      (!u.bossOnly || u.bossOnly === o.bossId) &&
      (!o.slot || baseById(u.baseId)?.slot === o.slot));
    const bossPool = pool.filter((u) => u.bossOnly && u.bossOnly === o.bossId);
    const chosen = bossPool.length && rng.chance(0.6) ? rng.pick(bossPool) : pool.length ? rng.pick(pool) : undefined;
    if (chosen) {
      uniqueId = chosen.id;
      base = baseById(chosen.baseId) ?? base;
    } else rarity = 3;
  }
  if (rarity === 3 && !uniqueId && rng.chance(0.28)) {
    const sets = SETS.filter((s) => s.minDepth <= o.depth);
    const candidates = sets.flatMap((s) => s.pieces.filter((p) => !o.slot || baseById(p.baseId)?.slot === o.slot).map((p) => ({ s, p })));
    if (candidates.length) {
      const c = rng.pick(candidates);
      setId = c.s.id;
      base = baseById(c.p.baseId) ?? base;
    }
  }

  const n = setId ? 2 : affixCount(rarity, rng);
  const pool = affixesForSlot(base.slot);
  const chosen: AffixDef[] = [];
  const available = pool.slice();
  for (let i = 0; i < n && available.length; i++) {
    const a = rng.weighted(available.map((x) => [x, x.weight] as const));
    chosen.push(a);
    available.splice(available.indexOf(a), 1);
  }
  const affixTier = Math.max(tier, base.tier);
  return {
    uid: o.uid,
    baseId: base.id,
    rarity,
    ilvl: o.ilvl,
    plus: 0,
    affixes: chosen.map((a) => ({ id: a.id, value: rollAffixValue(a, affixTier, rng) })),
    uniqueId,
    setId,
    isNew: true,
  };
}

/** Upgrades scale implicit and affix values by 8% per level. */
export function upgradeMult(plus: number): number {
  return 1 + plus * 0.08;
}

export function itemMods(item: ItemInstance): Mod[] {
  const base = baseById(item.baseId);
  if (!base) return [];
  const mul = upgradeMult(item.plus);
  const out: Mod[] = base.implicit.map((m) => ({ ...m, value: round1(m.value * mul) }));
  for (const a of item.affixes) {
    const def = affixById(a.id);
    if (def) out.push({ stat: def.stat, type: def.type, value: round1(a.value * mul) });
  }
  const u = item.uniqueId ? uniqueById(item.uniqueId) : undefined;
  if (u) out.push(...u.mods.map((m) => ({ ...m, value: round1(m.value * (m.type === 'more' ? 1 : mul)) })));
  return out;
}

export function itemEffects(item: ItemInstance): EffectRef[] {
  const u = item.uniqueId ? uniqueById(item.uniqueId) : undefined;
  return u ? u.effects : [];
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function itemName(item: ItemInstance): string {
  const base = baseById(item.baseId);
  if (!base) return '???';
  if (item.uniqueId) return tr(uniqueById(item.uniqueId)!.name);
  if (item.setId) {
    const piece = setById(item.setId)?.pieces.find((p) => p.baseId === item.baseId);
    if (piece) return tr(piece.name);
  }
  let name = tr(base.name);
  if (item.rarity >= 1 && item.affixes.length) {
    const defs = item.affixes.map((a) => affixById(a.id));
    const pre = defs.find((a) => a?.kind === 'prefix');
    const suf = item.rarity >= 2 ? defs.find((a) => a?.kind === 'suffix') : undefined;
    const en = getLang() === 'en';
    if (pre) name = en ? `${tr(pre.name)} ${name}` : `${name} ${tr(pre.name)}`;
    if (suf) name = `${name} ${tr(suf.name)}`;
  }
  return item.plus > 0 ? `${name} +${item.plus}` : name;
}

export function itemPower(item: ItemInstance): number {
  const p = itemMods(item).reduce((s, m) => s + modPower(m), 0);
  const bonus = item.uniqueId ? 30 : item.setId ? 12 : 0;
  return Math.max(1, Math.round(p + bonus + item.rarity * 4));
}

export function sellValue(item: ItemInstance): number {
  return Math.round((6 + item.ilvl * 1.2) * [1, 1.8, 3.2, 6, 12, 25][item.rarity] * (1 + item.plus * 0.15));
}

export function salvageYield(item: ItemInstance): [string, number][] {
  const out: [string, number][] = [['iron_ore', 1 + Math.floor(item.ilvl / 12)]];
  if (item.rarity >= 1) out.push(['arcane_dust', item.rarity]);
  if (item.rarity >= 2) out.push(['rare_shard', item.rarity >= 3 ? 2 : 1]);
  if (item.rarity >= 3) out.push(['epic_core', 1]);
  if (item.rarity >= 4) out.push(['legend_ash', item.rarity === 5 ? 3 : 1]);
  return out;
}

/** Cost to go from +plus to +plus+1. */
export function upgradeCost(item: ItemInstance): { gold: number; mats: [string, number][] } {
  const p = item.plus;
  const gold = Math.round((20 + item.ilvl * 3) * (1 + p * 0.45) * (1 + item.rarity * 0.25));
  const mats: [string, number][] = [['iron_ore', 2 + p]];
  if (p >= 3) mats.push(['arcane_dust', 1 + Math.floor(p / 2)]);
  if (p >= 7) mats.push(['rare_shard', 1 + Math.floor((p - 6) / 2)]);
  if (p >= 11) mats.push(['epic_core', 1 + Math.floor((p - 10) / 2)]);
  if (p >= 13) mats.push(['moonsteel', 1]);
  return { gold, mats };
}

export function upgradeSuccessChance(plus: number): number {
  if (plus < 5) return 1;
  if (plus < 9) return 0.85;
  if (plus < 12) return 0.65;
  return 0.45;
}

/** Aggregate equipped gear into RunContext sources, including set bonuses. */
export function gearSources(equipped: ItemInstance[]): { mods: Mod[]; effects: EffectRef[] }[] {
  const out = equipped.map((it) => ({ mods: itemMods(it), effects: itemEffects(it) }));
  const counts = new Map<string, number>();
  for (const it of equipped) if (it.setId) counts.set(it.setId, (counts.get(it.setId) ?? 0) + 1);
  for (const [id, n] of counts) {
    const s = setById(id);
    if (!s) continue;
    if (n >= 2) out.push({ mods: s.bonus2.mods, effects: s.bonus2.effects });
    if (n >= 4) out.push({ mods: s.bonus4.mods, effects: s.bonus4.effects });
  }
  return out;
}

export function compareItems(a: ItemInstance | undefined, b: ItemInstance): number {
  return itemPower(b) - (a ? itemPower(a) : 0);
}
