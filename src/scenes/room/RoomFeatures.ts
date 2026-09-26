/** Interactive room features: chests, shrines, campfire, merchant, event NPC and the post-fight rewards. */
import Phaser from 'phaser';
import { services } from '@/core/services';
import { bus } from '@/core/events';
import { t, tr } from '@/core/i18n';
import { FONT } from '@/ui/theme';
import { eventById } from '@/data/events';
import { ENEMIES } from '@/data/enemies';
import { TOP_WALL } from '@/systems/roomgen';
import { TILE } from '@/gfx/RoomRenderer';
import { RunManager, buildContext } from '@/game/RunManager';
import { toast } from '@/ui/widgets';
import { SPIRITS, SPIRIT_IDS, type SpiritId } from '@/data/boons';
import type { RoomScene } from '../RoomScene';

export class RoomFeatures {
  constructor(private room: RoomScene) {}

  spawnChest(x: number, y: number, size: 'small' | 'big'): void {
    const r = this.room;
    const variant = size === 'big' ? 'chest_chest_03' : 'chest_chest_01';
    const s = r.add.sprite(x, y, 'props', size === 'big' ? 'chest/chest_03/0' : 'chest/chest_01/0').setOrigin(0.5, 1).setDepth(y);
    const glow = r.add.image(x, y - 6, 'fx_light').setTint(0xffd84a).setBlendMode('ADD').setScale(0.35).setAlpha(0.4).setDepth(y - 1);
    r.tweens.add({ targets: glow, alpha: 0.15, yoyo: true, repeat: -1, duration: 800 });
    r.lighting.add({ x, y: y - 8, radius: 30, tint: 0xffd84a, flicker: 0.1 });
    r.addInteract({
      x, y: y - 4, label: t('open'), radius: 20, sprite: s, once: true,
      use: () => {
        if (r.anims.exists(variant)) s.play(variant);
        glow.destroy();
        r.sfx('chest_open', 0.9);
        services.platform?.haptic('medium');
        r.time.delayedCall(250, () => this.dropChestLoot(x, y - 8, size));
      },
    });
  }

  dropChestLoot(x: number, y: number, size: 'small' | 'big'): void {
    const r = this.room;
    const n = size === 'big' ? 2 : 1;
    const extra = Math.round(r.ctx.p('extra_chest'));
    for (let i = 0; i < n + extra; i++) r.dropItem(x, y, 'chest');
    for (let i = 0; i < 6 + r.depth * 2; i++) r.pickups.spawn('gold', x, y, 2 + r.depth);
    if (Math.random() < 0.5) r.pickups.spawn('embers', x, y, 5 + r.depth * 3);
    r.fx.burst(x, y, 0xffd84a, 20);
    r.lightFx(x, y, 60, 0xffd84a, 500);
  }

  spawnShrine(x: number, y: number, spirit: SpiritId): void {
    const r = this.room;
    const sp = SPIRITS[spirit];
    const s = r.add.image(x, y, 'props', 'p/statue_01').setOrigin(0.5, 1).setDepth(y).setTint(0xffffff);
    const aura = r.add.image(x, y - 20, 'fx_light').setTint(sp.color).setBlendMode('ADD').setScale(0.7).setAlpha(0.5).setDepth(y + 1);
    r.tweens.add({ targets: aura, scale: 0.8, alpha: 0.3, yoyo: true, repeat: -1, duration: 1200 });
    r.lighting.add({ x, y: y - 16, radius: 60, tint: sp.color, flicker: 0.1 });
    r.physics.add.existing(r.add.zone(x, y - 4, 20, 10), true);
    r.addInteract({
      x, y: y + 6, label: t('pray'), radius: 22, sprite: s, once: true,
      use: () => {
        aura.destroy();
        r.sfx('shrine', 0.9);
        bus.emit('shrineVisited', { spirit });
        r.openBoonPick('shrine', spirit);
      },
    });
  }

  spawnCampfire(x: number, y: number): void {
    const r = this.room;
    // Looping burning fire (the sheet's other rows are lighting/smoke one-shots), with embers drifting up.
    const fire = r.add.sprite(x, y, 'props', 'fire/campfire_burning/0').setOrigin(0.5, 1).setDepth(y).setScale(1.5);
    if (r.anims.exists('fire_campfire_burning')) fire.play('fire_campfire_burning');
    if (r.save.settings.quality !== 'low') {
      r.add.particles(x, y - 14, 'fx_px2', {
        x: { min: -5, max: 5 }, speedY: { min: -26, max: -12 }, speedX: { min: -6, max: 6 }, lifespan: { min: 700, max: 1300 },
        frequency: 140, alpha: { start: 1, end: 0 }, scale: { start: 1, end: 0.4 }, tint: [0xffd27a, 0xff9a3c, 0xff6a2f], blendMode: 'ADD',
      }).setDepth(y + 1);
    }
    r.lighting.add({ x, y: y - 8, radius: 80, tint: 0xffb060, flicker: 0.25 });
    r.lighting.darkness = Math.max(0.2, r.lighting.darkness - 0.15);
    r.addInteract({
      x, y: y + 6, label: t('rest'), radius: 22, sprite: fire, once: true,
      use: () => {
        r.sfx('campfire', 0.8);
        r.scene.pause();
        r.scene.launch('Rest', { room: r });
      },
    });
  }

  spawnMerchant(x: number, y: number): void {
    const r = this.room;
    // The merchant stands in front of the stall; the crate stack sits behind and to the side, never over them.
    const npc = r.add.sprite(x, y - 2, 'actors', 'npc12/walk/down/1').setOrigin(0.5, 1).setDepth(y - 2);
    if (r.anims.exists('npc12_walk_down')) npc.play('npc12_walk_down');
    npc.anims.pause(npc.anims.currentAnim?.frames[1]);
    r.add.image(x + 22, y - 10, 'props', 'p/crate_08').setOrigin(0.5, 1).setDepth(y - 10);
    r.add.image(x, y - 2, 'fx_shadow').setScale(1.1, 0.9).setDepth(y - 12);
    r.lighting.add({ x, y: y - 20, radius: 70, tint: 0xffd9a0, flicker: 0.1 });
    r.addInteract({
      x, y: y + 4, label: t('shop'), radius: 26, sprite: npc,
      use: () => {
        r.sfx('merchant', 0.8);
        r.scene.pause();
        r.scene.launch('Shop', { room: r });
      },
    });
  }

  /**
   * An encounter shows who (or what) waits in the room: its own sprite (a statue, a chest, a wounded knight...) or,
   * for spirits, a floating portrait, with its name above a glowing circle. Interacting opens the choice dialog.
   */
  spawnEventNpc(x: number, y: number): void {
    const r = this.room;
    const ev = eventById(r.roomData.content);
    const tint = 0xc8b0ff;
    const rune = r.add.image(x, y + 2, 'fx_ring_hd').setTint(tint).setBlendMode('ADD').setScale(0.55, 0.28).setAlpha(0.7).setDepth(y - 30);
    r.tweens.add({ targets: rune, alpha: 0.3, yoyo: true, repeat: -1, duration: 900 });
    const figure = this.encounterFigure(ev?.portrait, x, y);
    const top = figure.y - figure.displayHeight - 6;
    const name = r.add.bitmapText(x, top, FONT.small, ev ? tr(ev.speaker) : '?').setOrigin(0.5, 1).setTint(0xffe6a0).setDepth(y + 2);
    const mark = r.add.bitmapText(x, top - name.height - 1, FONT.head, '!').setOrigin(0.5, 1).setTint(0xffd84a).setDepth(y + 2);
    r.tweens.add({ targets: mark, y: mark.y - 3, yoyo: true, repeat: -1, duration: 600 });
    r.lighting.add({ x, y: y - 10, radius: 56, tint, flicker: 0.1 });
    if (!r.save.flags.encounterTip) {
      r.save.flags.encounterTip = 1;
      r.hudEvent('tip', t('encounterTip'));
    }
    r.addInteract({
      x, y: y + 4, label: t('interact'), radius: 26, sprite: figure, once: true,
      use: () => {
        mark.destroy();
        name.destroy();
        r.scene.pause();
        r.scene.launch('Event', { room: r, eventId: r.roomData.content });
      },
    });
  }

  /** World sprite for an encounter: its prop/actor frame, or a floating framed portrait for spirits and faces. */
  private encounterFigure(portrait: string | undefined, x: number, y: number): Phaser.GameObjects.Image {
    const r = this.room;
    const [atlas, frame] = portrait?.includes(':') ? portrait.split(':') : [portrait, undefined];
    if (atlas && frame && r.textures.exists(atlas) && r.textures.get(atlas).has(frame)) {
      const img = r.add.image(x, y + 4, atlas, frame).setOrigin(0.5, 1).setDepth(y);
      const f = img.frame;
      img.setScale(Math.min(atlas === 'battlers' ? 0.5 : 1.4, 34 / Math.max(f.height, 1)));
      return img;
    }
    // A face portrait: an apparition in a glowing frame, gently bobbing.
    const key = atlas && r.textures.exists(atlas) ? atlas : 'props';
    const img = key === 'props' ? r.add.image(x, y - 4, 'props', 'p/book_06').setOrigin(0.5, 1) : r.add.image(x, y - 6, key).setOrigin(0.5, 1).setDisplaySize(26, 26);
    img.setDepth(y);
    if (key !== 'props') {
      const glow = r.add.image(x, y - 19, 'fx_light').setTint(0xc8b0ff).setBlendMode('ADD').setScale(0.45).setAlpha(0.55).setDepth(y - 1);
      r.tweens.add({ targets: [img, glow], y: '-=3', yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
      img.setAlpha(0.92);
    }
    return img;
  }

  spawnReward(): void {
    const r = this.room;
    const reward = r.roomData.reward ?? 'gold';
    const x = r.player.x;
    const y = Math.max(r.player.y - 30, (TOP_WALL + 2) * TILE);
    const cx = Phaser.Math.Clamp(x, 40, r.roomWidth - 40);
    switch (reward) {
      case 'boon': this.spawnBoonOrb(cx, y); break;
      case 'gold': for (let i = 0; i < 10 + r.depth * 4; i++) r.pickups.spawn('gold', cx, y, 3 + r.depth); break;
      case 'item': r.dropItem(cx, y, 'chest'); break;
      case 'relic': this.spawnRelicPedestal(cx, y); break;
      case 'heal': r.pickups.spawn('heart', cx, y, Math.round(r.player.maxHp * 0.35)); break;
      case 'hammer': {
        const up = RunManager.upgradeRandomBoon(r.run, r.rng);
        if (up) {
          toast(r.scene.get('Hud'), t('boonTempered'), 0xffd84a);
          r.ctx = buildContext(r.save, r.run);
        } else for (let i = 0; i < 10; i++) r.pickups.spawn('gold', cx, y, 4 + r.depth);
        break;
      }
      case 'embers': for (let i = 0; i < 3; i++) r.pickups.spawn('embers', cx, y, 4 + r.depth * 3); break;
      case 'material': {
        const drops = r.biome.enemies.map((id) => ENEMIES[id].drop?.[0]).filter((x): x is string => !!x);
        for (let i = 0; i < 3; i++) if (drops.length) r.pickups.spawn('material', cx, y, 1, { id: r.rng.pick(drops) });
        break;
      }
    }
  }

  spawnBoonOrb(x: number, y: number): void {
    const r = this.room;
    const spirit = r.rng.pick(SPIRIT_IDS);
    const color = SPIRITS[spirit].color;
    const orb = r.add.image(x, y, 'proj_orb').setTint(color).setBlendMode('ADD').setScale(2.2).setDepth(y + 10);
    const glow = r.add.image(x, y, 'fx_light').setTint(color).setBlendMode('ADD').setScale(0.5).setAlpha(0.5).setDepth(y + 9);
    r.tweens.add({ targets: [orb, glow], y: y - 4, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
    r.lighting.add({ x, y, radius: 40, tint: color, flicker: 0.1 });
    r.addInteract({
      x, y: y + 6, label: t('take'), radius: 20, sprite: orb, once: true,
      use: () => {
        orb.destroy();
        glow.destroy();
        r.sfx('boon_orb', 0.9);
        r.openBoonPick('orb', spirit);
      },
    });
  }

  spawnRelicPedestal(x: number, y: number): void {
    const r = this.room;
    const relic = RunManager.relicOffer(r.run, r.rng, r.roomData.kind === 'elite' ? [['rare', 60], ['epic', 30], ['common', 10]] : [['common', 55], ['rare', 35], ['epic', 10]]);
    if (!relic) return;
    const ped = r.add.image(x, y + 6, 'props', 'p/column_07').setOrigin(0.5, 1).setDepth(y + 6).setScale(0.8);
    const iconKey = r.textures.exists(relic.icon) ? relic.icon : 'pk_gem';
    const icon = r.add.image(x, y - 14, iconKey).setDepth(y + 7);
    if (iconKey !== 'pk_gem') icon.setDisplaySize(14, 14);
    r.tweens.add({ targets: icon, y: y - 17, yoyo: true, repeat: -1, duration: 800 });
    r.lighting.add({ x, y: y - 12, radius: 36, tint: 0xb77cff, flicker: 0.1 });
    r.addInteract({
      x, y: y + 10, label: t('take'), radius: 20, sprite: ped, once: true,
      use: () => {
        icon.destroy();
        RunManager.addRelic(r.run, relic.id);
        r.ctx = buildContext(r.save, r.run);
        r.refreshPlayerStats();
        r.sfx('relic', 0.9);
        r.scene.get('Hud').events.emit('relicGained', relic.id);
      },
    });
  }
}
