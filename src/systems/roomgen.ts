import { Rng } from '@/core/rng';

/** Cell codes for the room grid. */
export const CELL = {
  Floor: 0,
  Wall: 1,
  Pit: 2,
  Liquid: 3,
  Obstacle: 4,
  Trap: 5,
  Breakable: 6,
} as const;
export type CellCode = (typeof CELL)[keyof typeof CELL];

export interface Pt {
  x: number;
  y: number;
}

export interface RoomLayout {
  w: number;
  h: number;
  cells: Uint8Array;
  template: string;
  entry: Pt;
  exit: Pt;
  spawns: Pt[];
  obstacles: (Pt & { v: number })[];
  breakables: (Pt & { v: number })[];
  torches: Pt[];
  decals: (Pt & { v: number })[];
  altFloor: Pt[];
}

export interface RoomOptions {
  kind: 'combat' | 'elite' | 'boss' | 'treasure' | 'shop' | 'shrine' | 'rest' | 'event' | 'challenge' | 'start';
  hazard: boolean;
  width?: number;
  height?: number;
  /** Rooms are never shorter than the visible play area (avoids empty bands on tall phones). */
  minHeight?: number;
}

/** Top wall uses 3 rows (cap + 2 face rows); bottom and sides are 1 tile. */
export const TOP_WALL = 3;

export const TEMPLATES = ['open', 'pillars', 'cross', 'pools', 'river', 'ring', 'segments', 'hazardRing', 'split', 'scatter', 'diamond', 'corners'] as const;
export type TemplateId = (typeof TEMPLATES)[number];

export function idx(l: { w: number }, x: number, y: number): number {
  return y * l.w + x;
}

export function cellAt(l: RoomLayout, x: number, y: number): CellCode {
  if (x < 0 || y < 0 || x >= l.w || y >= l.h) return CELL.Wall;
  return l.cells[idx(l, x, y)] as CellCode;
}

export function isWalkable(c: CellCode): boolean {
  return c === CELL.Floor || c === CELL.Trap;
}

export function blocksProjectiles(c: CellCode): boolean {
  return c === CELL.Wall || c === CELL.Obstacle || c === CELL.Breakable;
}

function set(l: RoomLayout, x: number, y: number, c: CellCode): void {
  if (x <= 0 || x >= l.w - 1 || y < TOP_WALL || y >= l.h - 1) return;
  l.cells[idx(l, x, y)] = c;
}

/** Mirror left half onto right half for pleasing symmetric layouts. */
function setSym(l: RoomLayout, x: number, y: number, c: CellCode): void {
  set(l, x, y, c);
  set(l, l.w - 1 - x, y, c);
}

function inner(l: RoomLayout): { x0: number; x1: number; y0: number; y1: number } {
  return { x0: 1, x1: l.w - 2, y0: TOP_WALL, y1: l.h - 2 };
}

function applyTemplate(l: RoomLayout, t: TemplateId, rng: Rng, hazard: boolean): void {
  const { x0, x1, y0, y1 } = inner(l);
  const midY = Math.floor((y0 + y1) / 2);
  const liquid = hazard ? CELL.Liquid : CELL.Pit;
  switch (t) {
    case 'open': {
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) setSym(l, rng.int(x0 + 1, x0 + 3), rng.int(y0 + 3, y1 - 4), CELL.Obstacle);
      break;
    }
    case 'pillars': {
      const stepY = rng.pick([4, 5]);
      for (let y = y0 + 3; y < y1 - 3; y += stepY) {
        setSym(l, x0 + 2, y, CELL.Obstacle);
        if (rng.chance(0.5)) setSym(l, x0 + 4, y + 2, CELL.Obstacle);
      }
      break;
    }
    case 'cross': {
      for (let x = x0 + 2; x <= x0 + 3; x++) setSym(l, x, midY, CELL.Wall);
      for (let y = midY - 2; y <= midY + 2; y++) if (y !== midY) setSym(l, x0 + 4, y, CELL.Obstacle);
      break;
    }
    case 'pools': {
      const n = rng.int(2, 3);
      for (let i = 0; i < n; i++) {
        const cx = rng.int(x0 + 1, x0 + 3);
        const cy = rng.int(y0 + 3, y1 - 5);
        for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) setSym(l, cx + dx, cy + dy, liquid);
      }
      break;
    }
    case 'river': {
      for (let x = x0; x <= x1; x++) set(l, x, midY, liquid);
      for (let x = x0; x <= x1; x++) if (rng.chance(0.5)) set(l, x, midY + 1, liquid);
      const b1 = rng.int(x0 + 1, x0 + 3);
      const b2 = rng.int(x1 - 3, x1 - 1);
      for (const bx of [b1, b2]) {
        set(l, bx, midY, CELL.Floor);
        set(l, bx, midY + 1, CELL.Floor);
      }
      break;
    }
    case 'ring': {
      const cx = Math.floor(l.w / 2);
      for (let y = midY - 1; y <= midY + 1; y++) for (let x = cx - 1; x <= cx; x++) set(l, x, y, CELL.Obstacle);
      setSym(l, x0 + 1, midY - 4, CELL.Obstacle);
      setSym(l, x0 + 1, midY + 4, CELL.Obstacle);
      break;
    }
    case 'segments': {
      for (let y = y0 + 3; y < y1 - 3; y += 4) {
        const len = rng.int(2, 3);
        const sx = rng.int(x0, x0 + 2);
        for (let x = sx; x < sx + len; x++) setSym(l, x, y, CELL.Wall);
      }
      break;
    }
    case 'hazardRing': {
      const cx = Math.floor(l.w / 2);
      for (let y = midY - 2; y <= midY + 2; y++) {
        for (let x = cx - 3; x <= cx + 2; x++) {
          const edge = y === midY - 2 || y === midY + 2 || x === cx - 3 || x === cx + 2;
          if (edge && !(x === cx - 1 || x === cx)) set(l, x, y, hazard ? CELL.Liquid : CELL.Trap);
        }
      }
      break;
    }
    case 'split': {
      const y = midY + rng.int(-2, 2);
      for (let x = x0; x <= x1; x++) set(l, x, y, CELL.Wall);
      const gaps = rng.sample([x0 + 1, x0 + 2, Math.floor(l.w / 2), x1 - 2, x1 - 1], 2);
      for (const gx of gaps) {
        set(l, gx, y, CELL.Floor);
        set(l, gx + (gx < l.w / 2 ? 1 : -1), y, CELL.Floor);
      }
      break;
    }
    case 'scatter': {
      for (let y = y0 + 3; y <= y1 - 3; y++) {
        for (let x = x0; x <= x1; x++) if (rng.chance(0.09)) set(l, x, y, rng.chance(0.7) ? CELL.Obstacle : CELL.Breakable);
      }
      break;
    }
    case 'diamond': {
      const cx = Math.floor(l.w / 2);
      const pts: [number, number][] = [[0, -3], [-3, 0], [2, 0], [0, 3], [-1, -3], [-1, 3]];
      for (const [dx, dy] of pts) set(l, cx + dx, midY + dy, CELL.Obstacle);
      break;
    }
    case 'corners': {
      for (const [x, y] of [[x0 + 1, y0 + 3], [x0 + 1, y1 - 3]]) {
        setSym(l, x, y, CELL.Obstacle);
        setSym(l, x + 1, y, CELL.Obstacle);
        setSym(l, x, y + (y < midY ? 1 : -1), CELL.Obstacle);
      }
      if (hazard) for (let x = Math.floor(l.w / 2) - 1; x <= Math.floor(l.w / 2); x++) set(l, x, midY, CELL.Liquid);
      break;
    }
  }
}

/** Flood fill over walkable cells. */
export function reachable(l: RoomLayout, from: Pt): Set<number> {
  const seen = new Set<number>();
  const stack = [idx(l, from.x, from.y)];
  while (stack.length) {
    const i = stack.pop()!;
    if (seen.has(i)) continue;
    const x = i % l.w;
    const y = Math.floor(i / l.w);
    if (!isWalkable(cellAt(l, x, y))) continue;
    seen.add(i);
    stack.push(idx(l, x + 1, y), idx(l, x - 1, y), idx(l, x, y + 1), idx(l, x, y - 1));
  }
  return seen;
}

function clearAround(l: RoomLayout, p: Pt, r: number): void {
  for (let y = p.y - r; y <= p.y + r; y++) for (let x = p.x - r; x <= p.x + r; x++) set(l, x, y, CELL.Floor);
}

function blank(w: number, h: number, template: string): RoomLayout {
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wall = x === 0 || x === w - 1 || y < TOP_WALL || y === h - 1;
      cells[y * w + x] = wall ? CELL.Wall : CELL.Floor;
    }
  }
  return {
    w, h, cells, template,
    entry: { x: Math.floor(w / 2), y: h - 3 },
    exit: { x: Math.floor(w / 2), y: TOP_WALL },
    spawns: [], obstacles: [], breakables: [], torches: [], decals: [], altFloor: [],
  };
}

function roomSize(opts: RoomOptions, rng: Rng): { w: number; h: number } {
  const w = opts.width ?? 12;
  if (opts.height) return { w, h: opts.height };
  switch (opts.kind) {
    case 'boss': return { w, h: 24 };
    case 'elite': return { w, h: rng.int(20, 24) };
    case 'combat':
    case 'challenge': return { w, h: rng.int(18, 26) };
    default: return { w, h: 17 };
  }
}

export function generateRoom(rng: Rng, opts: RoomOptions): RoomLayout {
  const size = roomSize(opts, rng);
  const w = size.w;
  const h = Math.max(size.h, opts.minHeight ?? 0);
  const combat = opts.kind === 'combat' || opts.kind === 'elite' || opts.kind === 'challenge';
  for (let attempt = 0; attempt < 12; attempt++) {
    const template: TemplateId = combat ? rng.pick(TEMPLATES) : opts.kind === 'boss' ? rng.pick(['open', 'corners', 'diamond'] as const) : 'open';
    const l = blank(w, h, template);
    if (combat || opts.kind === 'boss') applyTemplate(l, template, rng, opts.hazard);
    clearAround(l, l.entry, 1);
    clearAround(l, { x: l.exit.x, y: l.exit.y + 1 }, 1);
    if (opts.kind !== 'combat' && opts.kind !== 'elite' && opts.kind !== 'boss' && opts.kind !== 'challenge') {
      clearAround(l, { x: Math.floor(w / 2), y: Math.floor(h / 2) }, 2);
    }
    const reach = reachable(l, l.entry);
    if (!reach.has(idx(l, l.exit.x, l.exit.y))) continue;
    // Seal unreachable pockets so enemies never spawn where the player can't go.
    for (let i = 0; i < l.cells.length; i++) if (isWalkable(l.cells[i] as CellCode) && !reach.has(i)) l.cells[i] = CELL.Obstacle;
    decorate(l, rng);
    return l;
  }
  const fallback = blank(w, h, 'open');
  decorate(fallback, rng);
  return fallback;
}

function decorate(l: RoomLayout, rng: Rng): void {
  for (let y = 0; y < l.h; y++) {
    for (let x = 0; x < l.w; x++) {
      const c = cellAt(l, x, y);
      if (c === CELL.Obstacle) l.obstacles.push({ x, y, v: rng.int(0, 99) });
      if (c === CELL.Breakable) l.breakables.push({ x, y, v: rng.int(0, 99) });
    }
  }
  // Breakable pots along walls: loot + juice.
  const nPots = rng.int(1, 4);
  for (let i = 0; i < nPots; i++) {
    const side = rng.chance(0.5) ? 1 : l.w - 2;
    const y = rng.int(TOP_WALL + 1, l.h - 4);
    if (cellAt(l, side, y) === CELL.Floor && Math.abs(y - l.entry.y) > 2) {
      l.cells[idx(l, side, y)] = CELL.Breakable;
      if (reachable(l, l.entry).has(idx(l, l.exit.x, l.exit.y))) l.breakables.push({ x: side, y, v: rng.int(0, 99) });
      else l.cells[idx(l, side, y)] = CELL.Floor;
    }
  }
  // Torches on the top wall and every few rows on side walls.
  l.torches.push({ x: 2, y: 1 }, { x: l.w - 3, y: 1 });
  for (let y = TOP_WALL + 4; y < l.h - 2; y += rng.int(5, 7)) {
    l.torches.push({ x: 0, y }, { x: l.w - 1, y });
  }
  // Alternate floor in organic blobs (paths, moss patches) rather than salt-and-pepper noise.
  const blobs = rng.int(2, 4);
  const alt = new Set<number>();
  for (let b = 0; b < blobs; b++) {
    const cx = rng.int(2, l.w - 3);
    const cy = rng.int(TOP_WALL + 1, l.h - 3);
    const r = rng.float(1.2, 2.6);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x - cx, (y - cy) * 1.2);
        if (d <= r && rng.chance(d < r - 0.6 ? 1 : 0.6) && cellAt(l, x, y) === CELL.Floor) alt.add(idx(l, x, y));
      }
    }
  }
  for (const i of alt) l.altFloor.push({ x: i % l.w, y: Math.floor(i / l.w) });
  for (let y = TOP_WALL; y < l.h - 1; y++) {
    for (let x = 1; x < l.w - 1; x++) {
      if (cellAt(l, x, y) === CELL.Floor && !alt.has(idx(l, x, y)) && rng.chance(0.05)) l.decals.push({ x, y, v: rng.int(0, 99) });
    }
  }
  // Every room gets spawn points: peaceful rooms can still turn into fights (event ambushes).
  {
    const reach = reachable(l, l.entry);
    for (let y = TOP_WALL + 1; y < l.h - 2; y++) {
      for (let x = 1; x < l.w - 1; x++) {
        if (cellAt(l, x, y) !== CELL.Floor || !reach.has(idx(l, x, y))) continue;
        if (Math.abs(x - l.entry.x) + Math.abs(y - l.entry.y) < 7) continue;
        l.spawns.push({ x, y });
      }
    }
  }
}
