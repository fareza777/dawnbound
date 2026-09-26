/** One-time room setup: keyboard controls, wall/liquid colliders, obstacle props and the follow camera. */
import Phaser from 'phaser';
import { controls } from '@/game/input';
import { CELL, cellAt, TOP_WALL } from '@/systems/roomgen';
import { TILE } from '@/gfx/RoomRenderer';
import { worldZoom } from '@/core/viewport';
import type { RoomScene } from '../RoomScene';

/** Extra camera room below the bottom wall so the hero never sits under the touch controls. */
const BOTTOM_SLACK = 96;
/** How far (world px) the camera leads in the direction the hero is moving. */
const LOOK_AHEAD = 18;

export function setupKeyboard(room: RoomScene): void {
  const kb = room.input.keyboard;
  if (!kb) return;
  const keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,SPACE,SHIFT,Q,E,F') as Record<string, Phaser.Input.Keyboard.Key>;
  let kbMoving = false;
  let kbAttack = false;
  room.events.on(Phaser.Scenes.Events.UPDATE, () => {
    const x = (keys.D.isDown || keys.RIGHT.isDown ? 1 : 0) - (keys.A.isDown || keys.LEFT.isDown ? 1 : 0);
    const y = (keys.S.isDown || keys.DOWN.isDown ? 1 : 0) - (keys.W.isDown || keys.UP.isDown ? 1 : 0);
    if (x !== 0 || y !== 0) {
      controls.moveX = x;
      controls.moveY = y;
      kbMoving = true;
    } else if (kbMoving) {
      controls.moveX = 0;
      controls.moveY = 0;
      kbMoving = false;
    }
    const atk = keys.J.isDown || keys.SPACE.isDown;
    if (atk) controls.attackHeld = true;
    else if (kbAttack) controls.attackHeld = false;
    kbAttack = atk;
    if (Phaser.Input.Keyboard.JustDown(keys.K) || Phaser.Input.Keyboard.JustDown(keys.SHIFT)) controls.dash = true;
    if (Phaser.Input.Keyboard.JustDown(keys.L) || Phaser.Input.Keyboard.JustDown(keys.Q)) controls.skill = true;
    if (Phaser.Input.Keyboard.JustDown(keys.F)) controls.flare = true;
    if (Phaser.Input.Keyboard.JustDown(keys.E)) controls.interact = true;
  });
}

// ------------------------------------------------------------------ building
export function buildColliders(room: RoomScene): void {
  room.solids = room.physics.add.staticGroup();
  room.liquids = room.physics.add.staticGroup();
  const l = room.layout;
  for (let y = 0; y < l.h; y++) {
    let runStart = -1;
    let runKind = -1;
    for (let x = 0; x <= l.w; x++) {
      const c = x < l.w ? cellAt(l, x, y) : -1;
      const kind = c === CELL.Wall || c === CELL.Obstacle ? 0 : c === CELL.Pit || c === CELL.Liquid ? 1 : -1;
      if (kind !== runKind) {
        if (runKind >= 0) {
          const zx = runStart * TILE;
          const w = (x - runStart) * TILE;
          const zy = y * TILE + (runKind === 0 && y >= TOP_WALL ? 4 : 0);
          const h = runKind === 0 && y >= TOP_WALL ? TILE - 4 : TILE;
          const z = room.add.zone(zx + w / 2, zy + h / 2, w, h);
          (runKind === 0 ? room.solids : room.liquids).add(z);
        }
        runStart = x;
        runKind = kind;
      }
    }
  }
  room.enemyGroup = room.physics.add.group();
}

export function buildProps(room: RoomScene): void {
  const theme = room.biome.theme;
  for (const o of room.layout.obstacles) {
    const frame = theme.obstacles[o.v % theme.obstacles.length];
    if (!room.textures.get('props').has(frame)) continue;
    const img = room.add.image(o.x * TILE + 8, o.y * TILE + 15, 'props', frame).setOrigin(0.5, 1);
    const maxW = TILE * 1.6;
    if (img.width > maxW) img.setScale(maxW / img.width);
    img.setDepth(o.y * TILE + 14);
    room.add.image(o.x * TILE + 8, o.y * TILE + 14, 'fx_shadow').setScale(1.3, 1.2).setDepth(o.y * TILE - 5);
  }
  for (const b of room.layout.breakables) room.addBreakable(b.x, b.y, b.v);
  for (const tpos of room.layout.torches) {
    const wx = tpos.x * TILE + 8;
    const onTop = tpos.y < TOP_WALL;
    const wy = onTop ? tpos.y * TILE + 22 : tpos.y * TILE + 4;
    const key = room.biome.theme.torch;
    if (room.anims.exists(key)) {
      const s = room.add.sprite(wx + (onTop ? 0 : tpos.x === 0 ? 4 : -4), wy, 'props').play(key).setDepth(onTop ? 5 : wy + 20);
      s.anims.setProgress(Math.random());
    }
    room.lighting.add({ x: wx, y: wy + 4, radius: onTop ? 46 : 38, tint: room.biome.theme.lightTint, flicker: 0.15 });
  }
}

export function setupCamera(room: RoomScene): void {
  const cam = room.cameras.main;
  cam.setOrigin(0.5).setZoom(worldZoom(2));
  // Let the view scroll past the bottom wall so the hero never sits under the touch controls.
  cam.setBounds(0, 0, room.roomWidth, room.roomHeight + BOTTOM_SLACK);
  // Sub-pixel follow: camera roundPixels floors the scroll to whole world pixels (several device pixels at this
  // zoom) and the lerp then stalls and jumps, which reads as stutter. The renderer already snaps to device pixels.
  cam.startFollow(room.player.zone, false, 0.12, 0.12);
  cam.setFollowOffset(0, -28);
  cam.setBackgroundColor(room.biome.theme.wall.ceiling);
  if (room.save.settings.quality === 'high') {
    cam.postFX?.addVignette(0.5, 0.5, 0.92, 0.35);
  }
}

// ------------------------------------------------------------------ flow
/** Ease the camera a little ahead of the direction the hero is moving. */
export function lookAhead(room: RoomScene, dt: number): void {
  const off = room.cameras.main.followOffset;
  const k = 1 - Math.exp(-dt * 3);
  off.x += (-controls.moveX * LOOK_AHEAD - off.x) * k;
  off.y += (-28 - controls.moveY * LOOK_AHEAD * 0.6 - off.y) * k;
}
