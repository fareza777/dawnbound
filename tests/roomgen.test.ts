import { describe, expect, it } from 'vitest';
import { Rng, codeToSeed, seedToCode } from '@/core/rng';
import { CELL, generateRoom, reachable, idx, isWalkable, TOP_WALL } from '@/systems/roomgen';

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    const xs = Array.from({ length: 20 }, () => a.next());
    const ys = Array.from({ length: 20 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it('int stays within inclusive bounds', () => {
    const r = new Rng('bounds');
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('weighted never returns zero-weight entries', () => {
    const r = new Rng(9);
    for (let i = 0; i < 500; i++) expect(r.weighted([['a', 0], ['b', 1]] as const)).toBe('b');
  });

  it('seed codes round-trip', () => {
    for (const s of [0, 1, 42, 123456789, 4294967295]) expect(codeToSeed(seedToCode(s))).toBe(s >>> 0);
  });

  it('fork produces independent but reproducible streams', () => {
    const a = new Rng(5).fork('room');
    const b = new Rng(5).fork('room');
    expect(a.next()).toBe(b.next());
  });
});

describe('generateRoom', () => {
  it('always connects entry to exit across many seeds and kinds', () => {
    for (let s = 0; s < 300; s++) {
      for (const kind of ['combat', 'elite', 'boss', 'treasure'] as const) {
        const l = generateRoom(new Rng(s * 7 + 1), { kind, hazard: s % 2 === 0 });
        const reach = reachable(l, l.entry);
        expect(reach.has(idx(l, l.exit.x, l.exit.y))).toBe(true);
        expect(isWalkable(l.cells[idx(l, l.entry.x, l.entry.y)] as never)).toBe(true);
      }
    }
  });

  it('keeps the outer border solid', () => {
    const l = generateRoom(new Rng(77), { kind: 'combat', hazard: true });
    for (let x = 0; x < l.w; x++) {
      for (let y = 0; y < TOP_WALL; y++) expect(l.cells[idx(l, x, y)]).toBe(CELL.Wall);
      expect(l.cells[idx(l, x, l.h - 1)]).toBe(CELL.Wall);
    }
    for (let y = 0; y < l.h; y++) {
      expect(l.cells[idx(l, 0, y)]).toBe(CELL.Wall);
      expect(l.cells[idx(l, l.w - 1, y)]).toBe(CELL.Wall);
    }
  });

  it('only offers reachable spawn points away from the entry', () => {
    const l = generateRoom(new Rng(3), { kind: 'combat', hazard: false });
    const reach = reachable(l, l.entry);
    expect(l.spawns.length).toBeGreaterThan(10);
    for (const p of l.spawns) {
      expect(reach.has(idx(l, p.x, p.y))).toBe(true);
      expect(Math.abs(p.x - l.entry.x) + Math.abs(p.y - l.entry.y)).toBeGreaterThanOrEqual(7);
    }
  });

  it('is deterministic per seed', () => {
    const a = generateRoom(new Rng(11), { kind: 'combat', hazard: true });
    const b = generateRoom(new Rng(11), { kind: 'combat', hazard: true });
    expect(Array.from(a.cells)).toEqual(Array.from(b.cells));
  });
});

describe('ambush-ready rooms', () => {
  it('gives peaceful rooms spawn points so an event fight can never be empty', async () => {
    const { generateRoom } = await import('@/systems/roomgen');
    const { Rng } = await import('@/core/rng');
    for (const kind of ['event', 'rest', 'shop', 'shrine', 'treasure'] as const) {
      for (let i = 0; i < 5; i++) expect(generateRoom(new Rng(i + 1), { kind, hazard: false }).spawns.length).toBeGreaterThan(3);
    }
  });
});
