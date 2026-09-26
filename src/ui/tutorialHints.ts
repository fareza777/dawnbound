import Phaser from 'phaser';
import { COLORS, FONT } from './theme';
import { t } from '@/core/i18n';
import { services } from '@/core/services';
import type { RoomScene } from '@/scenes/RoomScene';
import { view } from '@/core/viewport';
import { nine } from './skin';

/** Hud button a hint can point at (centre + radius, in Hud coordinates). */
export interface HintTarget {
  key: string;
  x: number;
  y: number;
  r: number;
}

interface HintDef {
  id: string;
  /** Hud button to highlight while the hint is shown. */
  button?: string;
  when: (room: RoomScene, elapsed: number) => boolean;
}

const HINTS: HintDef[] = [
  { id: 'move', button: 'attack', when: (_r, el) => el > 0.8 },
  { id: 'dash', button: 'dash', when: (r, el) => el > 9 && r.enemies.some((e) => e.alive) },
  { id: 'skill', button: 'skill', when: (r, el) => el > 16 && r.player.skillCd <= 0 && r.enemies.some((e) => e.alive) },
  { id: 'potion', button: 'potion', when: (r) => r.player.hp < r.player.maxHp * 0.4 && r.player.potions > 0 },
  { id: 'flare', button: 'flare', when: (r) => r.player.flare >= 100 },
  { id: 'interact', button: 'interact', when: (r) => !!r.nearestInteractable() },
  { id: 'exit', when: (r) => r.cleared && !r.enemies.some((e) => e.alive) },
];

const SHOW_MS = 4800;

/**
 * One-time contextual tips for a player's first runs. Each tip fires once when its situation first happens,
 * is remembered in save flags, and marks the tutorial done after the last one.
 */
export class TutorialHints {
  private elapsed = 0;
  private busyUntil = 0;
  private shown: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private scene: Phaser.Scene,
    private room: RoomScene,
    private targets: () => HintTarget[],
  ) {}

  private get done(): boolean {
    return services.save!.data.profile.tutorialDone;
  }

  update(dt: number): void {
    // Tips wait (and hide) while a modal pauses the room, so they never cover an event or shop.
    const paused = !this.room.scene.isActive();
    for (const o of this.shown) (o as Phaser.GameObjects.Image).setVisible(!paused);
    if (paused) {
      this.busyUntil = Math.max(this.busyUntil, this.scene.time.now + 600);
      return;
    }
    if (this.done || !this.room.player?.alive) return;
    this.elapsed += dt;
    if (this.scene.time.now < this.busyUntil) return;
    const flags = services.save!.data.flags;
    const next = HINTS.find((h) => !flags[`hint_${h.id}`] && h.when(this.room, this.elapsed));
    if (next) this.show(next);
  }

  private show(h: HintDef): void {
    const s = services.save!.data;
    s.flags[`hint_${h.id}`] = 1;
    if (HINTS.every((x) => s.flags[`hint_${x.id}`])) s.profile.tutorialDone = true;
    services.save!.markDirty();
    this.busyUntil = this.scene.time.now + SHOW_MS + 600;

    const { w: W, h: H } = view;
    const y = Math.round(H * 0.3);
    const txt = this.scene.add.bitmapText(W / 2, y, FONT.body, t(`hint_${h.id}`))
      .setOrigin(0.5).setMaxWidth(W - 70).setCenterAlign().setTint(COLORS.text).setDepth(46);
    const bg = nine(this.scene, W / 2, y, 'ui_panel_ornate', Math.min(W - 40, txt.width + 28), txt.height + 18)
      .setDepth(45).setAlpha(0.95);
    const tag = this.scene.add.bitmapText(W / 2, y - bg.displayHeight / 2 - 1, FONT.small, t('hintTag'))
      .setOrigin(0.5, 1).setTint(COLORS.gold).setDepth(46);
    const objs: Phaser.GameObjects.GameObject[] = [bg, txt, tag];
    this.shown = objs;

    const target = h.button ? this.targets().find((b) => b.key === h.button) : undefined;
    if (target) {
      const ring = this.scene.add.circle(target.x, target.y, target.r + 4).setStrokeStyle(3, COLORS.gold, 1).setDepth(44);
      this.scene.tweens.add({ targets: ring, scale: 1.25, alpha: 0.2, yoyo: true, repeat: -1, duration: 520 });
      objs.push(ring);
    }
    for (const o of [bg, txt, tag]) o.setAlpha(0);
    this.scene.tweens.add({ targets: [bg, txt, tag], alpha: 1, duration: 220 });
    services.audio?.sfx('ui_page', { volume: 0.6 });
    this.scene.time.delayedCall(SHOW_MS, () => this.hide(objs));
  }

  private hide(objs: Phaser.GameObjects.GameObject[]): void {
    this.scene.tweens.killTweensOf(objs);
    this.scene.tweens.add({
      targets: objs, alpha: 0, duration: 300,
      onComplete: () => {
        objs.forEach((o) => o.destroy());
        if (this.shown === objs) this.shown = [];
      },
    });
  }
}
