import { Rng, hashString } from '@/core/rng';
import { bus } from '@/core/events';
import { services } from '@/core/services';
import { t } from '@/core/i18n';
import { MUTATOR_EMBER_BONUS, mutatorById, weeklyMutator } from '@/data/mutators';
import { endlessMilestone, endlessRegion, isEndlessDepth } from './endless';
import type { FloorMap, ItemInstance, MapNode, RunState, SaveData, Slot } from '@/data/types';
import { heroDef } from '@/data/heroes';
import { BOONS, boonDef, boonValue, type BoonDef, type SpiritId } from '@/data/boons';
import { relicDef, RELICS, type RelicDef, type RelicTier } from '@/data/relics';
import { talentSources } from '@/data/talents';
import { ELIXIRS } from '@/data/materials';
import { VOWS } from '@/data/vows';
import { FLOORS_PER_DEPTH, choicesFrom, generateFloor, nodeById } from '@/systems/floorgen';
import { gearSources } from '@/systems/loot';
import { RunContext } from './RunContext';
import type { Mod } from '@/data/stats';
import type { EffectRef } from '@/data/types';
import { ALT_BIOMES } from '@/data/biomes';

export const MAX_DEPTH = 5;

function save(): SaveData {
  return services.save!.data;
}

function persist(): void {
  services.save!.markDirty();
}

export function equippedItems(s: SaveData): ItemInstance[] {
  const out: ItemInstance[] = [];
  for (const slot of Object.keys(s.equipped) as Slot[]) {
    const uid = s.equipped[slot];
    const it = s.inventory.find((i) => i.uid === uid);
    if (it) out.push(it);
  }
  return out;
}

export function boonSources(run: RunState): { mods: Mod[]; effects: EffectRef[] }[] {
  return run.boons.map((b) => {
    const def = boonDef(b.id);
    if (!def) return { mods: [], effects: [] };
    const { v, v2 } = boonValue(def, b.rank);
    return { mods: def.mods ? def.mods(v, v2) : [], effects: def.effects ? def.effects(v, v2) : [] };
  });
}

export function relicSources(run: RunState): { mods: Mod[]; effects: EffectRef[] }[] {
  return run.relics.map((id) => relicDef(id)).filter((r): r is RelicDef => !!r).map((r) => ({ mods: r.mods, effects: r.effects }));
}

/** Hub-side stats preview (no run): hero + gear + talents + active elixir. */
export function buildContext(s: SaveData, run: RunState | null, heroId = s.profile.heroId): RunContext {
  const hero = heroDef(heroId);
  const ctx = new RunContext(hero.stats);
  const sources = [...gearSources(equippedItems(s)), ...talentSources(s.talents)];
  if (s.activeElixir) {
    const el = ELIXIRS.find((e) => e.id === s.activeElixir);
    if (el) sources.push({ mods: el.mods, effects: [] });
  }
  if (run) {
    sources.push(...boonSources(run), ...relicSources(run));
    if (run.bonusMaxHp) sources.push({ mods: [{ stat: 'maxHp', type: 'flat', value: run.bonusMaxHp }], effects: [] });
    for (const [vowId, rank] of Object.entries(run.vows)) {
      const vow = VOWS.find((v) => v.id === vowId);
      if (vow && rank > 0 && vow.playerMods) sources.push({ mods: vow.playerMods(rank), effects: [] });
    }
    const mut = mutatorById(run.mutator);
    if (mut?.playerMods) sources.push({ mods: mut.playerMods, effects: [] });
  }
  ctx.setSources(sources);
  return ctx;
}

export class RunManager {
  static get run(): RunState | null {
    return save().run;
  }

  static heat(run: RunState): number {
    return Object.values(run.vows).reduce((a, b) => a + b, 0);
  }

  static start(opts: { heroId: string; seed?: number; daily?: boolean; endless?: boolean }): RunState {
    const s = save();
    const seed = opts.seed ?? Rng.seedFromTime();
    const map = generateFloor(new Rng(hashString(`${seed}:map:1:1`)), 1, 1);
    const start = map.nodes.find((n) => n.kind === 'start')!;
    const hero = heroDef(opts.heroId);
    const run: RunState = {
      seed,
      heroId: hero.id,
      skin: s.profile.skins[hero.id] ?? 1,
      daily: opts.daily ?? false,
      vows: opts.daily ? {} : { ...s.vows },
      depth: 1,
      floor: 1,
      map,
      nodeId: start.id,
      visited: [start.id],
      hp: -1,
      shield: 0,
      level: 1,
      xp: 0,
      gold: 0,
      boons: [],
      relics: [],
      flaskCharges: -1,
      keys: 0,
      kills: 0,
      eliteKills: 0,
      timeSec: 0,
      roomsCleared: 0,
      rerolls: 1,
      itemsFound: [],
      materialsFound: {},
      embersFound: 0,
      loreFound: [],
      curses: [],
      roomCounter: 0,
      bossesKilled: [],
      deathSaves: 0,
      regions: RunManager.rollRegions(seed, s.quests.mq_gorehorn?.status === 'claimed'),
      endless: !opts.daily && !!opts.endless,
      // The Daily Run has its own fixed rules; every other run gets this week's mutator.
      mutator: opts.daily ? undefined : weeklyMutator(Date.now()).id,
    };
    s.run = run;
    const ctx = buildContext(s, run);
    run.rerolls += Math.round(ctx.p('rerolls'));
    if (ctx.has('start_boon')) {
      const offer = RunManager.boonOffers(run, 1)[0];
      if (offer) RunManager.addBoon(run, offer.def.id);
    }
    // The active elixir is consumed when the run begins.
    if (s.activeElixir) {
      s.elixirs[s.activeElixir] = Math.max(0, (s.elixirs[s.activeElixir] ?? 1) - 1);
      if ((s.elixirs[s.activeElixir] ?? 0) <= 0) s.activeElixir = null;
    }
    services.save!.stat('runs');
    bus.emit('runStarted', { seed, heroId: hero.id, daily: run.daily });
    persist();
    return run;
  }

  /**
   * Each depth that has an alternate region takes it about 45% of the time, once the first boss has fallen
   * (early story runs always follow the main path).
   */
  static rollRegions(seed: number, unlocked: boolean): Record<string, string> {
    const out: Record<string, string> = {};
    if (!unlocked) return out;
    const rng = new Rng(hashString(`${seed}:regions`));
    for (const b of ALT_BIOMES) if (rng.chance(0.45)) out[String(b.depth)] = b.id;
    return out;
  }

  static rngFor(run: RunState, label: string): Rng {
    return new Rng(hashString(`${run.seed}:${label}:${run.depth}:${run.floor}:${run.roomCounter}`));
  }

  static node(run: RunState): MapNode {
    return nodeById(run.map, run.nodeId)!;
  }

  static choices(run: RunState): MapNode[] {
    return choicesFrom(run.map, run.nodeId);
  }

  static moveTo(run: RunState, nodeId: string): MapNode {
    run.nodeId = nodeId;
    run.visited.push(nodeId);
    run.roomCounter += 1;
    persist();
    return RunManager.node(run);
  }

  /** Called after the final node of a floor is completed. Returns 'floor' | 'depth' | 'victory'. */
  static advance(run: RunState): 'floor' | 'depth' | 'victory' {
    const s = save();
    let result: 'floor' | 'depth' | 'victory';
    if (run.floor < FLOORS_PER_DEPTH) {
      run.floor += 1;
      result = 'floor';
    } else if (run.depth < MAX_DEPTH || run.endless) {
      run.depth += 1;
      run.floor = 1;
      result = 'depth';
      const milestone = run.endless ? endlessMilestone(run.depth) : null;
      if (milestone) {
        s.currency.embers += milestone.embers;
        s.currency.shards += milestone.shards;
        services.notify?.(t('endlessMilestone', { d: run.depth, e: milestone.embers, s: milestone.shards }), 0xffd84a, 'achievement');
      }
      if (isEndlessDepth(run.depth)) {
        run.regions = { ...(run.regions ?? {}) };
        run.regions[String(run.depth)] = endlessRegion(run.seed, run.depth, run.regions[String(run.depth - 1)]);
      }
      bus.emit('depthReached', { depth: run.depth });
    } else {
      result = 'victory';
    }
    if (result !== 'victory') {
      run.map = generateFloor(new Rng(hashString(`${run.seed}:map:${run.depth}:${run.floor}`)), run.depth, run.floor);
      const start = run.map.nodes.find((n) => n.kind === 'start')!;
      run.nodeId = start.id;
      run.visited = [start.id];
    }
    s.unlocks.maxDepthReached = Math.max(s.unlocks.maxDepthReached, run.depth);
    persist();
    return result;
  }

  static isLastRow(run: RunState): boolean {
    return RunManager.node(run).row === run.map.rows - 1;
  }

  // ------------------------------------------------------------------ boons & relics
  static boonOffers(run: RunState, count: number, spirit?: SpiritId, rng?: Rng): { def: BoonDef; rank: number; upgrade: boolean }[] {
    const r = rng ?? RunManager.rngFor(run, `boon:${run.level}:${run.boons.length}:${run.rerolls}`);
    const owned = new Map(run.boons.map((b) => [b.id, b.rank] as const));
    const ownedSpirits = new Map<SpiritId, number>();
    for (const b of run.boons) {
      const d = boonDef(b.id);
      if (d) ownedSpirits.set(d.spirit, (ownedSpirits.get(d.spirit) ?? 0) + 1);
    }
    const bias = mutatorById(run.mutator)?.spiritBias;
    const eligible = BOONS.filter((b) => {
      const rank = owned.get(b.id) ?? 0;
      if (rank >= b.maxRank) return false;
      if (spirit && b.spirit !== spirit && b.duo !== spirit) return false;
      if (b.duo && (!ownedSpirits.get(b.spirit) || !ownedSpirits.get(b.duo))) return false;
      if (b.legendary && (ownedSpirits.get(b.spirit) ?? 0) < 3) return false;
      if (b.requires && !b.requires.every((id) => owned.has(id))) return false;
      return true;
    });
    const picks: { def: BoonDef; rank: number; upgrade: boolean }[] = [];
    const pool = eligible.slice();
    while (picks.length < count && pool.length) {
      const weighted = pool.map((b) => {
        let w = 10;
        if (owned.has(b.id)) w = 9;
        if (ownedSpirits.has(b.spirit)) w += 4;
        if (b.duo) w = 14;
        if (b.legendary) w = 6;
        if (bias && (b.spirit === bias || b.duo === bias)) w *= 2;
        return [b, w] as const;
      });
      const pick = r.weighted(weighted);
      pool.splice(pool.indexOf(pick), 1);
      if (picks.some((p) => p.def.spirit === pick.spirit && !spirit && pool.some((x) => x.spirit !== pick.spirit) && r.chance(0.5))) continue;
      const rank = (owned.get(pick.id) ?? 0) + 1;
      picks.push({ def: pick, rank, upgrade: owned.has(pick.id) });
    }
    return picks;
  }

  static addBoon(run: RunState, id: string): void {
    const existing = run.boons.find((b) => b.id === id);
    if (existing) existing.rank += 1;
    else run.boons.push({ id, rank: 1 });
    const def = boonDef(id);
    const s = save();
    if (!s.codex.boons.includes(id)) s.codex.boons.push(id);
    if (def) bus.emit('boonTaken', { boonId: id, spirit: def.spirit });
    persist();
  }

  static upgradeRandomBoon(run: RunState, rng: Rng): string | null {
    const up = run.boons.filter((b) => {
      const d = boonDef(b.id);
      return d && b.rank < d.maxRank;
    });
    if (!up.length) return null;
    const b = rng.pick(up);
    b.rank += 1;
    persist();
    return b.id;
  }

  static relicOffer(run: RunState, rng: Rng, tiers: [RelicTier, number][]): RelicDef | null {
    const owned = new Set(run.relics);
    const tier = rng.weighted(tiers);
    let pool = RELICS.filter((r) => !owned.has(r.id) && !r.special && r.tier === tier);
    if (!pool.length) pool = RELICS.filter((r) => !owned.has(r.id) && !r.special);
    return pool.length ? rng.pick(pool) : null;
  }

  static addRelic(run: RunState, id: string): void {
    if (run.relics.includes(id)) return;
    run.relics.push(id);
    const def = relicDef(id);
    const grant = def?.effects.find((e) => e.id === 'grant_boons');
    if (grant) {
      for (let i = 0; i < (grant.p?.[0] ?? 0); i++) {
        const offer = RunManager.boonOffers(run, 1, undefined, RunManager.rngFor(run, `grant:${i}`))[0];
        if (offer) RunManager.addBoon(run, offer.def.id);
      }
    }
    const s = save();
    if (!s.codex.relics.includes(id)) s.codex.relics.push(id);
    bus.emit('relicFound', { relicId: id });
    persist();
  }

  // ------------------------------------------------------------------ end of run
  static end(run: RunState, victory: boolean): { embers: number; goldBanked: number } {
    const s = save();
    const depthBonus = (run.depth - 1) * 15 + (run.floor - 1) * 5;
    const mutatorBonus = mutatorById(run.mutator) ? 1 + MUTATOR_EMBER_BONUS : 1;
    const embers = Math.round((run.embersFound + depthBonus + (victory ? 150 : 0)) * mutatorBonus);
    const goldBanked = Math.round(run.gold * 0.5);
    s.currency.embers += embers;
    s.currency.gold += goldBanked;
    s.stats.kills = (s.stats.kills ?? 0) + run.kills;
    s.stats.deaths = (s.stats.deaths ?? 0) + (victory ? 0 : 1);
    s.stats.wins = (s.stats.wins ?? 0) + (victory ? 1 : 0);
    s.stats.bestDepth = Math.max(s.stats.bestDepth ?? 0, run.depth);
    if (run.endless) s.stats.bestEndless = Math.max(s.stats.bestEndless ?? 0, run.depth);
    s.stats.totalEmbers = (s.stats.totalEmbers ?? 0) + embers;
    s.stats.playRuns = (s.stats.playRuns ?? 0) + 1;
    s.flags.completedRuns = (s.flags.completedRuns ?? 0) + 1;
    if (run.daily) {
      const score = run.depth * 1000 + run.kills;
      s.daily.best = Math.max(s.daily.best, score);
    }
    bus.emit('runEnded', { victory, depth: run.depth, floor: run.floor, kills: run.kills, timeSec: run.timeSec });
    s.run = null;
    persist();
    services.save!.flush();
    return { embers, goldBanked };
  }

  static floorLabelKey(map: FloorMap): string {
    return map.floor === FLOORS_PER_DEPTH ? 'bossFloor' : 'floorLabel';
  }
}
