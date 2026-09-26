/**
 * Endless Depths: after the fifth depth the run keeps going through the regions again. Every region is lifted to
 * final-depth strength (its monsters and guardian are normalised against the Hollow Throne and Malachar), then grows
 * a little more with each extra depth until the hero falls.
 */
import { Rng, hashString } from '@/core/rng';
import { ALL_BIOMES, BIOMES, type BiomeDef } from '@/data/biomes';
import { ENEMIES } from '@/data/enemies';
import { BOSSES, type BossDef } from '@/data/bosses';

export const FINAL_DEPTH = 5;
/** The Endless goal: every 10th depth pays a milestone reward, the 100th is the summit. */
export const ENDLESS_GOAL = 100;

/** Milestone reward for reaching an endless depth (none between milestones). */
export function endlessMilestone(depth: number): { embers: number; shards: number } | null {
  if (!isEndlessDepth(depth) || depth % 10 !== 0) return null;
  const tier = depth / 10;
  return { embers: 150 * tier, shards: tier };
}

/** Extra strength per depth beyond the fifth (on top of the normal depth scaling). */
const HP_PER_DEPTH = 0.1;
const ATK_PER_DEPTH = 0.06;

export interface Mult {
  hp: number;
  atk: number;
}

export function isEndlessDepth(depth: number): boolean {
  return depth > FINAL_DEPTH;
}

function avg(biome: BiomeDef, k: 'hp' | 'atk'): number {
  const list = biome.enemies.map((id) => ENEMIES[id]).filter(Boolean);
  return list.reduce((a, e) => a + e[k], 0) / Math.max(1, list.length);
}

/** Region for an endless depth: seeded by the run, never the same region twice in a row. */
export function endlessRegion(seed: number, depth: number, previous?: string): string {
  const rng = new Rng(hashString(`${seed}:endless:${depth}`));
  const pool = ALL_BIOMES.filter((b) => b.id !== previous);
  return rng.pick(pool).id;
}

/** Multiplier for regular monsters of `biome` at `depth` (1 before the endless depths). */
export function endlessEnemyMult(depth: number, biome: BiomeDef): Mult {
  if (!isEndlessDepth(depth)) return { hp: 1, atk: 1 };
  const ref = BIOMES[FINAL_DEPTH - 1];
  const extra = depth - FINAL_DEPTH;
  return {
    hp: (avg(ref, 'hp') / avg(biome, 'hp')) * (1 + HP_PER_DEPTH * extra),
    atk: (avg(ref, 'atk') / avg(biome, 'atk')) * (1 + ATK_PER_DEPTH * extra),
  };
}

/** Multiplier for a region guardian at an endless depth, lifted to the final boss's strength first. */
export function endlessBossMult(depth: number, boss: BossDef): Mult {
  if (!isEndlessDepth(depth)) return { hp: 1, atk: 1 };
  const final = BOSSES.malachar;
  const extra = depth - FINAL_DEPTH;
  return {
    hp: (final.hp / boss.hp) * (1 + 2 * HP_PER_DEPTH * extra),
    atk: (final.atk / boss.atk) * (1 + ATK_PER_DEPTH * extra),
  };
}
