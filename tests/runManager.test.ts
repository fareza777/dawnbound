import { beforeEach, describe, expect, it } from 'vitest';
import { services } from '@/core/services';
import { SaveManager } from '@/core/save';
import { RunManager } from '@/game/RunManager';
import { BOONS, boonDef } from '@/data/boons';
import { Rng } from '@/core/rng';

beforeEach(() => {
  services.save = new SaveManager(null);
});

describe('RunManager.start', () => {
  it('starts at depth 1, floor 1, on the start node of a generated map', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 42 });
    expect(run.depth).toBe(1);
    expect(run.floor).toBe(1);
    expect(RunManager.node(run).kind).toBe('start');
    expect(RunManager.choices(run).length).toBeGreaterThan(0);
  });

  it('is deterministic for a seed (same map layout)', () => {
    const a = RunManager.start({ heroId: 'rowan', seed: 7 });
    const kindsA = a.map.nodes.map((n) => n.kind).join();
    const b = RunManager.start({ heroId: 'rowan', seed: 7 });
    expect(b.map.nodes.map((n) => n.kind).join()).toBe(kindsA);
  });
});

describe('RunManager.advance', () => {
  it('moves through floors, then depths, then reports victory at the end', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 3 });
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      const r = RunManager.advance(run);
      seen.push(r);
      if (r === 'victory') break;
    }
    expect(seen).toContain('floor');
    expect(seen).toContain('depth');
    expect(seen[seen.length - 1]).toBe('victory');
    expect(services.save!.data.unlocks.maxDepthReached).toBe(run.depth);
  });
});

describe('RunManager.boonOffers', () => {
  it('offers distinct boons and never one that is already at max rank', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 11 });
    const maxed = BOONS.find((b) => !b.duo && !b.legendary)!;
    run.boons.push({ id: maxed.id, rank: maxed.maxRank });
    for (let i = 0; i < 30; i++) {
      const offers = RunManager.boonOffers(run, 3, undefined, new Rng(i));
      const ids = offers.map((o) => o.def.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain(maxed.id);
    }
  });

  it('only offers a spirit shrine\'s own boons (or its duos)', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 12 });
    const offers = RunManager.boonOffers(run, 3, 'rime', new Rng(5));
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) expect(o.def.spirit === 'rime' || o.def.duo === 'rime').toBe(true);
  });

  it('keeps duo boons locked until both spirits are owned', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 13 });
    for (let i = 0; i < 40; i++) {
      for (const o of RunManager.boonOffers(run, 3, undefined, new Rng(i))) expect(o.def.duo).toBeUndefined();
    }
  });

  it('ranks up a boon taken twice', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 14 });
    const id = BOONS[0].id;
    RunManager.addBoon(run, id);
    RunManager.addBoon(run, id);
    expect(run.boons.find((b) => b.id === id)?.rank).toBe(2);
    expect(boonDef(id)).toBeDefined();
  });
});

describe('RunManager.end', () => {
  it('banks half the gold, pays embers with a depth bonus and records the run', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 21 });
    const s = services.save!.data;
    const embersBefore = s.currency.embers;
    const goldBefore = s.currency.gold;
    run.mutator = undefined; // base formula, without this week's Ember bonus
    run.gold = 101;
    run.embersFound = 10;
    run.depth = 2;
    run.floor = 2;
    run.kills = 30;
    const res = RunManager.end(run, false);
    // depth bonus: (2-1)*15 + (2-1)*5 = 20
    expect(res.embers).toBe(30);
    expect(res.goldBanked).toBe(51);
    expect(s.currency.embers - embersBefore).toBe(30);
    expect(s.currency.gold - goldBefore).toBe(51);
    expect(s.stats.deaths).toBe(1);
    expect(s.stats.bestDepth).toBe(2);
    expect(s.run).toBeNull();
  });

  it('adds the victory bonus', () => {
    const run = RunManager.start({ heroId: 'rowan', seed: 22 });
    run.mutator = undefined;
    run.embersFound = 0;
    expect(RunManager.end(run, true).embers).toBe(150);
  });
});
