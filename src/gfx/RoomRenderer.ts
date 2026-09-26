import Phaser from 'phaser';
import { TILES_KEY, tileFrame, type BiomeTheme, type TileRef } from '@/data/biomes';
import { CELL, cellAt, TOP_WALL, type RoomLayout } from '@/systems/roomgen';
import { Rng } from '@/core/rng';

export const TILE = 16;


/**
 * Bakes the static parts of a room (floor, liquids, walls, shading) into render textures:
 * one layer under the actors and one "front" layer (bottom wall) drawn over them.
 */
export class RoomRenderer {
  readonly under: Phaser.GameObjects.RenderTexture;
  readonly front: Phaser.GameObjects.RenderTexture;
  private g: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private layout: RoomLayout, private theme: BiomeTheme, seed: number) {
    const w = layout.w * TILE;
    const h = layout.h * TILE;
    this.under = scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setDepth(-1000);
    this.front = scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setDepth(100000);
    this.g = scene.make.graphics({}, false);
    const rng = new Rng(seed);
    this.drawFloor(rng);
    this.drawLiquids();
    this.drawTopWall();
    this.drawInnerWalls();
    this.drawSideWalls();
    this.drawShading();
    this.g.destroy();
  }

  private tile(rt: Phaser.GameObjects.RenderTexture, t: TileRef, x: number, y: number, alpha = 1): void {
    if (alpha >= 1) rt.drawFrame(TILES_KEY, tileFrame(t), x * TILE, y * TILE);
    else {
      const img = this.scene.make.image({ key: TILES_KEY, frame: tileFrame(t) }, false).setOrigin(0, 0).setAlpha(alpha);
      rt.draw(img, x * TILE, y * TILE);
      img.destroy();
    }
  }

  private pick(rng: Rng, list: [TileRef, number][]): TileRef {
    return rng.weighted(list);
  }

  private drawFloor(rng: Rng): void {
    const l = this.layout;
    const alt = new Set(l.altFloor.map((p) => p.y * l.w + p.x));
    this.g.clear();
    this.g.fillStyle(this.theme.wall.ceiling, 1).fillRect(0, 0, l.w * TILE, l.h * TILE);
    this.under.draw(this.g);
    for (let y = TOP_WALL; y < l.h - 1; y++) {
      for (let x = 1; x < l.w - 1; x++) {
        const c = cellAt(l, x, y);
        if (c === CELL.Wall || c === CELL.Pit) continue;
        const list = alt.has(y * l.w + x) ? this.theme.floorAlt : this.theme.floor;
        this.tile(this.under, this.pick(rng, list), x, y);
      }
    }
    for (const d of l.decals) {
      if (cellAt(l, d.x, d.y) !== CELL.Floor || this.theme.decals.length === 0) continue;
      this.tile(this.under, this.theme.decals[d.v % this.theme.decals.length][0], d.x, d.y);
    }
  }

  private drawLiquids(): void {
    const l = this.layout;
    for (let y = TOP_WALL; y < l.h - 1; y++) {
      for (let x = 1; x < l.w - 1; x++) {
        const c = cellAt(l, x, y);
        if (c === CELL.Liquid) {
          if (this.theme.hazard === 'spikes') {
            // Raised spike trap over the floor tile already drawn beneath it.
            this.under.drawFrame('props', 'trap/trap_1/3', x * TILE, y * TILE);
            continue;
          }
          if (this.theme.hazard === 'pit') this.drawPit(x, y);
          else this.tile(this.under, this.theme.hazardTile, x, y);
          // Liquid edge: lighter lip where it meets floor above.
          if (cellAt(l, x, y - 1) !== CELL.Liquid) {
            this.g.clear();
            this.g.fillStyle(0x000000, 0.35).fillRect(x * TILE, y * TILE, TILE, 3);
            this.under.draw(this.g);
          }
        } else if (c === CELL.Pit) {
          this.drawPit(x, y);
        }
      }
    }
  }

  private drawPit(x: number, y: number): void {
    const l = this.layout;
    this.g.clear();
    this.g.fillStyle(0x05040a, 1).fillRect(x * TILE, y * TILE, TILE, TILE);
    const above = cellAt(l, x, y - 1);
    if (above !== CELL.Pit && above !== CELL.Liquid) {
      this.g.fillStyle(0x2a2436, 1).fillRect(x * TILE, y * TILE, TILE, 5);
      this.g.fillStyle(0x151120, 1).fillRect(x * TILE, y * TILE + 5, TILE, 3);
    }
    this.under.draw(this.g);
  }

  private drawTopWall(): void {
    const l = this.layout;
    const wall = this.theme.wall;
    for (let x = 0; x < l.w; x++) {
      const piece = x <= 0 ? 0 : x >= l.w - 1 ? 2 : (x - 1) % 4 === 0 ? 0 : (x - 1) % 4 === 3 ? 2 : 1;
      this.tile(this.under, wall.cap[piece], x, 0);
      this.tile(this.under, wall.faceRows[1][piece], x, 1);
      this.tile(this.under, wall.faceRows[2][piece], x, 2);
    }
    for (let x = 1; x < l.w - 1; x++) {
      if (cellAt(l, x, TOP_WALL) !== CELL.Wall) this.tile(this.under, wall.shadow[1], x, TOP_WALL, 0.55);
    }
  }

  private drawInnerWalls(): void {
    const l = this.layout;
    const wall = this.theme.wall;
    for (let y = TOP_WALL; y < l.h - 1; y++) {
      for (let x = 1; x < l.w - 1; x++) {
        if (cellAt(l, x, y) !== CELL.Wall) continue;
        this.tile(this.under, wall.faceRows[1][1], x, y);
        this.g.clear();
        this.g.fillStyle(wall.ceiling, 1).fillRect(x * TILE, y * TILE - 6, TILE, 6);
        this.g.fillStyle(wall.rim, 1).fillRect(x * TILE, y * TILE - 1, TILE, 1);
        this.under.draw(this.g);
        if (cellAt(l, x, y + 1) === CELL.Floor) this.tile(this.under, wall.shadow[1], x, y + 1, 0.45);
      }
    }
  }

  private drawSideWalls(): void {
    const l = this.layout;
    const wall = this.theme.wall;
    this.g.clear();
    // Left / right walls: dark tops with a rim towards the floor.
    this.g.fillStyle(wall.ceiling, 1);
    this.g.fillRect(0, TILE * TOP_WALL, TILE, (l.h - TOP_WALL) * TILE);
    this.g.fillRect((l.w - 1) * TILE, TILE * TOP_WALL, TILE, (l.h - TOP_WALL) * TILE);
    this.g.fillStyle(wall.rim, 1);
    this.g.fillRect(TILE - 2, TILE * TOP_WALL, 2, (l.h - TOP_WALL - 1) * TILE);
    this.g.fillRect((l.w - 1) * TILE, TILE * TOP_WALL, 2, (l.h - TOP_WALL - 1) * TILE);
    this.g.fillStyle(0x000000, 0.25);
    this.g.fillRect(TILE, TILE * TOP_WALL, 3, (l.h - TOP_WALL - 1) * TILE);
    this.g.fillRect((l.w - 1) * TILE - 3, TILE * TOP_WALL, 3, (l.h - TOP_WALL - 1) * TILE);
    this.under.draw(this.g);
    // Bottom wall is in front of actors.
    this.g.clear();
    this.g.fillStyle(wall.ceiling, 1).fillRect(0, (l.h - 1) * TILE, l.w * TILE, TILE);
    this.g.fillStyle(wall.rim, 1).fillRect(TILE - 2, (l.h - 1) * TILE, (l.w - 2) * TILE + 4, 2);
    this.front.draw(this.g);
  }

  private drawShading(): void {
    const l = this.layout;
    // Soft ambient occlusion on floor cells next to solid cells.
    this.g.clear();
    this.g.fillStyle(0x000000, 0.18);
    for (let y = TOP_WALL; y < l.h - 1; y++) {
      for (let x = 1; x < l.w - 1; x++) {
        const c = cellAt(l, x, y);
        if (c !== CELL.Floor && c !== CELL.Trap) continue;
        if (cellAt(l, x, y - 1) === CELL.Obstacle) this.g.fillRect(x * TILE, y * TILE, TILE, 2);
      }
    }
    this.under.draw(this.g);
  }

  destroy(): void {
    this.under.destroy();
    this.front.destroy();
  }
}
