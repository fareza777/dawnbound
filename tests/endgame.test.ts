import { beforeEach, describe, expect, it } from 'vitest';
import { services } from '@/core/services';
import { SaveManager } from '@/core/save';
import { RunManager } from '@/game/RunManager';
import { MUTATORS, MUTATOR_EMBER_BONUS, weekIndex, weeklyMutator } from '@/data/mutators';
import { endlessBossMult, endlessEnemyMult, isEndlessDepth } from '@/game/endless';
import { BIOMES } from '@/data/biomes';
import { BOSSES } from '@/data/bosses';
import { BOONS, boonDef } from '@/data/boons';
import { duoUnlockedBy } from '@/game/synergy';
import { findSpikes, simulateAverage } from '@/sim/balance';

beforeEach(() => {
  services.save = new SaveManager(null);
});

const DAY = 24 * 3600 * 1000;

describe('weekly mutators', () => {
  it('stays the same within a week and changes the next week', () => {
    const monday = Date.UTC(2026, 8, 21);
    expect(weeklyMutator(monday + 2 * DAY).id).toBe(weeklyMutator(monday + 6 * DAY).id);
    expect(weeklyMutator(monday + 7 * DAY).id).not.toBe(weeklyMutator(monday).id);
    expect(weekIndex(monday + 7 * DAY) - weekIndex(monday)).toBe(1);
  });

  it('cycles through every mutator', () => {
    const seen = new Set(Array.from({ length: MUTATORS.length }, (_, i) => weeklyMutator(Date.UTC(2026, 0, 5) + i * 7 * DAY).id));
    expect(seen.size).toBe(MUTATORS.length);
  });

  it('applies to normal runs (with the Ember bonus) but never to the Daily Run', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 1 });
    expect(run.mutator).toBeDefined();
    run.embersFound = 100;
    expect(RunManager.end(run, false).embers).toBe(Math.round(100 * (1 + MUTATOR_EMBER_BONUS)));
    expect(RunManager.start({ heroId: 'rowan', seed: 2, daily: true }).mutator).toBeUndefined();
  });
});

describe('endless depths', () => {
  it('only scales depths beyond the fifth', () => {
    expect(isEndlessDepth(5)).toBe(false);
    expect(endlessEnemyMult(5, BIOMES[1])).toEqual({ hp: 1, atk: 1 });
    expect(endlessBossMult(3, BOSSES.azhar)).toEqual({ hp: 1, atk: 1 });
  });

  it('lifts early regions to final-depth strength and keeps growing', () => {
    const crypt6 = endlessEnemyMult(6, BIOMES[1]);
    const throne6 = endlessEnemyMult(6, BIOMES[4]);
    expect(crypt6.hp).toBeGreaterThan(throne6.hp);
    expect(endlessEnemyMult(8, BIOMES[1]).hp).toBeGreaterThan(crypt6.hp);
    expect(BOSSES.gorehorn.hp * endlessBossMult(6, BOSSES.gorehorn).hp).toBeGreaterThan(BOSSES.malachar.hp);
  });

  it('continues past the fifth depth instead of ending in victory', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 5, endless: true });
    let last = '';
    for (let i = 0; i < 20; i++) last = RunManager.advance(run);
    expect(last).not.toBe('victory');
    expect(run.depth).toBeGreaterThan(5);
    expect(run.regions?.[String(run.depth)]).toBeDefined();
  });

  it('gets harder every endless depth without sudden jumps (balance model)', () => {
    const rows = simulateAverage('rowan', { gearRarity: 1, maxDepth: 9 }, 6);
    const endless = rows.filter((r) => r.depth > 5);
    expect(endless[endless.length - 1].ttk).toBeGreaterThan(endless[0].ttk);
    expect(findSpikes(rows).filter((s) => !s.at.endsWith('boss'))).toEqual([]);
  });
});

describe('duo hint', () => {
  it('names the partner spirit when a first boon of a new spirit would open a Duo', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 9 });
    const duo = BOONS.find((b) => b.duo)!;
    const partnerBoon = BOONS.find((b) => b.spirit === duo.duo && !b.duo && !b.legendary)!;
    const candidate = BOONS.find((b) => b.spirit === duo.spirit && !b.duo && !b.legendary)!;
    expect(duoUnlockedBy(run, candidate)).toBeUndefined();
    run.boons.push({ id: partnerBoon.id, rank: 1 });
    expect(duoUnlockedBy(run, candidate)).toBe(duo.duo);
    run.boons.push({ id: candidate.id, rank: 1 });
    expect(duoUnlockedBy(run, candidate)).toBeUndefined();
    expect(boonDef(candidate.id)).toBeDefined();
  });
});

describe('endless regions', () => {
  it('uses the rolled region at endless depths, and main regions stay depth-locked', async () => {
    const { biomeForDepth } = await import('@/data/biomes');
    expect(biomeForDepth(6, { '6': 'crystal' }).id).toBe('crystal');
    expect(biomeForDepth(7, { '7': 'forest' }).id).toBe('forest');
    // A normal depth never takes a region from another depth.
    expect(biomeForDepth(2, { '2': 'crystal' }).id).not.toBe('crystal');
  });
});

describe('endless milestones', () => {
  it('pay every 10th endless depth, growing toward the 100th', async () => {
    const { endlessMilestone, ENDLESS_GOAL } = await import('@/game/endless');
    expect(endlessMilestone(5)).toBeNull();
    expect(endlessMilestone(11)).toBeNull();
    expect(endlessMilestone(10)).toEqual({ embers: 150, shards: 1 });
    expect(endlessMilestone(ENDLESS_GOAL)!.embers).toBe(1500);
  });
});
