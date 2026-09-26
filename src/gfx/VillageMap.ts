import Phaser from 'phaser';
import { FLOWER_PATCHES, GRASS_FLOOR, LG, M, TILES_KEY, tileFrame, type TileRef } from '@/data/biomes';
import { Rng } from '@/core/rng';

export const VW = 24;
export const VH = 32;
const T = 16;

export interface VillageProp {
  frame: string;
  x: number;
  y: number;
  /** Collision box (world px, relative to the prop's bottom-centre). */
  box?: { w: number; h: number };
  scale?: number;
  anim?: string;
  light?: { r: number; tint: number; dy?: number; flicker?: number };
  depthBias?: number;
  tint?: number;
}

/** Hand-authored village layout drawn procedurally onto a render texture, plus prop placements. */
export class VillageMap {
  readonly ground: Phaser.GameObjects.RenderTexture;
  readonly props: VillageProp[] = [];
  private path = new Set<number>();

  constructor(private scene: Phaser.Scene) {
    this.ground = scene.add.renderTexture(0, 0, VW * T, VH * T).setOrigin(0, 0).setDepth(-1000);
    this.layoutPaths();
    this.drawGround();
    this.layoutProps();
  }

  private addPath(x0: number, y0: number, x1: number, y1: number): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.path.add(y * VW + x);
  }

  isPath(x: number, y: number): boolean {
    return this.path.has(y * VW + x);
  }

  private layoutPaths(): void {
    this.addPath(11, 4, 12, 29); // main north-south road
    this.addPath(8, 13, 15, 18); // lantern plaza
    this.addPath(4, 12, 10, 13); // to smithy
    this.addPath(13, 12, 19, 13); // to alchemist
    this.addPath(5, 6, 10, 7); // to library
    this.addPath(13, 6, 18, 7); // to shrine
    this.addPath(4, 20, 10, 21); // to training yard
    this.addPath(13, 20, 18, 21); // to market
    this.addPath(13, 24, 21, 25); // to Nyx
  }

  private drawGround(): void {
    const rng = new Rng('village');
    const rt = this.ground;
    const g = this.scene.make.graphics({}, false);
    g.fillStyle(0x1a2a18, 1).fillRect(0, 0, VW * T, VH * T);
    rt.draw(g);
    g.destroy();
    for (let y = 0; y < VH; y++) {
      for (let x = 0; x < VW; x++) {
        let t: TileRef;
        if (this.isPath(x, y)) {
          const edge = !this.isPath(x - 1, y) || !this.isPath(x + 1, y) || !this.isPath(x, y - 1) || !this.isPath(x, y + 1);
          t = edge && rng.chance(0.5) ? M(3, 36) : M(2, 36);
        } else {
          // Speckled grass mix (same palette, so no blocky squares) with the odd flower patch.
          t = rng.weighted(GRASS_FLOOR);
        }
        rt.drawFrame(TILES_KEY, tileFrame(t), x * T, y * T);
        if (!this.isPath(x, y) && rng.chance(0.05)) {
          rt.drawFrame(TILES_KEY, tileFrame(rng.weighted(FLOWER_PATCHES)), x * T, y * T);
        } else if (!this.isPath(x, y) && rng.chance(0.12)) {
          const tuft = rng.chance(0.5) ? LG(40, 11) : LG(40, 13);
          rt.drawFrame(TILES_KEY, tileFrame(tuft), x * T, y * T);
        }
      }
    }
    // Plaza mosaic under the Lantern
    for (const [x, y] of [[11, 15], [12, 15], [11, 16], [12, 16]]) {
      const t = M(2, 38);
      rt.drawFrame(TILES_KEY, tileFrame(t), x * T, y * T);
    }
  }

  private p(frame: string, tx: number, ty: number, opts: Partial<VillageProp> = {}): void {
    this.props.push({ frame, x: tx * T + 8, y: ty * T + 16, ...opts });
  }

  private layoutProps(): void {
    const rng = new Rng('village-props');
    // Tree border
    const treeFrames = ['p/tree_02', 'p/tree_04', 'p/tree_11', 'p/tree_12', 'p/tree_13', 'p/tree_06', 'p/tree_07'];
    for (let y = 1; y < VH; y += 2) {
      for (const x of [0, VW - 1]) this.p(rng.pick(treeFrames), x, y, { box: { w: 14, h: 8 } });
    }
    for (let x = 1; x < VW - 1; x += 2) {
      if (x < 9 || x > 14) this.p(rng.pick(treeFrames), x, 1, { box: { w: 14, h: 8 } });
      this.p(rng.pick(treeFrames), x, VH - 1, { box: { w: 14, h: 8 } });
    }
    // Buildings
    this.p('p/house_13', 5, 5, { box: { w: 44, h: 22 } });
    this.p('p/house_08', 5, 11, { box: { w: 66, h: 24 } });
    this.p('p/house_10', 19, 11, { box: { w: 70, h: 24 } });
    this.p('p/house_01', 3, 28, { box: { w: 54, h: 20 } });
    this.p('p/house_05', 20, 29, { box: { w: 54, h: 20 } });
    this.p('p/house_16', 16, 28, { box: { w: 40, h: 20 } });
    this.p('p/house_17', 7, 28, { box: { w: 40, h: 20 } });
    // Smithy yard
    this.p('fire/fire_barrel_01', 8, 12, { light: { r: 40, tint: 0xff9a4a, flicker: 0.3 } });
    this.p('p/barrel_01', 3, 12, { box: { w: 12, h: 6 } });
    this.p('p/crate_01', 2, 12, { box: { w: 12, h: 6 } });
    // Alchemist yard
    this.p('p/pot_10', 16, 11, { box: { w: 10, h: 6 } });
    this.p('p/pot_13', 15, 11, { box: { w: 10, h: 6 } });
    this.p('p/potted_plant_03', 22, 12, {});
    // Library
    this.p('p/book_06', 8, 6, {});
    this.p('p/lamp_02', 9, 5, { light: { r: 44, tint: 0xffd9a0, dy: -22, flicker: 0.1 } });
    // Shrine of spirits (Liora)
    this.p('p/torii_02', 18, 5, { box: { w: 70, h: 6 } });
    this.p('p/statue_01', 18, 4, { box: { w: 20, h: 8 }, light: { r: 50, tint: 0xfff0a0, dy: -24 } });
    // Lantern shrine (centre)
    this.p('p/torii_01', 12, 13, { box: { w: 8, h: 6 } });
    this.p('p/lamp_14', 10, 15, { light: { r: 38, tint: 0xffc070, dy: -70, flicker: 0.1 } });
    this.p('p/lamp_15', 14, 15, { light: { r: 38, tint: 0xffc070, dy: -70, flicker: 0.1 } });
    // Garden plots (drawn by HubScene) and fence
    for (let x = 19; x <= 22; x++) this.p('p/crate_07', x, 18, { box: { w: 14, h: 6 }, scale: 0.9 });
    // Market (Pip)
    this.p('p/crate_08', 16, 21, { box: { w: 30, h: 10 } });
    this.p('p/barrel_02', 18, 21, { box: { w: 12, h: 6 } });
    this.p('p/barrel_03', 19, 21, { box: { w: 12, h: 6 } });
    this.p('p/lamp_01', 15, 20, { light: { r: 42, tint: 0xffd9a0, dy: -22, flicker: 0.1 } });
    // Campfire (Finn)
    this.p('fire/fire_camp_01', 9, 23, { light: { r: 64, tint: 0xffa050, flicker: 0.35 } });
    this.p('p/rock_04', 8, 24, {});
    // Training yard fence posts
    this.p('p/column_07', 3, 21, { box: { w: 10, h: 6 } });
    this.p('p/column_07', 8, 21, { box: { w: 10, h: 6 } });
    // Nyx corner
    this.p('p/tree_31', 22, 25, { box: { w: 16, h: 8 } });
    this.p('p/lamp_07', 20, 26, { light: { r: 36, tint: 0xb080ff, dy: -8, flicker: 0.2 }, tint: 0xc0a0ff });
    // Lamps along the road
    for (const [x, y] of [[10, 8], [13, 10], [10, 20], [13, 24], [10, 27]]) {
      this.p('p/lamp_03', x, y, { light: { r: 40, tint: 0xffd9a0, dy: -24, flicker: 0.08 } });
    }
    // Flowers and rocks for texture
    const flowerFrames = ['p/potted_plant_01', 'p/potted_plant_05', 'p/potted_plant_09', 'p/rock_05', 'p/rock_12', 'p/rock_21'];
    for (let i = 0; i < 22; i++) {
      const x = rng.int(2, VW - 3);
      const y = rng.int(3, VH - 3);
      if (this.isPath(x, y) || this.props.some((pp) => Math.abs(pp.x - (x * T + 8)) < 20 && Math.abs(pp.y - (y * T + 16)) < 20)) continue;
      this.p(rng.pick(flowerFrames), x, y, {});
    }
  }
}
