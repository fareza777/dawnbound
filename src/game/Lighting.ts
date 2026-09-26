import Phaser from 'phaser';

export interface Light {
  x: number;
  y: number;
  radius: number;
  tint: number;
  intensity: number;
  flicker: number;
  /** Strength of the additive coloured glow (0 = darkness cut-out only). */
  glow: number;
  ttl: number;
  maxTtl: number;
  follow?: { x: number; y: number };
  followOffsetY?: number;
}

/**
 * Darkness overlay: a render texture filled with the ambient darkness each frame, with soft light shapes erased
 * out of it, plus additive coloured glows. The darkness texture is small (world resolution) but linearly filtered,
 * so light falloff stays smooth at any zoom instead of showing stepped rings.
 */
export class Lighting {
  private rt: Phaser.GameObjects.RenderTexture;
  private eraser: Phaser.GameObjects.Image;
  private glows: Phaser.GameObjects.Image[] = [];
  lights: Light[] = [];
  darkness: number;
  private time = 0;

  constructor(private scene: Phaser.Scene, w: number, h: number, darkness: number, private enabled: boolean) {
    this.darkness = darkness;
    this.rt = scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setDepth(90000);
    this.rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.eraser = scene.make.image({ key: 'fx_light' }, false);
    if (!enabled) this.rt.setVisible(false);
  }

  add(l: Partial<Light> & { x: number; y: number; radius: number }): Light {
    const light: Light = {
      tint: 0xffd9a0, intensity: 1, flicker: 0, glow: 0.22, ttl: -1, maxTtl: -1, ...l,
    };
    if (light.ttl > 0) light.maxTtl = light.ttl;
    this.lights.push(light);
    return light;
  }

  remove(l: Light): void {
    this.lights = this.lights.filter((x) => x !== l);
  }

  update(dt: number): void {
    this.time += dt;
    for (const l of this.lights) {
      if (l.follow) {
        l.x = l.follow.x;
        l.y = l.follow.y + (l.followOffsetY ?? 0);
      }
      if (l.ttl > 0) l.ttl -= dt;
    }
    this.lights = this.lights.filter((l) => l.ttl === -1 || l.ttl > 0);
    if (!this.enabled) return;
    const rt = this.rt;
    rt.clear();
    rt.fill(0x05030c, this.darkness);
    let gi = 0;
    for (const l of this.lights) {
      const life = l.maxTtl > 0 ? Math.max(0, l.ttl / l.maxTtl) : 1;
      const flick = l.flicker > 0 ? 1 + Math.sin(this.time * 9 + l.x) * l.flicker * 0.5 + Math.sin(this.time * 23 + l.y) * l.flicker * 0.3 : 1;
      const r = l.radius * flick * (l.maxTtl > 0 ? 0.6 + life * 0.4 : 1);
      // fx_light fades to zero at its edge, so it is drawn a bit larger than the nominal radius.
      this.eraser.setScale((r * 2.6) / 128);
      this.eraser.setAlpha(Math.min(1, l.intensity * life));
      rt.erase(this.eraser, l.x, l.y);
      if (l.glow <= 0) continue;
      let g = this.glows[gi];
      if (!g) {
        g = this.scene.add.image(0, 0, 'fx_light').setBlendMode(Phaser.BlendModes.ADD).setDepth(89999);
        this.glows.push(g);
      }
      gi++;
      g.setVisible(true).setPosition(l.x, l.y).setTint(l.tint);
      g.setScale((r * 1.8) / 128);
      g.setAlpha(l.glow * l.intensity * life);
    }
    for (let i = gi; i < this.glows.length; i++) this.glows[i].setVisible(false);
  }

  destroy(): void {
    this.rt.destroy();
    this.eraser.destroy();
    this.glows.forEach((g) => g.destroy());
  }
}
