import { describe, expect, it } from 'vitest';
import { FlowField } from '@/game/FlowField';
import { CELL, type RoomLayout } from '@/systems/roomgen';

const T = 16;

/** 5x5 room with a wall column at x=2 (rows 0-3); the only gap is at the bottom row. */
function wallRoom(): RoomLayout {
  const w = 5;
  const h = 5;
  const cells = new Uint8Array(w * h).fill(CELL.Floor);
  for (let y = 0; y < 4; y++) cells[y * w + 2] = CELL.Wall;
  return {
    w, h, cells, template: 'test', entry: { x: 0, y: 4 }, exit: { x: 4, y: 0 },
    spawns: [], obstacles: [], breakables: [], torches: [], decals: [], altFloor: [],
  };
}

const centre = (tx: number, ty: number) => ({ x: tx * T + 8, y: ty * T + 8 });

describe('FlowField', () => {
  it('routes around a wall instead of walking into it', () => {
    const f = new FlowField(wallRoom());
    const target = centre(4, 0);
    f.update(target.x, target.y);
    const from = centre(0, 0);
    const d = f.dirFrom(from.x, from.y, target.x, target.y);
    // The straight line points right (+x) into the wall; the path goes down towards the gap.
    expect(d.y).toBeGreaterThan(0.5);
  });

  it('steps off a blocked tile toward a reachable neighbour', () => {
    const f = new FlowField(wallRoom());
    const target = centre(4, 0);
    f.update(target.x, target.y);
    // Feet overlapping the wall column at (2,1): must not return the straight line (which is up-right).
    const from = centre(2, 1);
    const d = f.dirFrom(from.x, from.y, target.x, target.y);
    const straight = { x: target.x - from.x, y: target.y - from.y };
    const len = Math.hypot(straight.x, straight.y);
    const dot = d.x * (straight.x / len) + d.y * (straight.y / len);
    expect(dot).toBeLessThan(0.99);
    expect(d.x).toBeGreaterThan(0);
  });
});
