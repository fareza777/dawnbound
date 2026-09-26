/**
 * Headless balance model: builds a plausible hero for every depth/floor with the game's own systems (loot, boons,
 * buildContext) and estimates time-to-kill (TTK) and time-to-die (TTD) against that step's monsters and boss using
 * the real damage formulas. It ignores dodging, skills and procs, so absolute numbers are rough; what matters is
 * the curve: a step whose numbers jump compared to its neighbours is a difficulty spike.
 */
import { services } from '@/core/services';
import { SaveManager } from '@/core/save';
import { Rng } from '@/core/rng';
import { RunManager, buildContext, MAX_DEPTH } from '@/game/RunManager';
import { FLOORS_PER_DEPTH } from '@/systems/floorgen';
import { generateItem, ilvlFor } from '@/systems/loot';
import { mitigateOnHero, xpForLevel } from '@/systems/combat';
import { dpsOf, powerScore, SWING } from '@/systems/power';
import { adaptiveToughness, boonLevel, gearProgress } from '@/game/progression';
import { ENEMIES, enemyScaling } from '@/data/enemies';
import { BIOMES, biomeForDepth } from '@/data/biomes';
import { endlessBossMult, endlessEnemyMult, endlessRegion, isEndlessDepth } from '@/game/endless';
import { BIOME_BOSS, BOSSES, bossScaling } from '@/data/bosses';
import type { Rarity, Slot } from '@/data/types';

const SLOTS: Slot[] = ['weapon', 'helm', 'armor', 'boots', 'ring', 'amulet', 'charm'];
/** Assumed enemy pressure: hits per second landed by each engaged enemy, and how many engage at once. */
const ENEMY_HIT_RATE = 0.45;
const ENGAGED = 2;
const BOSS_HIT_RATE = 0.6;
/** Rough room economy per floor, used to estimate level-ups (boons). */
const COMBAT_ROOMS_PER_FLOOR = 5;
const ENEMIES_PER_ROOM = 14;

export interface StepReport {
  hero: string;
  depth: number;
  floor: number;
  level: number;
  boons: number;
  atk: number;
  maxHp: number;
  /** Seconds to kill an average monster of this step. */
  ttk: number;
  /** Basic hits to kill an average monster (single target, no procs). */
  hits: number;
  /** Seconds for two engaged monsters to kill the hero. */
  ttd: number;
  bossTtk?: number;
  bossTtd?: number;
}

export interface Profile {
  /** Gear rarity carried into the run (0 = none: a brand-new player). */
  gearRarity: Rarity | null;
  /** Simulate an Endless run down to this depth (default: the normal five depths). */
  maxDepth?: number;
  /** 'greedy' = always take the offered boon that raises power the most (how a skilled player drafts). */
  pick?: 'first' | 'greedy';
}


const dps = dpsOf;

/** Simulate one hero through every depth/floor, gaining XP, boons and depth-appropriate gear as a player would. */
export function simulateHero(heroId: string, profile: Profile, seed = 1): StepReport[] {
  const saveMgr = new SaveManager(null);
  services.save = saveMgr;
  const s = saveMgr.data;
  const rng = new Rng(seed);
  const lastDepth = profile.maxDepth ?? MAX_DEPTH;
  const run = RunManager.start({ heroId, seed, endless: lastDepth > MAX_DEPTH });
  run.mutator = undefined; // the model measures the base game, not this week's rule
  let xp = 0;
  let level = 1;
  const out: StepReport[] = [];

  for (let depth = 1; depth <= lastDepth; depth++) {
    if (isEndlessDepth(depth)) run.regions = { ...(run.regions ?? {}), [String(depth)]: endlessRegion(seed, depth, run.regions?.[String(depth - 1)]) };
    const biome = isEndlessDepth(depth) ? biomeForDepth(depth, run.regions) : BIOMES[depth - 1];
    const end = endlessEnemyMult(depth, biome);
    const pool = biome.enemies.map((id) => ENEMIES[id]).filter(Boolean);
    const avg = (k: 'hp' | 'atk' | 'def' | 'xp') => pool.reduce((a, e) => a + e[k], 0) / pool.length;
    for (let floor = 1; floor <= FLOORS_PER_DEPTH; floor++) {
      // Gear the player plausibly wears here (found or forged at this depth).
      if (profile.gearRarity !== null) {
        s.inventory = [];
        s.equipped = {};
        for (const slot of SLOTS) {
          const it = generateItem(rng, { ilvl: ilvlFor(depth, floor, rng), depth, source: 'enemy', rarity: profile.gearRarity, slot, uid: `${slot}${depth}${floor}` });
          s.inventory.push(it);
          s.equipped[slot] = it.uid;
        }
      }
      // XP from the floor's fights → level-ups → boons (plus one shrine/orb boon per floor).
      xp += avg('xp') * ENEMIES_PER_ROOM * COMBAT_ROOMS_PER_FLOOR;
      // One boon per floor from shrines/orbs, plus one for every boon level (every second level) reached.
      let gained = 1;
      while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level++;
        if (boonLevel(level)) gained++;
      }
      for (let i = 0; i < gained; i++) {
        const offers = RunManager.boonOffers(run, 3, undefined, rng);
        let choice = offers[0];
        if (profile.pick === 'greedy' && offers.length > 1) {
          let best = -1;
          for (const o of offers) {
            const saved = run.boons.map((b) => ({ ...b }));
            RunManager.addBoon(run, o.def.id);
            const score = powerScore(buildContext(s, run, heroId).stats);
            run.boons = saved;
            if (score > best) {
              best = score;
              choice = o;
            }
          }
        }
        if (choice) RunManager.addBoon(run, choice.def.id);
      }
      run.depth = depth;
      run.floor = floor;
      const st = buildContext(s, run, heroId).stats;
      const base = enemyScaling(depth, floor);
      const ad = adaptiveToughness(gearProgress(s, Math.min(depth, MAX_DEPTH)));
      const sc = { hp: base.hp * end.hp * ad.hp, atk: base.atk * end.atk * ad.atk };
      const hitVs = (def: number) => dps(st.atk, st.atkSpeed, st.critChance, st.critDmg, def);
      const taken = (1 - Math.min(0.5, st.dodge / 100)) * (1 - Math.min(0.75, st.dmgReduction / 100));
      const enemyHit = mitigateOnHero(avg('atk') * sc.atk, st.def, depth) * taken;
      const step: StepReport = {
        hero: heroId, depth, floor, level, boons: run.boons.length, atk: Math.round(st.atk), maxHp: Math.round(st.maxHp),
        ttk: (avg('hp') * sc.hp) / hitVs(avg('def')),
        hits: (avg('hp') * sc.hp) / hitVs(avg('def')) / (SWING / (st.atkSpeed / 100)),
        ttd: st.maxHp / (enemyHit * ENEMY_HIT_RATE * ENGAGED),
      };
      if (floor === FLOORS_PER_DEPTH) {
        const boss = BOSSES[BIOME_BOSS[biome.boss] ?? biome.boss];
        const partner = boss.partner ? BOSSES[boss.partner] : undefined;
        const pairK = partner && isEndlessDepth(depth) ? 0.55 : 1;
        const bs = bossScaling(depth);
        const bm = endlessBossMult(depth, boss);
        bm.hp *= bs.hp * ad.hp;
        bm.atk *= bs.atk * ad.atk;
        const pm = partner ? endlessBossMult(depth, partner) : { hp: 1, atk: 1 };
        pm.hp *= bs.hp * ad.hp;
        const bossHp = boss.hp * bm.hp * pairK + (partner ? partner.hp * pm.hp * pairK : 0);
        const bossHit = mitigateOnHero(boss.atk * bm.atk, st.def, depth) * taken;
        step.bossTtk = bossHp / (hitVs(boss.def) * (1 + st.bossDmg / 100));
        step.bossTtd = st.maxHp / (bossHit * BOSS_HIT_RATE * (partner ? 1.6 : 1));
      }
      out.push(step);
    }
  }
  return out;
}

/** Average several simulated runs (different loot and boon rolls) so single lucky or unlucky drops don't dominate. */
export function simulateAverage(heroId: string, profile: Profile, runs = 12): StepReport[] {
  const all = Array.from({ length: runs }, (_, i) => simulateHero(heroId, profile, i + 1));
  return all[0].map((first, k) => {
    const mean = (f: (r: StepReport) => number | undefined): number | undefined => {
      const v = all.map((r) => f(r[k])).filter((x): x is number => x !== undefined);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
    };
    return {
      ...first,
      level: Math.round(mean((r) => r.level)!), boons: Math.round(mean((r) => r.boons)!),
      atk: Math.round(mean((r) => r.atk)!), maxHp: Math.round(mean((r) => r.maxHp)!),
      ttk: mean((r) => r.ttk)!, hits: mean((r) => r.hits)!, ttd: mean((r) => r.ttd)!, bossTtk: mean((r) => r.bossTtk), bossTtd: mean((r) => r.bossTtd),
    };
  });
}

export interface Spike {
  hero: string;
  at: string;
  reason: string;
}

/** Steps whose difficulty jumps against the previous step, or boss fights that are a slog or near-instant death. */
export function findSpikes(steps: StepReport[]): Spike[] {
  const spikes: Spike[] = [];
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1];
    const b = steps[i];
    const at = `${b.depth}-${b.floor}`;
    if (b.ttk / a.ttk > 1.6) spikes.push({ hero: b.hero, at, reason: `monsters take ${(b.ttk / a.ttk).toFixed(1)}x longer to kill` });
    if (a.ttd / b.ttd > 1.6) spikes.push({ hero: b.hero, at, reason: `monsters kill ${(a.ttd / b.ttd).toFixed(1)}x faster` });
  }
  for (const b of steps) {
    if (b.bossTtk === undefined || b.bossTtd === undefined) continue;
    const at = `${b.depth}-boss`;
    if (b.bossTtk > 120) spikes.push({ hero: b.hero, at, reason: `boss takes ${Math.round(b.bossTtk)}s to kill` });
    if (b.bossTtd < 12) spikes.push({ hero: b.hero, at, reason: `boss kills in ${b.bossTtd.toFixed(1)}s of hits` });
  }
  return spikes;
}
