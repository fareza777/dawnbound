import Phaser from 'phaser';
import { vx, vy } from '@/core/viewport';

/**
 * Vertically scrolling, masked container with drag + inertia (touch) and mouse wheel.
 * Children are added in content coordinates (0,0 = top-left of the viewport).
 * Taps on interactive children still work: a drag only starts after the finger moves a few pixels.
 */
export class ScrollPanel {
  readonly container: Phaser.GameObjects.Container;
  private maskGfx: Phaser.GameObjects.Graphics;
  private contentH = 0;
  private scrollY = 0;
  private velocity = 0;
  private dragging = false;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private lastY = 0;
  private lastT = 0;
  private pointerId: number | null = null;
  /** While true (e.g. a modal is open on top), drags and the wheel are ignored. */
  locked = false;
  private bar: Phaser.GameObjects.Rectangle;
  private cleanups: (() => void)[] = [];
  private disposed = false;
  moved = false;

  constructor(private scene: Phaser.Scene, readonly x: number, readonly y: number, readonly w: number, readonly h: number) {
    this.container = scene.add.container(x, y);
    this.maskGfx = scene.make.graphics({}, false);
    this.maskGfx.fillStyle(0xffffff).fillRect(x, y, w, h);
    this.container.setMask(this.maskGfx.createGeometryMask());
    this.bar = scene.add.rectangle(x + w - 2, y, 2, 20, 0xffffff, 0.3).setOrigin(0, 0).setVisible(false);
    const listen = <T extends unknown[]>(event: string, handler: (...args: T) => void) => {
      scene.input.on(event, handler);
      this.cleanups.push(() => scene.input.off(event, handler));
    };
    const inside = (p: Phaser.Input.Pointer) => this.contains(p);
    listen('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.locked || !inside(p) || this.pointerId !== null) return;
      this.pointerId = p.id;
      this.dragStartY = vy(p);
      this.dragStartScroll = this.scrollY;
      this.lastY = vy(p);
      this.lastT = performance.now();
      this.velocity = 0;
      this.dragging = false;
      this.moved = false;
    });
    listen('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      if (!this.dragging && Math.abs(vy(p) - this.dragStartY) > 6) this.dragging = true;
      if (!this.dragging) return;
      this.moved = true;
      const now = performance.now();
      const dy = vy(p) - this.lastY;
      const dt = Math.max(1, now - this.lastT);
      this.velocity = (dy / dt) * 16;
      this.lastY = vy(p);
      this.lastT = now;
      this.setScroll(this.dragStartScroll - (vy(p) - this.dragStartY));
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      this.pointerId = null;
      this.dragging = false;
    };
    listen('pointerup', end);
    listen('pointerupoutside', end);
    listen('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (!this.locked && inside(p)) this.setScroll(this.scrollY + dy * 0.5);
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private tick(): void {
    if (!this.dragging && Math.abs(this.velocity) > 0.1) {
      this.setScroll(this.scrollY - this.velocity);
      this.velocity *= 0.92;
    }
  }

  add(o: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): this {
    this.container.add(o);
    return this;
  }

  /** Move existing scene objects into the scroll viewport without changing their visible positions. */
  adopt(objects: Phaser.GameObjects.GameObject[]): this {
    for (const obj of objects) {
      const transform = obj as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
      transform.x -= this.x;
      transform.y -= this.y;
    }
    return this.add(objects);
  }

  /** Both objects should join the owning modal layer so the scroll bar shares its depth and fade. */
  get displayObjects(): Phaser.GameObjects.GameObject[] {
    return [this.container, this.bar];
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanups.forEach((off) => off());
    this.cleanups = [];
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.container.clearMask(true);
    this.container.destroy();
    this.bar.destroy();
    this.maskGfx.destroy();
  }

  clear(): void {
    this.container.removeAll(true);
    this.velocity = 0;
    this.dragging = false;
    this.pointerId = null;
    this.moved = false;
    this.scrollY = 0;
    this.container.y = this.y;
  }

  setContentHeight(h: number): void {
    this.contentH = h;
    this.setScroll(this.scrollY);
  }

  get maxScroll(): number {
    return Math.max(0, this.contentH - this.h);
  }

  /** Masks hide pixels, so card handlers must also reject taps outside this viewport. */
  contains(p: Phaser.Input.Pointer): boolean {
    return vx(p) >= this.x && vx(p) <= this.x + this.w && vy(p) >= this.y && vy(p) <= this.y + this.h;
  }

  setScroll(v: number): void {
    this.scrollY = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.container.y = Math.round(this.y - this.scrollY);
    this.clipInput();
    const max = this.maxScroll;
    this.bar.setVisible(max > 0);
    if (max > 0) {
      const bh = Math.max(16, (this.h * this.h) / this.contentH);
      this.bar.height = bh;
      this.bar.y = this.y + (this.scrollY / max) * (this.h - bh);
    }
  }

  /** Masks only hide pixels: switch off taps for rows scrolled out of the window so hidden items can't be hit. */
  private clipInput(): void {
    const top = this.y;
    const bottom = this.y + this.h;
    for (const o of this.container.list) {
      const g = o as Phaser.GameObjects.GameObject & { input?: Phaser.Types.Input.InteractiveObject | null; getBounds?: () => Phaser.Geom.Rectangle };
      if (!g.input || !g.getBounds) continue;
      const cy = g.getBounds().centerY;
      g.input.enabled = cy >= top && cy <= bottom;
    }
  }

  /** True if the last pointer interaction was a drag (use to ignore taps after scrolling). */
  get wasDrag(): boolean {
    return this.moved;
  }
}
