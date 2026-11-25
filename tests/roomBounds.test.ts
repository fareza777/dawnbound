import { describe, expect, it } from 'vitest';
import { Rng } from '@/core/rng';
import { CELL, generateRoom, TOP_WALL, type RoomLayout } from '@/systems/roomgen';
import { clampToWalkable, findSafeSpotNear, isCircleClear, playableBounds } from '@/systems/roomBounds';

const T = 16;

function makeTestRoom(w = 12, h = 18): RoomLayout {
  return generateRoom(new Rng(12345), { kind: 'combat', hazard: false, width: w, height: h });
}

describe('playableBounds', () => {
  it('excludes top 3 wall rows and 1-tile side/bottom walls', () => {
    const l = makeTestRoom(12, 18);
    expect(playableBounds(l, T)).toEqual({
      left: 16,
      top: TOP_WALL * 16,
      right: 11 * 16,
      bottom: 17 * 16,
    });
  });
});

describe('clampToWalkable', () => {
  it('rescues a hero who tunneled onto the top wall (Jolan screenshot position)', () => {
    const l = makeTestRoom(12, 18);
    const res = clampToWalkable(l, 24, 32, 5, 24, 56, false, T);
    expect(res.corrected).toBe(true);
    expect(res.y).toBeGreaterThanOrEqual(TOP_WALL * T + 5);
    expect(res.x).toBeGreaterThanOrEqual(T + 5);
  });

  it('restores a hero who tunneled into an interior obstacle back to prev safe spot', () => {
    const l = makeTestRoom(12, 18);
    // Place an explicit interior obstacle at (5, 8) -> px (80..96, 128..144)
    l.cells[8 * l.w + 5] = CELL.Obstacle;
    l.cells[8 * l.w + 4] = CELL.Floor;
    const prevX = 4 * T + 8;
    const prevY = 8 * T + 8;
    const res = clampToWalkable(l, 5 * T + 8, 8 * T + 8, 5, prevX, prevY, false, T);
    expect(res.corrected).toBe(true);
    expect(res.wasBlocked).toBe(true);
    expect(res.x).toBe(prevX);
    expect(res.y).toBe(prevY);
  });

  it('finds a nearby walkable spot even when prev position is also blocked', () => {
    const l = makeTestRoom(12, 18);
    l.cells[8 * l.w + 5] = CELL.Wall;
    l.cells[8 * l.w + 4] = CELL.Floor;
    const res = clampToWalkable(l, 5 * T + 8, 8 * T + 8, 5, 5 * T + 8, 8 * T + 8, false, T);
    expect(res.corrected).toBe(true);
    expect(res.wasBlocked).toBe(true);
    expect(isCircleClear(l, res.x, res.y, 5, false, T)).toBe(true);
  });
});

describe('findSafeSpotNear', () => {
  it('keeps Minotaurus (radius 15) clear of walls when player hugs the top-left corner', () => {
    const l = generateRoom(new Rng(99), { kind: 'boss', hazard: false, width: 12, height: 24 });
    const spot = findSafeSpotNear(l, 21, 53, 15, false, T);
    expect(spot.x).toBeGreaterThanOrEqual(T + 15);
    expect(spot.y).toBeGreaterThanOrEqual(TOP_WALL * T + 15);
    expect(isCircleClear(l, spot.x, spot.y, 15, false, T)).toBe(true);
  });
});
