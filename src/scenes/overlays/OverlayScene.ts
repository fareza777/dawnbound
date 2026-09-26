import Phaser from 'phaser';
import { COLORS, FONT } from '@/ui/theme';
import { Button, dimmer, label, panel } from '@/ui/widgets';
import { services } from '@/core/services';
import type { SaveData } from '@/data/types';
import type { RoomScene } from '../RoomScene';
import { view } from '@/core/viewport';

export interface OverlayData {
  room?: RoomScene | null;
  from?: string;
}

/**
 * Modal scene drawn over a paused scene. Closing resumes the scene it was launched from.
 * Subclasses build their content inside `body` (a container positioned at the panel's inner top-left).
 */
/** When each overlay last shut down: a start right after its own shutdown is an in-place restart (tab switch). */
const lastShutdown = new Map<string, number>();

export abstract class OverlayScene extends Phaser.Scene {
  protected room: RoomScene | null = null;
  protected from = 'Room';
  protected panelX = 0;
  protected panelY = 0;
  protected panelW = 0;
  protected panelH = 0;
  private unregisterBack?: () => void;
  private dim?: Phaser.GameObjects.Rectangle;
  private panelObj?: Phaser.GameObjects.NineSlice;
  protected closing = false;

  init(data: OverlayData): void {
    this.room = data.room ?? null;
    this.from = data.from ?? (data.room ? 'Room' : 'RunMap');
    this.closing = false;
    // launch() keeps registration order, and the Room lifts its Hud to the top: always draw modals above both.
    this.scene.bringToTop();
  }

  get W(): number {
    return view.w;
  }

  get H(): number {
    return view.h;
  }

  get save(): SaveData {
    return services.save!.data;
  }

  /** Standard frame: dimmer, ornate panel and title. Returns the inner content rect. */
  protected frame(title: string, h = 0.78, closable = true): { x: number; y: number; w: number; h: number } {
    // Re-assert the layer: the room may have lifted its Hud after this overlay was launched.
    this.scene.bringToTop();
    this.dim = dimmer(this, 0.78);
    const pw = Math.min(this.W - 16, 380);
    const ph = Math.round(this.H * h);
    this.panelW = pw;
    this.panelH = ph;
    this.panelX = Math.round((this.W - pw) / 2);
    this.panelY = Math.round((this.H - ph) / 2);
    this.panelObj = panel(this, this.panelX, this.panelY, pw, ph, 'ui_panel_ornate');
    label(this, this.W / 2, this.panelY + 10, title, FONT.title, COLORS.gold, 0.5, 0);
    if (closable) {
      new Button(this, this.panelX + pw - 18, this.panelY + 16, 'X', () => this.close(), { w: 24, h: 22, font: FONT.head });
    }
    this.unregisterBack = services.platform?.onBack(() => {
      if (!this.scene.isActive()) return false;
      if (closable) this.close();
      return true;
    });
    const key = this.scene.key;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unregisterBack?.();
      lastShutdown.set(key, performance.now());
    });
    // Fade in when opened, but not when restarted in place (tab switches would flicker out and back in).
    const restarted = performance.now() - (lastShutdown.get(key) ?? -1e9) < 120;
    if (!restarted) {
      this.cameras.main.setAlpha(0);
      this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 140 });
    }
    return { x: this.panelX + 12, y: this.panelY + 40, w: pw - 24, h: ph - 52 };
  }

  /**
   * Shrink the panel so it ends `pad` below `bottom` (the lowest content y) and re-centre everything on screen.
   * Call last in create(), after all content is placed; objects are moved as a whole, so layout stays intact.
   * Returns how far everything moved down (to offset positions kept for later rebuilds).
   */
  protected fitTo(bottom: number, pad = 16): number {
    const old = this.panelObj;
    if (!old) return 0;
    const newH = Math.round(Math.min(this.panelH, Math.max(140, bottom - this.panelY + pad)));
    const dy = Math.round((this.panelH - newH) / 2);
    if (dy <= 0) return 0;
    const fresh = panel(this, this.panelX, this.panelY, this.panelW, newH, 'ui_panel_ornate');
    this.children.moveTo(fresh, this.children.getIndex(old));
    old.destroy();
    this.panelObj = fresh;
    for (const obj of this.children.list) {
      if (obj === this.dim) continue;
      const o = obj as unknown as { y?: number };
      if (typeof o.y === 'number') o.y += dy;
    }
    this.panelY += dy;
    this.panelH = newH;
    return dy;
  }

  close(after?: () => void): void {
    if (this.closing) return;
    this.closing = true;
    services.audio?.sfx('ui_close', { volume: 0.6 });
    this.tweens.add({
      targets: this.cameras.main, alpha: 0, duration: 120,
      onComplete: () => {
        const from = this.from;
        this.scene.stop();
        if (this.scene.isPaused(from)) this.scene.resume(from);
        after?.();
      },
    });
  }
}
