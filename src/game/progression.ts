import type { SaveData } from '@/data/types';
import { equippedItems } from './RunManager';

/** In-run levelling rules (kept pure so the balance model and tests share them with the game). */

/** Max HP granted by the Lantern's Blessing on levels without a boon. */
export const BLESSING_HP = 6;

/** Boon choices come on even levels (2, 4, 6...); odd levels give the Blessing instead. */
export function boonLevel(level: number): boolean {
  return level % 2 === 0;
}


const GEAR_SLOTS = 7;

/**
 * How geared the hero is for `depth`: average item level of the 7 slots (empty = 0) against the item level that
 * depth drops (~10 per depth). 0 = no gear, 1 = gear that fits the depth, above 1 = over-geared.
 */
export function gearProgress(s: SaveData, depth: number): number {
  const total = equippedItems(s).reduce((a, it) => a + it.ilvl, 0);
  return total / GEAR_SLOTS / (10 * depth + 2);
}

/**
 * Adaptive toughness: monsters are tuned for a hero geared for the depth. A brand-new hero meets softer ones
 * (a fair first run), an over-geared one slightly tougher ones (gear still pays off, but never trivialises a depth).
 */
export function adaptiveToughness(progress: number): { hp: number; atk: number } {
  const p = Math.max(0, progress);
  if (p <= 1) return { hp: 0.45 + 0.55 * p, atk: 0.55 + 0.45 * p };
  const over = Math.min(0.4, p - 1);
  return { hp: 1 + 0.5 * over, atk: 1 + 0.25 * over };
}
