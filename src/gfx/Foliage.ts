import Phaser from 'phaser';
import type { Rng } from '@/core/rng';

export interface FoliageCell {
  x: number;
  y: number;
}

interface Blade {
  sprite: Phaser.GameObjects.Sprite;
  rustle: number;
}

/** Small flowers and plants scattered on grass (static, painted into the floor). */
const FLOWERS = ['plant/17/2', 'plant/17/4', 'plant/13/2', 'plant/6/2', 'plant/16/2', 'plant/20/2', 'plant/18/2', 'plant/12/2', 'plant/14/2'];
const SWAY = 'tallgrass_back';
const TILE = 16;

/**
 * Living grass for grassy areas: soft light/shade patches so the green is never one flat colour, flowers and
 * sprouts, and tall grass that sways and rustles (with a few leaves) when the hero walks through it.
 */
export class Foliage {
  private blades: Blade[] = [];
  private timer = 0;

  constructor(
    private scene: Phaser.Scene,
    floor: Phaser.GameObjects.RenderTexture,
    cells: FoliageCell[],
    rng: Rng,
    opts: { flowers: number; grass: number; patches: number },
  ) {
    const props = scene.textures.get('props');
    // Soft colour patches: darker moss and sunlit spots break up the tile grid.
    const patch = scene.make.image({ key: 'fx_light' }, false).setBlendMode(Phaser.BlendModes.NORMAL);
    for (let i = 0; i < Math.round(cells.length * opts.patches); i++) {
      const c = rng.pick(cells);
      const sunlit = rng.chance(0.4);
      patch.setTint(sunlit ? 0xd8f0a0 : 0x1f4a1c).setAlpha(sunlit ? 0.14 : 0.2).setScale(rng.float(0.35, 0.8));
      floor.draw(patch, c.x * TILE + 8, c.y * TILE + 8);
    }
    patch.destroy();
    for (const c of cells) {
      if (rng.chance(opts.flowers)) {
        const frame = rng.pick(FLOWERS);
        if (!props.has(frame)) continue;
        const img = scene.make.image({ key: 'props', frame }, false).setOrigin(0.5, 1);
        floor.draw(img, c.x * TILE + rng.int(4, 12), c.y * TILE + rng.int(10, 16));
        img.destroy();
      } else if (rng.chance(opts.grass) && scene.anims.exists(SWAY)) {
        const s = scene.add.sprite(c.x * TILE + rng.int(3, 13), c.y * TILE + rng.int(12, 16), 'props').setOrigin(0.5, 1);
        s.setDepth(s.y - 2).play(SWAY);
        s.anims.timeScale = rng.float(0.35, 0.55);
        s.anims.setProgress(rng.float(0, 1));
        this.blades.push({ sprite: s, rustle: 0 });
      }
    }
  }

  /** Grass near `x,y` rustles: faster sway, a small bend and a couple of leaves. */
  update(dt: number, x: number, y: number, moving: boolean): void {
    this.timer -= dt;
    const check = this.timer <= 0;
    if (check) this.timer = 0.08;
    for (const b of this.blades) {
      if (check && moving && b.rustle <= 0 && Math.abs(b.sprite.x - x) < 10 && Math.abs(b.sprite.y - y) < 8) {
        b.rustle = 0.5;
        b.sprite.anims.timeScale = 2.2;
        this.scene.tweens.add({ targets: b.sprite, angle: x < b.sprite.x ? 12 : -12, duration: 90, yoyo: true, ease: 'Sine.easeOut' });
        this.leaves(b.sprite.x, b.sprite.y - 6);
      }
      if (b.rustle > 0) {
        b.rustle -= dt;
        if (b.rustle <= 0) b.sprite.anims.timeScale = 0.45;
      }
    }
  }

  private leaves(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      const leaf = this.scene.add.rectangle(x, y, 2, 1, i ? 0x9fd18a : 0x6fae4f).setDepth(y + 20);
      this.scene.tweens.add({
        targets: leaf, x: x + Phaser.Math.Between(-10, 10), y: y - Phaser.Math.Between(4, 10), angle: Phaser.Math.Between(-90, 90), alpha: 0,
        duration: 420, ease: 'Quad.easeOut', onComplete: () => leaf.destroy(),
      });
    }
  }
}
