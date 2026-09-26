import Phaser from 'phaser';
import { BaseScene } from '../BaseScene';
import { COLORS, FONT } from '@/ui/theme';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { bus } from '@/core/events';
import { VillageMap, VW, VH } from '@/gfx/VillageMap';
import { Lighting } from '@/game/Lighting';
import { controls, resetControls, take } from '@/game/input';
import { dirFromVector, type Dir } from '@/gfx/animations';
import { NPCS, type NpcDef } from '@/data/npcs';
import { CONVERSATIONS, IDLE } from '@/data/dialogues';
import { QUESTS, questById } from '@/data/quests';
import { claimQuest, refreshQuests, acceptQuest } from '@/systems/quests';
import { checkProgress } from '@/game/Progress';
import { openDialogue, type DialogueChoice } from '../overlays/DialogueScene';
import type { Line } from '@/data/dialogues';
import { heroDef } from '@/data/heroes';
import { RunManager } from '@/game/RunManager';
import { SEED_GROWTH } from '@/data/materials';
import { shakeCamera, snapWorld, worldZoom } from '@/core/viewport';
import { Foliage } from '@/gfx/Foliage';
import { Rng } from '@/core/rng';

const T = 16;

export interface HubSpot {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
  use: () => void;
  visible?: () => boolean;
}

/** The village of Emberhollow: walkable night-time hub with NPCs, services and the Rift. */
export class HubScene extends BaseScene {
  map!: VillageMap;
  lighting!: Lighting;
  avatar!: Phaser.GameObjects.Sprite;
  private body!: Phaser.Physics.Arcade.Body;
  private anchor!: Phaser.GameObjects.Zone;
  private shadow!: Phaser.GameObjects.Image;
  private facing: Dir = 'down';
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  spots: HubSpot[] = [];
  private npcSprites = new Map<string, { sprite: Phaser.GameObjects.Sprite; mark: Phaser.GameObjects.BitmapText }>();
  private dummy?: Phaser.GameObjects.Sprite;
  private foliage?: Foliage;
  private attackCd = 0;
  private attacking = 0;
  private skin = 1;

  constructor() {
    super('Hub');
  }

  create(): void {
    this.transitioning = false;
    this.spots = [];
    this.npcSprites.clear();
    this.fadeIn(600);
    services.audio?.playMusic('m_village');
    const s = this.save;
    this.skin = s.profile.skins.rowan ?? 1;
    this.physics.world.setBounds(T, T * 2, (VW - 2) * T, (VH - 3) * T);
    this.map = new VillageMap(this);
    this.lighting = new Lighting(this, VW * T, VH * T, 0.5, s.settings.quality === 'high');
    this.solids = this.physics.add.staticGroup();
    this.buildProps();
    this.buildRift();
    this.buildLantern();
    this.buildGarden();
    this.buildBoard();
    this.buildDummy();
    this.buildNpcs();
    this.buildAvatar();
    this.buildAmbience();
    this.buildFoliage();
    const cam = this.cameras.main;
    cam.setOrigin(0.5).setZoom(worldZoom(2)).setBounds(0, 0, VW * T, VH * T).startFollow(this.anchor, false, 0.12, 0.12).setFollowOffset(0, -20);
    cam.setBackgroundColor(0x0b0a14);
    if (s.settings.quality === 'high') cam.postFX?.addVignette(0.5, 0.5, 0.9, 0.3);
    this.scene.launch('HubHud', { hub: this });
    refreshQuests(s);
    checkProgress();
    this.handleBack(() => {
      this.scene.launch('HubMenu', { from: 'Hub' });
      this.scene.pause();
      return true;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting.destroy();
      resetControls();
      this.scene.stop('HubHud');
    });
    // First arrival: Maren speaks.
    if (!s.seenDialogues.includes('c_maren_wake')) this.time.delayedCall(900, () => this.talkTo('maren'));
    this.setupKeyboard();
  }

  private setupKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,J') as Record<string, Phaser.Input.Keyboard.Key>;
    let moving = false;
    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      const x = (keys.D.isDown || keys.RIGHT.isDown ? 1 : 0) - (keys.A.isDown || keys.LEFT.isDown ? 1 : 0);
      const y = (keys.S.isDown || keys.DOWN.isDown ? 1 : 0) - (keys.W.isDown || keys.UP.isDown ? 1 : 0);
      if (x || y) {
        controls.moveX = x;
        controls.moveY = y;
        moving = true;
      } else if (moving) {
        controls.moveX = 0;
        controls.moveY = 0;
        moving = false;
      }
      if (Phaser.Input.Keyboard.JustDown(keys.E) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) controls.interact = true;
      if (Phaser.Input.Keyboard.JustDown(keys.J)) controls.attackHeld = true;
    });
  }

  // ------------------------------------------------------------------ world
  private buildProps(): void {
    for (const p of this.map.props) {
      const isFrame = this.textures.get('props').has(p.frame) || this.textures.get('props').has(`${p.frame}/0`);
      if (!isFrame) continue;
      const animKey = p.frame.replace(/\//g, '_');
      const frame = this.textures.get('props').has(p.frame) ? p.frame : `${p.frame}/0`;
      const img = this.add.sprite(p.x, p.y, 'props', frame).setOrigin(0.5, 1).setDepth(p.y + (p.depthBias ?? 0));
      if (p.scale) img.setScale(p.scale);
      if (p.tint) img.setTint(p.tint);
      if (this.anims.exists(animKey)) img.play(animKey);
      if (p.box) {
        const z = this.add.zone(p.x, p.y - p.box.h / 2, p.box.w, p.box.h);
        this.solids.add(z);
      }
      if (p.light) this.lighting.add({ x: p.x, y: p.y + (p.light.dy ?? -8), radius: p.light.r, tint: p.light.tint, flicker: p.light.flicker ?? 0 });
    }
  }

  private spot(s: HubSpot): void {
    this.spots.push(s);
  }

  private buildRift(): void {
    const x = 12 * T;
    const y = 3 * T;
    const g = this.add.graphics().setDepth(y);
    g.fillStyle(0x05030c, 1).fillEllipse(x, y + 4, 44, 26);
    g.lineStyle(2, 0x7a4ad0, 1).strokeEllipse(x, y + 4, 44, 26);
    const swirl = this.add.image(x, y + 4, 'fx_light').setTint(0x9a5aff).setBlendMode('ADD').setScale(0.55, 0.3).setDepth(y + 1);
    this.tweens.add({ targets: swirl, alpha: 0.4, scaleX: 0.45, yoyo: true, repeat: -1, duration: 1400 });
    for (const dx of [-30, 30]) this.add.image(x + dx, y + 12, 'props', 'p/column_01').setOrigin(0.5, 1).setDepth(y + 12);
    this.add.particles(x, y + 4, 'fx_px2', {
      x: { min: -18, max: 18 }, y: { min: -6, max: 6 }, lifespan: 1600, speedY: { min: -24, max: -8 }, scale: { start: 1, end: 0 },
      tint: [0x9a5aff, 0xff5ad0], blendMode: 'ADD', frequency: 90,
    }).setDepth(y + 2);
    this.lighting.add({ x, y: y + 4, radius: 70, tint: 0xa070ff, flicker: 0.15 });
    this.spot({
      id: 'rift', x, y: y + 20, r: 30, label: t('enterRift'),
      use: () => {
        if (!this.save.flags.rift_open) {
          this.say('dorran', { en: 'Not yet, keeper. Train with me first — the Rift eats the untrained.', id: 'Belum, penjaga. Berlatih denganku dulu — Celah memakan yang tak terlatih.' });
          return;
        }
        this.openMenu('Descend');
      },
    });
  }

  private buildLantern(): void {
    const x = 12 * T;
    const y = 14 * T + 4;
    const core = this.add.sprite(x, y, 'props', 'crystal/cristal_3/0').setOrigin(0.5, 1).setDepth(y).setScale(1.2);
    if (this.anims.exists('crystal_cristal_3')) core.play('crystal_cristal_3');
    core.setTint(0xffd070);
    const glow = this.add.image(x, y - 16, 'fx_light').setTint(0xffb347).setBlendMode('ADD').setScale(0.8).setAlpha(0.55).setDepth(y + 1);
    this.tweens.add({ targets: glow, scale: 0.9, alpha: 0.35, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.easeInOut' });
    this.lighting.add({ x, y: y - 16, radius: 120, tint: 0xffc070, flicker: 0.06, intensity: 1 });
    this.add.particles(x, y - 16, 'fx_px2', {
      x: { min: -10, max: 10 }, lifespan: 2400, speedY: { min: -20, max: -6 }, speedX: { min: -6, max: 6 }, scale: { start: 1, end: 0 },
      tint: [0xffb347, 0xffe0a0], blendMode: 'ADD', frequency: 160,
    }).setDepth(y + 2);
    const z = this.add.zone(x, y - 4, 14, 8);
    this.solids.add(z);
    this.spot({
      id: 'lantern', x, y: y + 6, r: 22, label: t('lanternTree'),
      visible: () => this.save.unlocks.features.includes('lantern_tree'),
      use: () => this.openMenu('LanternTree'),
    });
  }

  private buildGarden(): void {
    const plots = this.save.garden;
    plots.forEach((p, i) => {
      const x = (19 + i) * T + 8;
      const y = 16 * T + 12;
      const soil = this.add.rectangle(x, y - 4, 14, 10, 0x4a3020).setDepth(y - 10);
      soil.setStrokeStyle(1, 0x2a1a10);
      if (p.seedId) {
        const plantIdx = { seed_moonpetal: 2, seed_sunroot: 3, seed_ghostcap: 7, seed_frostleaf: 9, seed_emberbloom: 4, seed_golden: 1 }[p.seedId] ?? 2;
        const grow = SEED_GROWTH[p.seedId];
        const elapsed = (this.save.stats.runs ?? 0) - p.plantedAtRun;
        const ratio = Math.min(1, elapsed / (grow?.runs ?? 1));
        const tex = this.textures.get('props');
        const frames = tex.getFrameNames().filter((f) => f.startsWith(`plant/${plantIdx}/`)).length || 1;
        const stage = Math.min(frames - 1, Math.floor(ratio * (frames - 1)));
        this.add.image(x, y, 'props', `plant/${plantIdx}/${stage}`).setOrigin(0.5, 1).setDepth(y);
        if (ratio >= 1) {
          const sparkle = this.add.image(x, y - 20, 'fx_spark').setTint(0xffd84a).setBlendMode('ADD').setDepth(y + 5);
          this.tweens.add({ targets: sparkle, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
        }
      }
    });
    this.spot({
      id: 'garden', x: 20 * T, y: 16 * T + 8, r: 30, label: t('garden'),
      visible: () => this.save.quests.mq_descend?.status === 'claimed',
      use: () => this.openMenu('Garden'),
    });
  }

  private buildBoard(): void {
    const x = 4 * T + 8;
    const y = 17 * T + 12;
    const g = this.add.graphics().setDepth(y);
    g.fillStyle(0x5a3a1a, 1).fillRect(x - 12, y - 22, 24, 16);
    g.fillStyle(0x3a2410, 1).fillRect(x - 11, y - 6, 3, 8).fillRect(x + 8, y - 6, 3, 8);
    g.fillStyle(0xe8dcc0, 1).fillRect(x - 9, y - 20, 7, 9).fillRect(x + 1, y - 19, 8, 6).fillRect(x - 3, y - 12, 6, 5);
    g.fillStyle(0xc03030, 1).fillRect(x - 6, y - 20, 1, 1).fillRect(x + 4, y - 19, 1, 1);
    this.solids.add(this.add.zone(x, y - 3, 24, 6));
    this.spot({
      id: 'board', x, y: y + 6, r: 20, label: t('bounties'),
      visible: () => this.save.quests.mq_descend?.status === 'claimed',
      use: () => this.openMenu('Bounties'),
    });
  }

  private buildDummy(): void {
    const x = 5 * T + 8;
    const y = 23 * T;
    this.dummy = this.add.sprite(x, y, 'actors', 'dummy/idle/down/0').setOrigin(0.5, 0.75).setDepth(y);
    this.solids.add(this.add.zone(x, y - 2, 12, 8));
  }

  private buildNpcs(): void {
    const s = this.save;
    for (const n of NPCS) {
      if (n.unlockAfter && s.quests[n.unlockAfter]?.status !== 'claimed') continue;
      const x = n.pos[0] * T + 8;
      const y = n.pos[1] * T + 12;
      const sprite = this.add.sprite(x, y, 'actors', `${n.sprite}/walk/down/1`).setOrigin(0.5, 1).setDepth(y);
      if (n.tint) sprite.setTint(n.tint).setAlpha(0.85);
      if (n.id === 'maren') {
        sprite.setBlendMode('ADD');
        this.tweens.add({ targets: sprite, y: y - 3, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.easeInOut' });
        this.lighting.add({ x, y: y - 10, radius: 30, tint: 0x9ec8ff, flicker: 0.1 });
      }
      this.add.image(x, y, 'fx_shadow').setDepth(y - 5);
      this.solids.add(this.add.zone(x, y - 3, 10, 6));
      const mark = this.add.bitmapText(x, y - 26, FONT.head, '').setOrigin(0.5).setDepth(10000);
      this.tweens.add({ targets: mark, y: y - 29, yoyo: true, repeat: -1, duration: 500 });
      this.npcSprites.set(n.id, { sprite, mark });
      this.spot({ id: `npc:${n.id}`, x, y: y + 4, r: 20, label: tr(n.name), use: () => this.talkTo(n.id) });
    }
    if (s.flags.cat_home) {
      const cat = this.add.sprite(15 * T, 20 * T + 8, 'actors', 'cat2/walk/down/1').setOrigin(0.5, 1).setDepth(20 * T + 8);
      if (this.anims.exists('cat2_walk_right')) cat.play('cat2_walk_right');
      this.tweens.add({ targets: cat, x: 17 * T, yoyo: true, repeat: -1, duration: 3000, onYoyo: () => cat.play('cat2_walk_left'), onRepeat: () => cat.play('cat2_walk_right') });
    }
    this.refreshMarks();
  }

  /** "!" = new quest or story, "?" = quest ready to hand in. */
  refreshMarks(): void {
    const s = this.save;
    for (const [id, { mark }] of this.npcSprites) {
      const ready = QUESTS.some((q) => q.giver === id && s.quests[q.id]?.status === 'complete');
      const story = CONVERSATIONS.some((c) => c.npc === id && !s.seenDialogues.includes(c.id) && c.cond(s))
        || QUESTS.some((q) => q.giver === id && s.quests[q.id]?.status === 'available');
      mark.setText(ready ? '?' : story ? '!' : '').setTint(ready ? COLORS.green : COLORS.gold);
    }
  }

  /** Flowers and swaying grass on the village lawns (off paths, props, houses and NPC spots). */
  private buildFoliage(): void {
    const taken = new Set<number>();
    const block = (tx: number, ty: number, r: number) => {
      for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) taken.add(y * VW + x);
    };
    for (const p of this.map.props) block(Math.floor(p.x / T), Math.floor((p.y - 8) / T), p.box ? 2 : 1);
    for (const n of NPCS) block(n.pos[0], n.pos[1], 1);
    const cells: { x: number; y: number }[] = [];
    for (let y = 3; y < VH - 2; y++) {
      for (let x = 2; x < VW - 2; x++) {
        if (this.map.isPath(x, y) || taken.has(y * VW + x)) continue;
        cells.push({ x, y });
      }
    }
    const q = this.save.settings.quality === 'high';
    this.foliage = new Foliage(this, this.map.ground, cells, new Rng('village-foliage'), { flowers: 0.09, grass: q ? 0.07 : 0.02, patches: 0.16 });
  }

  private buildAvatar(): void {
    const s = this.save;
    const heroId = s.profile.heroId;
    const hero = heroDef(heroId);
    const x = 12 * T;
    const y = 17 * T;
    this.anchor = this.add.zone(x, y, 10, 8);
    this.physics.add.existing(this.anchor);
    this.body = this.anchor.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.anchor, this.solids);
    this.shadow = this.add.image(x, y, 'fx_shadow');
    const frame = hero.rig === 'hero' ? `hero${this.skin}/idle/down/0` : `arpg${hero.arpgIndex}/walk/down/1`;
    this.avatar = this.add.sprite(x, y, hero.rig === 'hero' ? 'heroes' : 'actors', frame);
    this.lighting.add({ x, y, radius: 56, tint: heroDef(this.save.profile.heroId).color, flicker: 0.03, glow: 0.08, follow: this.anchor, followOffsetY: -8 });
  }

  private animFor(kind: 'idle' | 'walk' | 'attack'): string {
    const hero = heroDef(this.save.profile.heroId);
    if (hero.rig === 'hero') {
      const b = `hero${this.skin}`;
      return kind === 'idle' ? `${b}_breath_idle_${this.facing}` : kind === 'walk' ? `${b}_walk_${this.facing}` : `${b}_attack_${this.facing}`;
    }
    const a = `arpg${hero.arpgIndex}`;
    return kind === 'attack' ? `${a}_${hero.attackSheet}_${this.facing}` : `${a}_walk_${this.facing}`;
  }

  private buildAmbience(): void {
    if (this.save.settings.quality !== 'high') return;
    this.add.particles(0, 0, 'fx_px2', {
      x: { min: 0, max: VW * T }, y: { min: 0, max: VH * T }, lifespan: { min: 3000, max: 6000 },
      speedX: { min: -8, max: 8 }, speedY: { min: -8, max: 8 }, alpha: { start: 0, end: 1, ease: 'Sine.easeInOut' },
      scale: { start: 0.8, end: 0.2 }, tint: [0xd8ff80, 0xfff0a0], blendMode: 'ADD', frequency: 180,
    }).setDepth(50000);
  }

  // ------------------------------------------------------------------ interaction
  nearestSpot(): HubSpot | null {
    let best: HubSpot | null = null;
    let bd = Infinity;
    for (const sp of this.spots) {
      if (sp.visible && !sp.visible()) continue;
      const d = Math.hypot(sp.x - this.anchor.x, sp.y - this.anchor.y);
      if (d < sp.r && d < bd) {
        bd = d;
        best = sp;
      }
    }
    return best;
  }

  openMenu(key: string, data: object = {}): void {
    resetControls();
    this.scene.pause();
    this.scene.launch(key, { from: 'Hub', ...data });
  }

  private say(npcId: string, text: { en: string; id: string }): void {
    openDialogue(this, { lines: [{ who: npcId, text }] });
  }

  talkTo(npcId: string): void {
    resetControls();
    const s = this.save;
    const npc = NPCS.find((n) => n.id === npcId)!;
    const lines: Line[] = [];
    // Talking counts for "talk to" objectives before anything is handed in.
    bus.emit('npcTalked', { npcId });
    // Next story conversation.
    const convo = CONVERSATIONS.filter((c) => c.npc === npcId && !s.seenDialogues.includes(c.id) && c.cond(s)).sort((a, b) => b.priority - a.priority)[0];
    if (convo) {
      lines.push(...convo.lines);
      s.seenDialogues.push(convo.id);
    }
    // Hand in any completed quests.
    for (const q of QUESTS.filter((x) => x.giver === npcId && s.quests[x.id]?.status === 'complete')) {
      if (claimQuest(s, q.id)) {
        lines.push({ who: npcId, text: q.done });
        services.notify?.(`${t('reward')}: ${tr(q.title)}`, COLORS.green, 'quest_complete');
        if (q.rewards.item) this.grantRewardItem(q.rewards.item.rarity, q.rewards.item.slot);
        if (q.rewards.hero) services.notify?.(t('heroUnlocked', { h: tr(heroDef(q.rewards.hero).name) }), COLORS.orange, 'achievement');
      }
    }
    checkProgress();
    // Side quests this NPC offers: hearing them out is what starts (and tracks) them.
    for (const q of QUESTS.filter((x) => x.giver === npcId && s.quests[x.id]?.status === 'available')) {
      if (!acceptQuest(s, q.id)) continue;
      lines.push({ who: npcId, text: q.desc });
      s.seenDialogues.push(`offer_${q.id}`);
      services.notify?.(t('questNew', { q: tr(q.title) }), COLORS.cyan, 'quest_new');
    }
    // New story quests from this NPC ("come talk to me" quests explain themselves through the conversation).
    for (const q of QUESTS.filter((x) => x.giver === npcId && s.quests[x.id]?.status === 'active' && !s.seenDialogues.includes(`offer_${x.id}`))) {
      if (q.objectives.every((o) => o.kind === 'talk' && o.npc === q.giver)) continue;
      lines.push({ who: npcId, text: q.desc });
      s.seenDialogues.push(`offer_${q.id}`);
    }
    if (lines.length === 0) {
      const pool = (IDLE[npcId] ?? []).filter((l) => !l.cond || l.cond(s));
      if (pool.length) lines.push({ who: npcId, text: pool[Math.floor(Math.random() * pool.length)].text });
    }
    services.save!.markDirty();
    const choices = this.serviceChoices(npc);
    this.faceNpc(npcId);
    openDialogue(this, {
      lines, choices, onDone: () => {
        checkProgress();
        this.refreshMarks();
        this.scene.get('HubHud').events.emit('refresh');
      },
    });
  }

  private faceNpc(id: string): void {
    const n = this.npcSprites.get(id);
    if (!n) return;
    const dx = this.anchor.x - n.sprite.x;
    const dy = this.anchor.y - n.sprite.y;
    const dir = dirFromVector(dx, dy, 'down');
    const npc = NPCS.find((x) => x.id === id)!;
    n.sprite.setFrame(`${npc.sprite}/walk/${dir}/1`);
  }

  private serviceChoices(npc: NpcDef): DialogueChoice[] {
    const s = this.save;
    const c: DialogueChoice[] = [];
    const quests = QUESTS.filter((q) => q.giver === npc.id && (s.quests[q.id]?.status === 'active'));
    switch (npc.role) {
      case 'lantern':
        if (s.unlocks.features.includes('lantern_tree')) c.push({ label: t('lanternTree'), action: () => this.openMenu('LanternTree'), style: 'primary' });
        break;
      case 'blacksmith': c.push({ label: t('forge'), action: () => this.openMenu('Blacksmith'), style: 'primary' }); break;
      case 'alchemist': c.push({ label: t('brew'), action: () => this.openMenu('Alchemist'), style: 'primary' }); break;
      case 'merchant': c.push({ label: t('shop'), action: () => this.openMenu('Merchant'), style: 'primary' }); break;
      case 'hunter': c.push({ label: t('bounties'), action: () => this.openMenu('Bounties'), style: 'primary' }); break;
      case 'scholar': c.push({ label: t('menuCodex'), action: () => this.openMenu('Codex'), style: 'primary' }); break;
      case 'vows': c.push({ label: t('vows'), action: () => this.openMenu('Vows'), style: 'primary' }); break;
      case 'garden': c.push({ label: t('garden'), action: () => this.openMenu('Garden'), style: 'primary' }); break;
      case 'training': c.push({ label: t('selectHero'), action: () => this.openMenu('Hero'), style: 'primary' }); break;
      case 'bard':
        if (s.unlocks.features.includes('jukebox')) c.push({ label: t('jukebox'), action: () => this.openMenu('Jukebox'), style: 'primary' });
        break;
      default: break;
    }
    if (quests.length) c.push({ label: t('quests'), action: () => this.openMenu('QuestLog', { focus: quests[0].id }) });
    return c;
  }

  private grantRewardItem(rarity: number, slot?: string): void {
    // Deferred import keeps loot generation out of the hub's hot path.
    void import('@/systems/loot').then(({ generateItem }) => {
      void import('@/core/rng').then(({ Rng }) => {
        const s = this.save;
        const item = generateItem(new Rng(Date.now()), {
          ilvl: Math.max(8, s.unlocks.maxDepthReached * 10 + 4), depth: Math.max(1, s.unlocks.maxDepthReached), source: 'reward',
          rarity: rarity as 0, slot: slot as never, uid: services.save!.nextUid(),
        });
        s.inventory.push(item);
        services.save!.markDirty();
      });
    });
  }

  // ------------------------------------------------------------------ update
  update(_t: number, dms: number): void {
    const dt = Math.min(0.05, dms / 1000);
    const mx = controls.moveX;
    const my = controls.moveY;
    const len = Math.hypot(mx, my);
    this.foliage?.update(dt, this.anchor.x, this.anchor.y, len > 0.15);
    const speed = 80;
    this.attackCd -= dt;
    this.attacking -= dt;
    if (this.attacking <= 0) {
      if (len > 0.15) {
        this.body.setVelocity((mx / Math.max(1, len)) * speed, (my / Math.max(1, len)) * speed);
        this.facing = dirFromVector(mx, my, this.facing);
        this.playA('walk');
      } else {
        this.body.setVelocity(0, 0);
        this.playA('idle');
      }
    } else this.body.setVelocity(0, 0);
    this.avatar.setPosition(snapWorld(this.anchor.x), snapWorld(this.anchor.y - 9)).setDepth(this.anchor.y);
    this.shadow.setPosition(this.anchor.x, this.anchor.y + 1).setDepth(this.anchor.y - 5);
    if (take('interact')) this.nearestSpot()?.use();
    if (controls.attackHeld && this.attackCd <= 0) this.swing();
    controls.attackHeld = false;
    this.lighting.update(dt);
  }

  private playA(kind: 'idle' | 'walk' | 'attack'): void {
    const key = this.animFor(kind);
    if (this.avatar.anims.currentAnim?.key === key && this.avatar.anims.isPlaying) return;
    if (this.anims.exists(key)) this.avatar.play(key, true);
  }

  private swing(): void {
    this.attackCd = 0.4;
    this.attacking = 0.28;
    this.playA('attack');
    services.audio?.sfx('swing', { volume: 0.7 });
    if (this.dummy && Math.hypot(this.dummy.x - this.anchor.x, this.dummy.y - this.anchor.y) < 30) {
      this.time.delayedCall(90, () => {
        if (!this.dummy) return;
        const dir = dirFromVector(this.anchor.x - this.dummy.x, this.anchor.y - this.dummy.y, 'down');
        if (this.anims.exists(`dummy_hit_${dir}`)) this.dummy.play(`dummy_hit_${dir}`);
        services.audio?.sfx('hit', { volume: 0.7 });
        shakeCamera(this.cameras.main, 60, 0.002);
        const s = this.save;
        s.stats.dummyHits = (s.stats.dummyHits ?? 0) + 1;
        let progress = '';
        for (const q of QUESTS) {
          const st = s.quests[q.id];
          if (st?.status !== 'active') continue;
          q.objectives.forEach((o, i) => {
            if (o.kind !== 'stat' || o.stat !== 'dummyHits') return;
            st.progress[`o${i}`] = (st.progress[`o${i}`] ?? 0) + 1;
            progress = `${Math.min(o.count, st.progress[`o${i}`])}/${o.count}`;
          });
        }
        // Quest feedback right where the player is looking, and the tracker at the top follows along.
        if (progress) {
          const p = this.add.bitmapText(this.dummy.x, this.dummy.y - 34, FONT.body, progress).setOrigin(0.5).setTint(COLORS.gold).setDepth(20001);
          this.tweens.add({ targets: p, y: p.y - 10, alpha: 0, delay: 250, duration: 600, onComplete: () => p.destroy() });
        }
        const txt = this.add.bitmapText(this.dummy.x, this.dummy.y - 20, FONT.small, `${Math.floor(8 + Math.random() * 6)}`).setOrigin(0.5).setDepth(20000);
        this.tweens.add({ targets: txt, y: txt.y - 12, alpha: 0, duration: 500, onComplete: () => txt.destroy() });
        checkProgress();
        this.refreshMarks();
        this.scene.get('HubHud').events.emit('refresh');
      });
    }
  }

  get questHint(): string {
    const s = this.save;
    const id = s.trackedQuest;
    const q = id ? questById(id) : undefined;
    return q ? tr(q.title) : '';
  }

  startRunNow(): void {
    RunManager.start({ heroId: this.save.profile.heroId });
    this.goTo('RunMap');
  }
}
