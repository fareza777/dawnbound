import Phaser from 'phaser';
import { FONT } from '@/ui/theme';
import { services } from '@/core/services';
import { view } from '@/core/viewport';
import { nine } from '@/ui/skin';

/** Toast height per top scene: under the combat HUD bar, under the village quest tracker, or at the very top of menus. */
const TOAST_Y: Record<string, number> = { Room: 58, Hud: 58, RunMap: 58, Hub: 96, HubHud: 96 };

interface Pending {
  text: string;
  color: number;
  sfx?: string;
}

/** Always-on overlay for toasts (quest updates, achievements, bounties). Queues messages so they never overlap. */
export class NotifyScene extends Phaser.Scene {
  private queue: Pending[] = [];
  private busy = false;

  constructor() {
    super({ key: 'Notify', active: false });
  }

  create(): void {
    services.notify = (text, color = 0xe8b04b, sfx) => {
      this.queue.push({ text, color, sfx });
      if (!this.busy) this.next();
    };
    // Persistent scene, so its loader survives scene changes while the SFX sprite downloads and decodes.
    this.load.audioSprite('sfx', 'assets/audio/sfx.json', ['assets/audio/sfx.mp3']);
    this.load.once('complete', () => services.audio?.markReady());
    this.load.start();
  }

  /** Where to place a toast so it never covers the title or buttons of whatever is on screen. */
  private toastY(): number {
    const top = this.game.scene.getScenes(true).filter((sc) => sc !== this).pop();
    return top ? TOAST_Y[top.scene.key] ?? 18 : 58;
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.busy = false;
      return;
    }
    this.busy = true;
    this.scene.bringToTop();
    if (item.sfx) services.audio?.sfx(item.sfx, { volume: 0.8 });
    const W = view.w;
    const y = this.toastY();
    const txt = this.add.bitmapText(W / 2, y, FONT.body, item.text).setOrigin(0.5).setTint(item.color).setMaxWidth(W - 60).setCenterAlign();
    const bg = nine(this, W / 2, y, 'ui_panel_ornate', Math.min(W - 24, txt.width + 28), txt.height + 14);
    this.children.bringToTop(txt);
    const objs = [bg, txt];
    for (const o of objs) {
      o.setAlpha(0);
      o.y -= 16;
    }
    this.tweens.add({ targets: objs, alpha: 1, y: '+=16', duration: 220, ease: 'Back.easeOut' });
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: objs, alpha: 0, y: '-=12', duration: 220,
        onComplete: () => {
          objs.forEach((o) => o.destroy());
          this.next();
        },
      });
    });
  }
}
