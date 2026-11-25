import { cellAt, isWalkable, TOP_WALL, type RoomLayout } from './roomgen';

export interface BoundsRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Playable interior rectangle excluding all outer walls (top 3 rows, left/right/bottom 1 row). */
export function playableBounds(layout: RoomLayout, tile = 16): BoundsRect {
  return {
    left: tile,
    top: TOP_WALL * tile,
    right: (layout.w - 1) * tile,
    bottom: (layout.h - 1) * tile,
  };
}

export function isCellWalkableAt(layout: RoomLayout, px: number, py: number, tile = 16): boolean {
  return isWalkable(cellAt(layout, Math.floor(px / tile), Math.floor(py / tile)));
}

/** True when a circle of `radius` at `(x, y)` fits inside `playableBounds` and (if non-flying) covers only walkable cells. */
export function isCircleClear(layout: RoomLayout, x: number, y: number, radius: number, flying = false, tile = 16): boolean {
  const b = playableBounds(layout, tile);
  if (x - radius < b.left || x + radius > b.right || y - radius < b.top || y + radius > b.bottom) return false;
  if (flying) return true;
  const insetR = Math.max(0, radius - 1);
  const x0 = Math.floor((x - insetR) / tile);
  const x1 = Math.floor((x + insetR) / tile);
  const y0 = Math.floor((y - insetR) / tile);
  const y1 = Math.floor((y + insetR) / tile);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isWalkable(cellAt(layout, tx, ty))) return false;
    }
  }
  return true;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Nearest walkable position to `(x, y)` where a circle of `radius` fits cleanly. */
export function findSafeSpotNear(layout: RoomLayout, x: number, y: number, radius: number, flying = false, tile = 16): { x: number; y: number } {
  const b = playableBounds(layout, tile);
  const minX = b.left + radius;
  const maxX = Math.max(minX, b.right - radius);
  const minY = b.top + radius;
  const maxY = Math.max(minY, b.bottom - radius);
  const cx = clamp(x, minX, maxX);
  const cy = clamp(y, minY, maxY);
  if (flying || isCircleClear(layout, cx, cy, radius, false, tile)) return { x: cx, y: cy };

  let bestClear: { x: number; y: number; d2: number } | null = null;
  let bestWalk: { x: number; y: number; d2: number } | null = null;
  for (let ty = TOP_WALL; ty <= layout.h - 2; ty++) {
    for (let tx = 1; tx <= layout.w - 2; tx++) {
      if (!isWalkable(cellAt(layout, tx, ty))) continue;
      const sx = clamp(tx * tile + tile / 2, minX, maxX);
      const sy = clamp(ty * tile + tile / 2, minY, maxY);
      const d2 = (sx - cx) * (sx - cx) + (sy - cy) * (sy - cy);
      if (isCircleClear(layout, sx, sy, radius, false, tile)) {
        if (!bestClear || d2 < bestClear.d2) bestClear = { x: sx, y: sy, d2 };
      } else if (isCellWalkableAt(layout, sx, sy, tile)) {
        if (!bestWalk || d2 < bestWalk.d2) bestWalk = { x: sx, y: sy, d2 };
      }
    }
  }
  if (bestClear) return { x: bestClear.x, y: bestClear.y };
  if (bestWalk) return { x: bestWalk.x, y: bestWalk.y };
  return { x: layout.entry.x * tile + tile / 2, y: layout.entry.y * tile + tile / 2 };
}

/**
 * Clamp an actor's position inside `playableBounds` and rescue it if it tunneled into a non-walkable cell.
 * `wasBlocked` is true only when a non-walkable tile or flying OOB forced a rescue (not normal outer-wall slides).
 */
export function clampToWalkable(
  layout: RoomLayout,
  x: number,
  y: number,
  radius: number,
  prevX: number,
  prevY: number,
  flying = false,
  tile = 16,
): { x: number; y: number; corrected: boolean; wasBlocked: boolean } {
  const b = playableBounds(layout, tile);
  const minX = b.left + radius;
  const maxX = Math.max(minX, b.right - radius);
  const minY = b.top + radius;
  const maxY = Math.max(minY, b.bottom - radius);
  const cx = clamp(x, minX, maxX);
  const cy = clamp(y, minY, maxY);
  const outOfBounds = cx !== x || cy !== y;
  if (flying) return { x: cx, y: cy, corrected: outOfBounds, wasBlocked: outOfBounds };
  if (isCellWalkableAt(layout, cx, cy, tile)) return { x: cx, y: cy, corrected: outOfBounds, wasBlocked: false };

  if (prevX >= minX && prevX <= maxX && prevY >= minY && prevY <= maxY && isCellWalkableAt(layout, prevX, prevY, tile)) {
    return { x: prevX, y: prevY, corrected: true, wasBlocked: true };
  }
  const safe = findSafeSpotNear(layout, cx, cy, radius, false, tile);
  return { x: safe.x, y: safe.y, corrected: true, wasBlocked: true };
}
