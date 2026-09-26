import { Rng } from '@/core/rng';
import type { FloorMap, MapNode, NodeKind } from '@/data/types';

export const FLOORS_PER_DEPTH = 3;
/** 8 rows = 6 rooms to cross per floor: a depth is ~20 rooms, so clearing even the first one is a journey. */
export const ROWS_PER_FLOOR = 8;
export const LANES = 3;

export type RoomReward = 'boon' | 'gold' | 'relic' | 'item' | 'heal' | 'hammer' | 'embers' | 'material';

/** Mostly fights: calm rooms (treasure, rest, shop) are rarer so they feel earned. */
const KIND_WEIGHTS: [NodeKind, number][] = [
  ['combat', 56],
  ['elite', 10],
  ['event', 10],
  ['treasure', 4],
  ['shop', 4],
  ['shrine', 6],
  ['rest', 4],
  ['challenge', 6],
  ['mystery', 4],
];

/** Longer floors mean more rewards, so boons are a rarer prize (more gold, Embers and materials instead). */
const REWARDS: [RoomReward, number][] = [
  ['boon', 18],
  ['gold', 20],
  ['item', 14],
  ['relic', 7],
  ['heal', 8],
  ['hammer', 5],
  ['embers', 14],
  ['material', 14],
];

export function rollReward(rng: Rng, kind: NodeKind): RoomReward {
  if (kind === 'elite') return rng.weighted([['relic', 45], ['item', 35], ['boon', 20]] as const);
  if (kind === 'challenge') return rng.weighted([['relic', 40], ['embers', 30], ['item', 30]] as const);
  return rng.weighted(REWARDS);
}

/**
 * Generate a branching map. Row 0 is the entrance, the last row is the exit (boss on the final floor of a depth).
 * Guarantees: every node reachable from the start, every node has a path to the exit, one shop and one rest site
 * per floor, no two elites back-to-back on the same path.
 */
export function generateFloor(rng: Rng, depth: number, floor: number): FloorMap {
  const rows = ROWS_PER_FLOOR;
  const nodes: MapNode[] = [];
  const byRow: MapNode[][] = [];
  const lastFloor = floor === FLOORS_PER_DEPTH;
  for (let r = 0; r < rows; r++) {
    const lanesInRow = r === 0 || r === rows - 1 ? [1] : rng.chance(0.3) ? [0, 2] : [0, 1, 2];
    const row: MapNode[] = [];
    for (const lane of lanesInRow) {
      let kind: NodeKind;
      if (r === 0) kind = 'start';
      else if (r === rows - 1) kind = lastFloor ? 'boss' : 'rest';
      else if (r === 1) kind = rng.weighted([['combat', 70], ['event', 15], ['treasure', 8], ['mystery', 7]] as const);
      else kind = rng.weighted(KIND_WEIGHTS);
      const node: MapNode = { id: `r${r}l${lane}`, row: r, lane, kind, next: [] };
      row.push(node);
      nodes.push(node);
    }
    byRow.push(row);
  }
  // Connect rows: each node links to nearest lanes in the next row.
  for (let r = 0; r < rows - 1; r++) {
    const cur = byRow[r];
    const nxt = byRow[r + 1];
    for (const n of cur) {
      const sorted = [...nxt].sort((a, b) => Math.abs(a.lane - n.lane) - Math.abs(b.lane - n.lane));
      const links = sorted.filter((m) => Math.abs(m.lane - n.lane) <= 1);
      const pick = links.length ? links : [sorted[0]];
      const count = cur.length === 1 ? pick.length : Math.min(pick.length, rng.chance(0.55) ? 2 : 1);
      for (const m of pick.slice(0, count)) if (!n.next.includes(m.id)) n.next.push(m.id);
    }
    // Every node in the next row needs an incoming edge.
    for (const m of nxt) {
      if (!cur.some((n) => n.next.includes(m.id))) {
        const nearest = [...cur].sort((a, b) => Math.abs(a.lane - m.lane) - Math.abs(b.lane - m.lane))[0];
        nearest.next.push(m.id);
      }
    }
  }
  if (lastFloor) ensureKind(rng, byRow[rows - 2], 'rest');
  ensureKind(rng, byRow.slice(2, rows - 1).flat(), 'shop');
  if (!lastFloor) ensureKind(rng, byRow.slice(1, rows - 1).flat(), 'shrine');
  // Avoid elite -> elite chains.
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  for (const n of nodes) {
    if (n.kind !== 'elite') continue;
    for (const id of n.next) {
      const m = byId.get(id)!;
      if (m.kind === 'elite') m.kind = 'combat';
    }
  }
  for (const n of nodes) {
    if (n.kind === 'combat' || n.kind === 'elite' || n.kind === 'challenge') n.content = rollReward(rng, n.kind);
  }
  return { depth, floor, rows, lanes: LANES, nodes };
}

function ensureKind(rng: Rng, candidates: MapNode[], kind: NodeKind): void {
  if (candidates.length === 0 || candidates.some((n) => n.kind === kind)) return;
  const swappable = candidates.filter((n) => n.kind === 'combat' || n.kind === 'mystery' || n.kind === 'event');
  const protectedKinds: NodeKind[] = ['shop', 'rest', 'shrine'];
  const fallback = candidates.filter((n) => !protectedKinds.includes(n.kind));
  const pool = swappable.length ? swappable : fallback.length ? fallback : candidates;
  const target = rng.pick(pool);
  target.kind = kind;
}

export function nodeById(map: FloorMap, id: string): MapNode | undefined {
  return map.nodes.find((n) => n.id === id);
}

/** Nodes the player may move to next. */
export function choicesFrom(map: FloorMap, id: string): MapNode[] {
  const n = nodeById(map, id);
  if (!n) return [];
  return n.next.map((x) => nodeById(map, x)!).filter(Boolean);
}
