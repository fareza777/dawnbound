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
  moved = false;

  constructor(scene: Phaser.Scene, readonly x: number, readonly y: number, readonly w: number, readonly h: number) {
    this.container = scene.add.container(x, y);
    this.maskGfx = scene.make.graphics({}, false);
    this.maskGfx.fillStyle(0xffffff).fillRect(x, y, w, h);
    this.container.setMask(this.maskGfx.createGeometryMask());
    this.bar = scene.add.rectangle(x + w - 2, y, 2, 20, 0xffffff, 0.3).setOrigin(0, 0).setVisible(false);
    const inside = (p: Phaser.Input.Pointer) => vx(p) >= x && vx(p) <= x + w && vy(p) >= y && vy(p) <= y + h;
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
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
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
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
    scene.input.on('pointerup', end);
    scene.input.on('pointerupoutside', end);
    scene.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (!this.locked && inside(p)) this.setScroll(this.scrollY + dy * 0.5);
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
      this.maskGfx.destroy();
    });
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

  clear(): void {
    this.container.removeAll(true);
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
