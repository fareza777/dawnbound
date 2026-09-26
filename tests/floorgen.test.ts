import { describe, expect, it } from 'vitest';
import { Rng } from '@/core/rng';
import { FLOORS_PER_DEPTH, generateFloor, nodeById, choicesFrom } from '@/systems/floorgen';
import type { FloorMap } from '@/data/types';

function reachableFromStart(map: FloorMap): Set<string> {
  const start = map.nodes.find((n) => n.kind === 'start')!;
  const seen = new Set<string>();
  const stack = [start.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...nodeById(map, id)!.next);
  }
  return seen;
}

describe('generateFloor', () => {
  it('connects every node from the start and to the exit', () => {
    for (let s = 0; s < 400; s++) {
      for (let floor = 1; floor <= FLOORS_PER_DEPTH; floor++) {
        const map = generateFloor(new Rng(s), 1 + (s % 5), floor);
        const reach = reachableFromStart(map);
        expect(reach.size).toBe(map.nodes.length);
        const lastRow = map.rows - 1;
        for (const n of map.nodes) {
          if (n.row < lastRow) expect(n.next.length).toBeGreaterThan(0);
          for (const id of n.next) expect(nodeById(map, id)!.row).toBe(n.row + 1);
        }
      }
    }
  });

  it('ends the last floor of a depth with a boss and earlier floors with a rest site', () => {
    const last = generateFloor(new Rng(1), 2, FLOORS_PER_DEPTH);
    expect(last.nodes.filter((n) => n.row === last.rows - 1).map((n) => n.kind)).toEqual(['boss']);
    const first = generateFloor(new Rng(1), 2, 1);
    expect(first.nodes.filter((n) => n.row === first.rows - 1).map((n) => n.kind)).toEqual(['rest']);
  });

  it('guarantees a shop on every floor and never chains elites', () => {
    for (let s = 0; s < 300; s++) {
      const map = generateFloor(new Rng(s * 3), 3, 1 + (s % 2));
      expect(map.nodes.some((n) => n.kind === 'shop')).toBe(true);
      for (const n of map.nodes) {
        if (n.kind !== 'elite') continue;
        for (const m of choicesFrom(map, n.id)) expect(m.kind).not.toBe('elite');
      }
    }
  });

  it('gives combat rooms a reward preview', () => {
    const map = generateFloor(new Rng(9), 1, 1);
    for (const n of map.nodes) if (n.kind === 'combat' || n.kind === 'elite') expect(n.content).toBeTruthy();
  });
});
