import { CELL, cellAt, isWalkable, type RoomLayout } from '@/systems/roomgen';

const TILE = 16;
const DIRS8: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
];

/**
 * Dijkstra distance map from the player's tile over walkable cells. Rebuilt only when the player changes tile.
 * Enemies step toward the neighbour with the smallest distance, which routes them around obstacles and liquids.
 */
export class FlowField {
  private dist: Float32Array;
  private target = -1;
  private blocked: Uint8Array;

  constructor(private layout: RoomLayout) {
    this.dist = new Float32Array(layout.w * layout.h).fill(Infinity);
    this.blocked = new Uint8Array(layout.w * layout.h);
    this.refreshBlocked();
  }

  refreshBlocked(): void {
    const l = this.layout;
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) this.blocked[y * l.w + x] = isWalkable(cellAt(l, x, y)) ? 0 : 1;
    this.target = -1;
  }

  /** Mark a breakable as destroyed so paths can go through. */
  open(tx: number, ty: number): void {
    this.layout.cells[ty * this.layout.w + tx] = CELL.Floor;
    this.refreshBlocked();
  }

  update(px: number, py: number): void {
    const l = this.layout;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    const t = ty * l.w + tx;
    if (t === this.target) return;
    this.target = t;
    this.dist.fill(Infinity);
    if (tx < 0 || ty < 0 || tx >= l.w || ty >= l.h) return;
    // Simple bucketed Dijkstra (grid is tiny).
    const open: number[] = [t];
    this.dist[t] = 0;
    let head = 0;
    while (head < open.length) {
      const i = open[head++];
      const x = i % l.w;
      const y = (i / l.w) | 0;
      const d = this.dist[i];
      for (const [dx, dy, c] of DIRS8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= l.w || ny >= l.h) continue;
        const ni = ny * l.w + nx;
        if (this.blocked[ni]) continue;
        // No corner cutting past solid cells.
        if (dx !== 0 && dy !== 0 && (this.blocked[y * l.w + nx] || this.blocked[ny * l.w + x])) continue;
        const nd = d + c;
        if (nd < this.dist[ni]) {
          this.dist[ni] = nd;
          open.push(ni);
        }
      }
    }
  }

  /** Unit vector towards the player for an enemy at (x, y). Falls back to a straight line. */
  dirFrom(x: number, y: number, px: number, py: number): { x: number; y: number } {
    const l = this.layout;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const straight = () => {
      const dx = px - x;
      const dy = py - y;
      const d = Math.hypot(dx, dy) || 1;
      return { x: dx / d, y: dy / d };
    };
    if (tx < 0 || ty < 0 || tx >= l.w || ty >= l.h) return straight();
    const here = this.dist[ty * l.w + tx];
    if (here <= 1.5) return straight();
    // Standing on a blocked tile (feet overlap a wall's inset collider): step to the best reachable neighbour
    // instead of pushing straight into the wall.
    const onBlocked = !isFinite(here);
    let best = here;
    let bx = 0;
    let by = 0;
    for (const [dx, dy] of DIRS8) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= l.w || ny >= l.h) continue;
      if (!onBlocked && dx !== 0 && dy !== 0 && (this.blocked[ty * l.w + nx] || this.blocked[ny * l.w + tx])) continue;
      const nd = this.dist[ny * l.w + nx];
      if (nd < best) {
        best = nd;
        bx = dx;
        by = dy;
      }
    }
    if (bx === 0 && by === 0) return straight();
    const cx = (tx + bx + 0.5) * TILE - x;
    const cy = (ty + by + 0.5) * TILE - y;
    const d = Math.hypot(cx, cy) || 1;
    return { x: cx / d, y: cy / d };
  }
}
