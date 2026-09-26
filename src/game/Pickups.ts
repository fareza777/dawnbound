import Phaser from 'phaser';
import type { ItemInstance } from '@/data/types';
import { RARITY_COLORS } from '@/ui/theme';
import { snapWorld } from '@/core/viewport';

export type PickupKind = 'gold' | 'xp' | 'heart' | 'material' | 'item' | 'key' | 'embers';

export interface Pickup {
  kind: PickupKind;
  value: number;
  id?: string;
  item?: ItemInstance;
  img: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  beam?: Phaser.GameObjects.Image;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  magnet: boolean;
  alive: boolean;
}

const TEX: Record<PickupKind, string> = {
  gold: 'pk_coin', xp: 'pk_ember', heart: 'pk_heart', material: 'pk_gem', item: 'pk_gem', key: 'pk_key', embers: 'pk_ember',
};

/** Loot that pops out of enemies, bounces, then magnets to the player. */
export class Pickups {
  list: Pickup[] = [];

  constructor(private scene: Phaser.Scene, private onCollect: (p: Pickup) => void) {}

  spawn(kind: PickupKind, x: number, y: number, value: number, extra: { id?: string; item?: ItemInstance; icon?: string } = {}): Pickup {
    const tex = extra.icon && this.scene.textures.exists(extra.icon) ? extra.icon : TEX[kind];
    const img = this.scene.add.image(x, y, tex);
    if (extra.icon && this.scene.textures.exists(extra.icon)) img.setDisplaySize(12, 12);
    if (kind === 'embers') img.setTint(0xff5a2a).setScale(1.3);
    const a = Math.random() * Math.PI * 2;
    const sp = kind === 'item' ? 20 : 30 + Math.random() * 40;
    const p: Pickup = {
      kind, value, id: extra.id, item: extra.item, img, x, y, z: 0,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: 70 + Math.random() * 50,
      age: 0, magnet: false, alive: true,
    };
    if (kind === 'xp' || kind === 'embers') {
      img.setBlendMode('ADD');
      p.glow = this.scene.add.image(x, y, 'fx_light_px').setTint(0xff9a3c).setBlendMode('ADD').setAlpha(0.35).setScale(0.25);
    }
    if (kind === 'item' && extra.item) {
      const color = RARITY_COLORS[extra.item.rarity];
      p.beam = this.scene.add.image(x, y, 'fx_door').setTint(color).setBlendMode('ADD').setOrigin(0.5, 1).setScale(0.35, 2.2).setAlpha(0.7);
      p.glow = this.scene.add.image(x, y, 'fx_light_px').setTint(color).setBlendMode('ADD').setAlpha(0.5).setScale(0.4);
      this.scene.tweens.add({ targets: p.beam, alpha: 0.35, yoyo: true, repeat: -1, duration: 600 });
    }
    this.list.push(p);
    return p;
  }

  update(dt: number, px: number, py: number, radius: number, bounds: { w: number; h: number }): void {
    for (const p of this.list) {
      if (!p.alive) continue;
      p.age += dt;
      // Pop arc
      if (p.z > 0 || p.vz > 0) {
        p.vz -= 320 * dt;
        p.z = Math.max(0, p.z + p.vz * dt);
        if (p.z === 0 && p.vz < 0) p.vz = Math.abs(p.vz) > 40 ? -p.vz * 0.35 : 0;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
      p.x = Phaser.Math.Clamp(p.x, 20, bounds.w - 20);
      p.y = Phaser.Math.Clamp(p.y, 56, bounds.h - 20);
      const dx = px - p.x;
      const dy = py - p.y;
      const d = Math.hypot(dx, dy);
      const autoMagnet = p.kind !== 'item';
      if (p.age > 0.35 && autoMagnet && (d < radius || p.magnet)) p.magnet = true;
      if (p.magnet) {
        const sp = 90 + p.age * 160;
        p.x += (dx / (d || 1)) * sp * dt;
        p.y += (dy / (d || 1)) * sp * dt;
      }
      if (p.age > 0.3 && d < (p.kind === 'item' ? 10 : 7)) {
        p.alive = false;
        this.onCollect(p);
        this.destroy(p);
        continue;
      }
      const bob = p.kind === 'item' || p.kind === 'heart' ? Math.sin(p.age * 4) * 1.5 : 0;
      p.img.setPosition(snapWorld(p.x), snapWorld(p.y - p.z - 3 + bob)).setDepth(p.y);
      if (p.kind === 'gold') p.img.setScale(Math.abs(Math.cos(p.age * 6)) * 0.7 + 0.3, 1);
      p.glow?.setPosition(p.x, p.y - p.z - 3).setDepth(p.y - 1);
      p.beam?.setPosition(p.x, p.y - 2).setDepth(p.y - 2);
    }
    if (this.list.length > 50) this.list = this.list.filter((p) => p.alive);
  }

  magnetAll(kinds: PickupKind[] = ['gold', 'xp', 'heart', 'material', 'embers', 'key']): void {
    for (const p of this.list) if (p.alive && kinds.includes(p.kind)) p.magnet = true;
  }

  private destroy(p: Pickup): void {
    p.img.destroy();
    p.glow?.destroy();
    p.beam?.destroy();
  }

  clear(): void {
    for (const p of this.list) this.destroy(p);
    this.list = [];
  }
}
