import { baseStats, STAT_KEYS, STATS, type Mod, type StatBlock, type StatKey } from '@/data/stats';
import { tr } from '@/core/i18n';

/**
 * Stacking rule: final = (base + Σflat) × (1 + Σpct/100) × Π(1 + more/100), then clamped.
 * 'pct' on a percentage stat (e.g. critChance) is treated as flat points, which is what players expect
 * ("+5% crit chance" means 5 → 10, not 5 → 5.25).
 */
export function computeStats(mods: readonly Mod[], overrides: Partial<StatBlock> = {}): StatBlock {
  const base = { ...baseStats(), ...overrides };
  const flat = {} as Record<StatKey, number>;
  const pct = {} as Record<StatKey, number>;
  const more = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) {
    flat[k] = 0;
    pct[k] = 0;
    more[k] = 1;
  }
  for (const m of mods) {
    if (m.type === 'flat') flat[m.stat] += m.value;
    else if (m.type === 'pct') {
      if (STATS[m.stat].fmt === 'pct') flat[m.stat] += m.value;
      else pct[m.stat] += m.value;
    } else more[m.stat] *= 1 + m.value / 100;
  }
  const out = {} as StatBlock;
  for (const k of STAT_KEYS) {
    let v = (base[k] + flat[k]) * (1 + pct[k] / 100) * more[k];
    const def = STATS[k];
    if (def.min !== undefined) v = Math.max(def.min, v);
    if (def.max !== undefined) v = Math.min(def.max, v);
    out[k] = v;
  }
  out.maxHp = Math.round(out.maxHp);
  out.dashCharges = Math.floor(out.dashCharges);
  out.extraProjectiles = Math.floor(out.extraProjectiles);
  return out;
}

export function formatStatValue(stat: StatKey, value: number): string {
  const def = STATS[stat];
  if (def.fmt === 'pct') return `${round1(value)}%`;
  if (def.fmt === 'dec') return `${round1(value)}`;
  return `${Math.round(value)}`;
}

/** "+12% Attack", "+30 Max HP", "+5% Crit Chance" */
export function formatMod(m: Mod): string {
  const def = STATS[m.stat];
  const sign = m.value >= 0 ? '+' : '';
  const name = tr(def.name);
  if (m.type === 'more') return `${sign}${round1(m.value)}% ${name} (x)`;
  if (m.type === 'pct' || def.fmt === 'pct') return `${sign}${round1(m.value)}% ${name}`;
  return `${sign}${round1(m.value)} ${name}`;
}

function round1(v: number): string {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Rough single-number power rating used for item comparison arrows and gear score. */
export function modPower(m: Mod): number {
  const weights: Partial<Record<StatKey, number>> = {
    maxHp: 0.25, atk: 2.2, def: 1.2, critChance: 2, critDmg: 0.7, atkSpeed: 1.6, moveSpeed: 1, lifesteal: 3,
    cdr: 1.5, regen: 6, dodge: 2, dmgReduction: 2.5, luck: 1, goldFind: 0.3, magicFind: 0.4, skillDmg: 0.8,
  };
  const w = weights[m.stat] ?? 0.6;
  const typeMul = m.type === 'more' ? 1.6 : m.type === 'pct' && STATS[m.stat].fmt !== 'pct' ? 1.3 : 1;
  return m.value * w * typeMul;
}
