import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { services } from '@/core/services';
import { bus } from '@/core/events';
import { t, tr } from '@/core/i18n';
import type { Rng } from '@/core/rng';
import { biomeForDepth, type BiomeDef } from '@/data/biomes';
import { ENEMIES, enemyScaling } from '@/data/enemies';
import { heroDef } from '@/data/heroes';
import type { Element, NodeKind, RunState } from '@/data/types';
import { VOWS } from '@/data/vows';
import { materialDef } from '@/data/materials';
import { CELL, cellAt, generateRoom, isWalkable, TOP_WALL, type RoomLayout } from '@/systems/roomgen';
import { xpForLevel, type StatusKind } from '@/systems/combat';
import { generateItem, ilvlFor, itemName } from '@/systems/loot';
import type { RoomReward } from '@/systems/floorgen';
import { RoomRenderer, TILE } from '@/gfx/RoomRenderer';
import { Player } from '@/entities/Player';
import { Enemy, ELITE_AFFIXES, type EliteAffix } from '@/entities/Enemy';
import { Boss } from '@/entities/Boss';
import { BIOME_BOSS, BOSSES, bossScaling } from '@/data/bosses';
import { Combat } from '@/game/Combat';
import { Fx } from '@/game/Fx';
import { FlowField } from '@/game/FlowField';
import { Lighting } from '@/game/Lighting';
import { Pickups, type Pickup } from '@/game/Pickups';
import { Projectiles } from '@/game/Projectiles';
import { RunManager, buildContext } from '@/game/RunManager';
import type { RunContext } from '@/game/RunContext';
import type { MeleeSpec, ProjectileSpec, World } from '@/game/World';
import { resetControls, take } from '@/game/input';
import { FONT, RARITY_COLORS } from '@/ui/theme';
import { toast } from '@/ui/widgets';
import { SPIRIT_IDS, type SpiritId } from '@/data/boons';
import { EnemyAuras } from '@/game/EnemyAuras';
import { Foliage } from '@/gfx/Foliage';
import { BLESSING_HP, adaptiveToughness, boonLevel, gearProgress } from '@/game/progression';
import { FINAL_DEPTH, endlessBossMult, endlessEnemyMult, isEndlessDepth } from '@/game/endless';
import { mutatorById } from '@/data/mutators';
import { shakeCamera, worldZoom } from '@/core/viewport';
import { a11y } from '@/core/a11y';
import { RoomFeatures } from './room/RoomFeatures';
import { buildColliders, buildProps, lookAhead, setupCamera, setupKeyboard } from './room/roomSetup';

/** Global shake softening (tuned on phones; 1 = the raw values passed by gameplay code). */
const SHAKE_SCALE = 0.6;


export interface RoomData {
  kind: NodeKind;
  reward?: RoomReward;
  content?: string;
  modifier?: string;
}

export interface Interactable {
  x: number;
  y: number;
  label: string;
  radius: number;
  sprite?: Phaser.GameObjects.GameObject;
  use: () => void;
  once?: boolean;
  used?: boolean;
}

export interface Breakable {
  x: number;
  y: number;
  tx: number;
  ty: number;
  sprite: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Zone;
  alive: boolean;
}

export class RoomScene extends BaseScene implements World {
  roomData!: RoomData;
  run!: RunState;
  ctx!: RunContext;
  rng!: Rng;
  biome!: BiomeDef;
  layout!: RoomLayout;
  player!: Player;
  enemies: Enemy[] = [];
  breakables: Breakable[] = [];
  interactables: Interactable[] = [];
  combat!: Combat;
  fx!: Fx;
  pickups!: Pickups;
  projectiles!: Projectiles;
  lighting!: Lighting;
  flow!: FlowField;
  roomWidth = 0;
  roomHeight = 0;
  depth = 1;
  boss: Boss | null = null;
  bossBarDirty = false;
  cleared = false;
  private roomRenderer?: RoomRenderer;
  solids!: Phaser.Physics.Arcade.StaticGroup;
  liquids!: Phaser.Physics.Arcade.StaticGroup;
  enemyGroup!: Phaser.Physics.Arcade.Group;
  private wavesLeft = 0;
  private waveTimer = 0;
  private spawning = 0;
  private hitStopMs = 0;
  private lastHitStopAt = -1000;
  private auras!: EnemyAuras;
  private foliage?: Foliage;
  private features = new RoomFeatures(this);
  private gate?: Phaser.GameObjects.Graphics;
  private gateOpen = false;
  private leaving = false;
  private pendingLevelUps = 0;
  private dead = false;
  private darknessBeforeDeath = 0.5;
  private flareReadyNotified = false;
  private eliteChance = 0;
  private heatHp = 1;
  private heatAtk = 1;
  private heatSpeed = 1;
  private extraPerWave = 0;
  private roomTime = 0;

  constructor() {
    super('Room');
  }

  init(data: RoomData): void {
    this.roomData = data;
    this.enemies = [];
    this.breakables = [];
    this.interactables = [];
    this.boss = null;
    this.cleared = false;
    this.gateOpen = false;
    this.leaving = false;
    this.pendingLevelUps = 0;
    this.pendingEventBoons = 0;
    this.dead = false;
    this.transitioning = false;
    this.hitStopMs = 0;
    this.roomTime = 0;
  }

  create(): void {
    const run = RunManager.run;
    if (!run) {
      this.scene.start('Hub');
      return;
    }
    this.run = run;
    this.depth = run.depth;
    this.biome = biomeForDepth(run.depth, run.regions);
    // Remember discovered regions (villagers comment on them back home).
    this.save.flags[`region_${this.biome.id}`] = 1;
    this.rng = RunManager.rngFor(run, `room:${this.roomData.kind}`);
    this.ctx = buildContext(this.save, run);
    this.applyVows();
    const combatKinds: NodeKind[] = ['combat', 'elite', 'challenge', 'boss'];
    const genKind = (combatKinds.includes(this.roomData.kind) ? this.roomData.kind : 'treasure') as 'combat';
    const minHeight = Math.ceil(this.H / 2 / TILE) + 1;
    this.layout = generateRoom(this.rng.fork('layout'), { kind: genKind, hazard: this.biome.theme.hazard !== 'pit', minHeight });
    this.roomWidth = this.layout.w * TILE;
    this.roomHeight = this.layout.h * TILE;
    this.physics.world.setBounds(0, TILE * 2, this.roomWidth, this.roomHeight - TILE * 2);
    this.roomRenderer = new RoomRenderer(this, this.layout, this.biome.theme, this.rng.int(0, 1e9));
    this.foliage = this.biome.theme.foliage ? this.buildFoliage(this.roomRenderer.under) : undefined;
    const q = this.save.settings.quality;
    this.fx = new Fx(this, q);
    this.auras = new EnemyAuras(this, q !== 'low');
    this.fx.showNumbers = this.save.settings.damageNumbers;
    this.projectiles = new Projectiles(this, q === 'high');
    this.pickups = new Pickups(this, (p) => this.collect(p));
    this.flow = new FlowField(this.layout);
    this.combat = new Combat(this);
    let darkness = this.biome.theme.darkness + (this.roomData.modifier === 'darkness' ? 0.25 : 0) + (this.ctx.has('darker') ? 0.2 : 0);
    if (this.run.vows.v_dark) darkness += 0.2;
    this.lighting = new Lighting(this, this.roomWidth, this.roomHeight, Math.min(0.9, darkness), q === 'high');
    buildColliders(this);
    buildProps(this);
    this.spawnPlayer();
    setupCamera(this);
    this.fx.ambient(this.biome.theme.particles, this.roomWidth, this.roomHeight, this.biome.theme.ambient);
    this.buildGate();
    this.setupRoomContent();
    this.scene.launch('Hud', { room: this });
    this.scene.bringToTop('Hud');
    this.fadeIn(350);
    services.audio?.playMusic(this.roomData.kind === 'boss' ? (this.depth === 5 ? 'm_final' : 'm_boss') : this.biome.music);
    this.handleBack(() => {
      this.openPause();
      return true;
    });
    this.input.keyboard?.on('keydown-ESC', () => this.openPause());
    setupKeyboard(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private applyVows(): void {
    const v = this.run.vows;
    for (const def of VOWS) {
      const r = v[def.id] ?? 0;
      if (!r) continue;
      if (def.enemyHp) this.heatHp += def.enemyHp * r;
      if (def.enemyAtk) this.heatAtk += def.enemyAtk * r;
      if (def.enemySpeed) this.heatSpeed += def.enemySpeed * r;
      if (def.extraEnemies) this.extraPerWave += def.extraEnemies * r;
      if (def.eliteChance) this.eliteChance += def.eliteChance * r;
    }
    const mut = mutatorById(this.run.mutator);
    if (mut) {
      this.heatHp += mut.enemyHp ?? 0;
      this.heatAtk += mut.enemyAtk ?? 0;
      this.heatSpeed += mut.enemySpeed ?? 0;
      this.extraPerWave += mut.extraEnemies ?? 0;
      this.eliteChance += mut.eliteChance ?? 0;
    }
    if (this.ctx.has('enemy_hp')) this.heatHp += this.ctx.p('enemy_hp') / 100;
    if (this.roomData.modifier === 'bloodmoon') this.eliteChance += 0.2;
    if (this.roomData.modifier === 'haste') this.heatSpeed += 0.25;
  }

  addBreakable(tx: number, ty: number, v: number): void {
    const theme = this.biome.theme;
    const frame = theme.breakables[v % theme.breakables.length];
    const x = tx * TILE + 8;
    const y = ty * TILE + 14;
    const sprite = this.add.image(x, y, 'props', frame).setOrigin(0.5, 1).setDepth(y);
    const body = this.add.zone(x, ty * TILE + 10, 12, 10);
    this.solids.add(body);
    this.breakables.push({ x, y, tx, ty, sprite, body, alive: true });
  }

  breakProp(b: Breakable): void {
    if (!b.alive) return;
    b.alive = false;
    this.fx.death(b.x, b.y - 6, 0xc8a070);
    this.fx.puff(b.x, b.y - 4, 3);
    this.sfx('break', 0.6);
    this.solids.remove(b.body, true, true);
    b.sprite.destroy();
    this.layout.cells[b.ty * this.layout.w + b.tx] = CELL.Floor;
    this.flow.open(b.tx, b.ty);
    const r = Math.random();
    if (r < 0.35) this.pickups.spawn('gold', b.x, b.y - 4, 1 + Math.floor(Math.random() * 3 * this.depth));
    else if (r < 0.45) this.pickups.spawn('heart', b.x, b.y - 4, 8);
    else if (r < 0.6) this.pickups.spawn('xp', b.x, b.y - 4, 2);
  }

  private spawnPlayer(): void {
    const hero = heroDef(this.run.heroId);
    const e = this.layout.entry;
    this.player = new Player(this, e.x * TILE + 8, e.y * TILE + 8, hero, this.run.skin, () => this);
    const st = this.ctx.stats;
    this.player.maxHp = Math.round(st.maxHp);
    this.player.hp = this.run.hp < 0 ? this.player.maxHp : Math.min(this.player.maxHp, this.run.hp);
    const flaskMax = 2 + this.save.flaskLevel + Math.round(this.ctx.p('extra_flask'));
    this.player.maxPotions = flaskMax;
    this.player.potions = this.run.flaskCharges < 0 ? flaskMax : Math.min(flaskMax, this.run.flaskCharges);
    this.player.dashCharges = st.dashCharges;
    this.player.shield = st.shieldOnRoom;
    if (this.ctx.has('no_dash')) this.player.dashCharges = 0;
    this.physics.add.collider(this.player.zone, this.solids);
    this.physics.add.collider(this.player.zone, this.liquids);
    // The hero's lantern: mostly a soft cut-out of the darkness, with only a faint tint of the hero's colour.
    const lantern = this.player.hero.color;
    this.lighting.add({ x: 0, y: 0, radius: 80, tint: lantern, flicker: 0.03, glow: 0.1, follow: this.player.zone, followOffsetY: -8 });
    this.lighting.add({ x: 0, y: 0, radius: 26, tint: 0xfff4dc, glow: 0.05, follow: this.player.zone, followOffsetY: -8 });
    // Entrance flourish
    this.player.sprite.setAlpha(0);
    this.tweens.add({ targets: this.player.sprite, alpha: 1, duration: 300 });
    this.fx.ring(this.player.x, this.player.y, 24, 0xffd9a0, 500);
  }

  private buildGate(): void {
    const ex = this.layout.exit.x * TILE;
    const g = this.add.graphics().setDepth(6);
    this.gate = g;
    this.drawGate(0);
    this.lighting.add({ x: ex + 8, y: TOP_WALL * TILE - 8, radius: 22, tint: 0xa0a0c0, flicker: 0 });
    void ex;
  }

  private drawGate(openAmount: number): void {
    const g = this.gate!;
    const ex = this.layout.exit.x * TILE - 8;
    const y0 = TILE * 1;
    const h = TILE * 2;
    g.clear();
    g.fillStyle(0x05040a, 1).fillRect(ex, y0, 32, h);
    g.fillStyle(0x221c30, 1).fillRect(ex - 2, y0 - 2, 36, 3);
    const barsH = Math.round(h * (1 - openAmount));
    g.fillStyle(0x6b6480, 1);
    for (let i = 0; i < 5; i++) g.fillRect(ex + 3 + i * 6, y0, 2, barsH);
    g.fillStyle(0x8a82a0, 1).fillRect(ex, y0 + barsH - 2, 32, 2);
    if (openAmount > 0.5) {
      g.fillStyle(0xffd9a0, 0.18 * openAmount).fillRect(ex + 2, y0 + 4, 28, h - 4);
    }
  }

  openGate(): void {
    if (this.gateOpen) return;
    this.gateOpen = true;
    const state = { v: 0 };
    this.tweens.add({ targets: state, v: 1, duration: 700, ease: 'Quad.easeOut', onUpdate: () => this.drawGate(state.v) });
    this.sfx('gate_open', 0.7);
    this.lighting.add({ x: this.layout.exit.x * TILE + 8, y: TOP_WALL * TILE, radius: 40, tint: 0xffe0a0, flicker: 0.1 });
    const arrow = this.add.image(this.layout.exit.x * TILE + 8, TOP_WALL * TILE + 12, 'fx_door').setTint(0xffd9a0).setBlendMode('ADD').setAlpha(0.6).setDepth(7);
    this.tweens.add({ targets: arrow, alpha: 0.2, yoyo: true, repeat: -1, duration: 700 });
  }

  // ------------------------------------------------------------------ room content
  private setupRoomContent(): void {
    const k = this.roomData.kind;
    const cx = Math.floor(this.layout.w / 2) * TILE;
    const cy = Math.floor(this.layout.h / 2) * TILE + 8;
    switch (k) {
      case 'combat':
      case 'elite':
      case 'challenge': {
        const d = this.depth;
        this.wavesLeft = k === 'challenge' ? 4 : k === 'elite' ? 3 : 3 + (this.run.floor >= 3 || d >= 3 ? 1 : 0);
        this.waveTimer = 0.8;
        if (k === 'challenge') toast(this, t('challengeStart'), 0xffd84a, 60);
        break;
      }
      case 'boss':
        this.time.delayedCall(900, () => this.spawnBoss());
        break;
      case 'treasure':
        this.features.spawnChest(cx, cy, 'big');
        this.onCleared(true);
        break;
      case 'shrine':
        this.features.spawnShrine(cx, cy, (this.roomData.content as SpiritId) ?? this.rng.pick(SPIRIT_IDS));
        this.onCleared(true);
        break;
      case 'rest':
        this.features.spawnCampfire(cx, cy);
        this.onCleared(true);
        break;
      case 'shop':
        this.features.spawnMerchant(cx, cy);
        this.onCleared(true);
        break;
      case 'event':
      case 'mystery':
        this.features.spawnEventNpc(cx, cy);
        this.onCleared(true);
        break;
      default:
        this.onCleared(true);
    }
  }

  private spawnWave(): void {
    const k = this.roomData.kind;
    const d = this.depth;
    const rng = this.rng;
    let count = 3 + Math.floor(d * 0.7) + this.run.floor - 1 + rng.int(0, 2) + this.extraPerWave;
    if (k === 'challenge') count += 2;
    const pool = this.biome.enemies.map((id) => [id, ENEMIES[id].weight ?? 5] as [string, number]);
    let spots = rng.shuffle(this.layout.spawns).filter((s) => Math.hypot(s.x * TILE - this.player.x, s.y * TILE - this.player.y) > 60);
    // Never an empty wave (it would instantly count as a cleared room): fall back to any spawn point.
    if (spots.length === 0) spots = rng.shuffle(this.layout.spawns.slice());
    let eliteLeft = k === 'elite' && this.wavesLeft === (k === 'elite' ? 2 : 0) ? (d >= 3 ? 2 : 1) : 0;
    if (k === 'elite' && eliteLeft > 0) count = Math.max(2, count - 3);
    for (let i = 0; i < count && i < spots.length; i++) {
      const sp = spots[i];
      let id = rng.weighted(pool);
      let elite = false;
      if (eliteLeft > 0) {
        id = rng.pick(this.biome.elites);
        elite = true;
        eliteLeft--;
      } else if (rng.chance(0.03 + d * 0.012 + this.eliteChance)) elite = true;
      this.telegraphSpawn(sp.x * TILE + 8, sp.y * TILE + 8, id, elite, 0.15 * i);
    }
    if (spots.length === 0) console.warn('[room] wave had no spawn points');
    this.wavesLeft--;
  }

  private telegraphSpawn(x: number, y: number, id: string, elite: boolean, delay: number): void {
    this.spawning++;
    this.time.delayedCall(delay * 1000, () => {
      const seal = this.add.image(x, y, 'fx_seal').setTint(elite ? 0xffd84a : 0xff4040).setBlendMode('ADD').setDepth(4).setAlpha(0);
      this.tweens.add({ targets: seal, alpha: 1, duration: 200 });
      this.tweens.add({ targets: seal, angle: 180, duration: 700 });
      this.lighting.add({ x, y, radius: 18, tint: elite ? 0xffd84a : 0xff5050, ttl: 0.9 });
      this.time.delayedCall(700, () => {
        seal.destroy();
        this.spawning--;
        if (this.dead || this.leaving) return;
        const e = this.spawnEnemy(id, x, y, elite);
        if (e && elite) e.makeElite(this.rng.sample(ELITE_AFFIXES as unknown as EliteAffix[], this.depth >= 3 ? 2 : 1));
        this.sfx('spawn', 0.3);
      });
    });
  }

  spawnEnemy(id: string, x: number, y: number, elite = false): Enemy | null {
    const def = ENEMIES[id];
    if (!def) return null;
    const sc = enemyScaling(this.depth, this.run.floor, 0);
    const end = endlessEnemyMult(this.depth, this.biome);
    const ad = this.adaptive();
    const scaling = { hp: sc.hp * this.heatHp * end.hp * ad.hp, atk: sc.atk * this.heatAtk * end.atk * ad.atk };
    const e = new Enemy(this, x, y, def, scaling, () => this, elite);
    e.speed *= this.heatSpeed;
    this.enemyGroup.add(e.zone);
    if (!def.flying) {
      this.physics.add.collider(e.zone, this.solids);
      this.physics.add.collider(e.zone, this.liquids);
    } else {
      this.physics.add.collider(e.zone, this.solids, undefined, (_a, b) => {
        const z = b as Phaser.GameObjects.Zone;
        return z.y < TOP_WALL * TILE || z.x < TILE || z.x > this.roomWidth - TILE;
      });
    }
    if (this.ctx.has('room_chill')) this.combat.applyStatus(e, 'chill', 1);
    this.enemies.push(e);
    // First meeting with a monster type: introduce it so the player learns (and remembers) how it fights.
    const metKey = `met_${id}`;
    if (!this.save.flags[metKey]) {
      this.save.flags[metKey] = 1;
      this.hudEvent('newEnemy', def);
      this.markNewEnemy(e);
    }
    const s = this.save;
    s.codex.enemies[id] = s.codex.enemies[id] ?? 0;
    return e;
  }

  private spawnBoss(): void {
    const def = BOSSES[BIOME_BOSS[this.biome.boss] ?? this.biome.boss];
    if (!def) return;
    const cx = Math.floor(this.layout.w / 2) * TILE + 8;
    const cy = (TOP_WALL + 5) * TILE;
    const tyrant = !!this.run.vows.v_boss;
    // Twin guardians share one guardian's endless budget.
    const pairK = def.partner && isEndlessDepth(this.depth) ? 0.55 : 1;
    const end = endlessBossMult(this.depth, def);
    const bs = bossScaling(this.depth);
    const ad = this.adaptive();
    end.hp *= pairK * bs.hp * ad.hp;
    end.atk *= bs.atk * ad.atk;
    this.boss = new Boss(this, cx, cy, def, 0, () => this, (tyrant ? 1.3 : this.heatHp) * end.hp, this.heatAtk * end.atk);
    this.enemyGroup.add(this.boss.zone);
    this.physics.add.collider(this.boss.zone, this.solids);
    this.enemies.push(this.boss);
    if (def.partner) {
      const pEnd = endlessBossMult(this.depth, BOSSES[def.partner]);
      pEnd.hp *= pairK * bs.hp * ad.hp;
      pEnd.atk *= bs.atk * ad.atk;
      const partner = new Boss(this, cx + 40, cy + 10, BOSSES[def.partner], 1, () => this, (tyrant ? 1.3 : this.heatHp) * pEnd.hp, this.heatAtk * pEnd.atk);
      this.enemyGroup.add(partner.zone);
      this.physics.add.collider(partner.zone, this.solids);
      this.enemies.push(partner);
      this.boss.partner = partner;
      partner.partner = this.boss;
      this.boss.x0 -= 40;
    }
    this.scene.get('Hud').events.emit('bossIntro', def);
    this.sfx('boss_roar', 1);
    this.shake(0.01, 600);
  }

  // ------------------------------------------------------------------ interactables
  addInteract(i: Interactable): void {
    this.interactables.push(i);
  }

  nearestInteractable(): Interactable | null {
    let best: Interactable | null = null;
    let bd = Infinity;
    for (const i of this.interactables) {
      if (i.used) continue;
      const d = Math.hypot(i.x - this.player.x, i.y - this.player.y);
      if (d < i.radius && d < bd) {
        best = i;
        bd = d;
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ rewards
  dropItem(x: number, y: number, source: 'enemy' | 'elite' | 'boss' | 'chest', bossId?: string): void {
    const s = this.save;
    const st = this.ctx.stats;
    const item = generateItem(this.rng.fork('item'), {
      ilvl: ilvlFor(this.depth, this.run.floor, this.rng),
      depth: this.depth,
      source,
      luck: st.luck,
      magicFind: st.magicFind,
      bossId,
      uid: services.save!.nextUid(),
    });
    void s;
    this.pickups.spawn('item', x, y, 0, { item });
  }

  openBoonPick(source: 'level' | 'shrine' | 'orb', spirit?: SpiritId): void {
    this.scene.pause();
    this.scene.launch('BoonPick', { room: this, source, spirit });
  }

  /** Called by overlays after a boon/relic/effect changes the build. */
  refreshPlayerStats(): void {
    const ratio = this.player.hp / this.player.maxHp;
    this.ctx = buildContext(this.save, this.run);
    const st = this.ctx.stats;
    const newMax = Math.round(st.maxHp);
    this.player.maxHp = newMax;
    this.player.hp = Math.min(newMax, Math.max(1, Math.round(ratio * newMax)));
    if (this.ctx.has('instant_heal')) this.player.hp = newMax;
    this.player.maxPotions = 2 + this.save.flaskLevel + Math.round(this.ctx.p('extra_flask'));
  }

  pendingEventBoons = 0;

  /** Event outcome: enemies pour in; the gate closes until they are dead. */
  startAmbush(elite: boolean): void {
    this.cleared = false;
    this.gateOpen = false;
    this.drawGate(0);
    this.roomData = { ...this.roomData, kind: elite ? 'elite' : 'combat', reward: this.roomData.reward ?? 'gold' };
    this.wavesLeft = elite ? 2 : 1;
    this.waveTimer = 0.6;
    this.sfx('ambush', 0.9);
    this.shake(0.006, 300);
  }

  onBoonPickClosed(): void {
    if (this.pendingEventBoons > 0) {
      this.pendingEventBoons--;
      this.time.delayedCall(80, () => this.openBoonPick('orb', this.rng.pick(SPIRIT_IDS)));
      return;
    }
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps--;
      this.time.delayedCall(80, () => this.openBoonPick('level'));
    }
  }

  // ------------------------------------------------------------------ pickups
  private collect(p: Pickup): void {
    const run = this.run;
    const s = this.save;
    switch (p.kind) {
      case 'gold': {
        const amt = Math.max(1, Math.round(p.value * (1 + this.ctx.stats.goldFind / 100)));
        run.gold += amt;
        bus.emit('goldGained', { amount: amt });
        this.sfx('coin', 0.35);
        break;
      }
      case 'xp': this.gainXp(p.value); break;
      case 'embers':
        run.embersFound += p.value;
        this.fx.number(this.player.x, this.player.y - 20, `+${p.value}`, 0xff7a4a);
        this.sfx('ember', 0.5);
        break;
      case 'heart':
        this.player.heal(p.value, true);
        this.sfx('heal', 0.6);
        break;
      case 'material': {
        const id = p.id!;
        s.materials[id] = (s.materials[id] ?? 0) + p.value;
        run.materialsFound[id] = (run.materialsFound[id] ?? 0) + p.value;
        const def = materialDef(id);
        if (def) this.fx.number(this.player.x, this.player.y - 20, `+${tr(def.name)}`, 0x8ab8ff);
        bus.emit('materialGained', { materialId: id, amount: p.value });
        this.sfx('pickup', 0.5);
        break;
      }
      case 'item': {
        const item = p.item!;
        s.inventory.push(item);
        run.itemsFound.push(item.uid);
        if (!s.codex.items.includes(item.uniqueId ?? item.baseId)) s.codex.items.push(item.uniqueId ?? item.baseId);
        bus.emit('itemFound', { itemId: item.baseId, rarity: item.rarity });
        this.scene.get('Hud').events.emit('itemGained', item);
        this.sfx(item.rarity >= 4 ? 'loot_legendary' : item.rarity >= 2 ? 'loot_rare' : 'pickup', 0.8);
        if (item.rarity >= 3) services.platform?.haptic('success');
        this.fx.number(this.player.x, this.player.y - 22, itemName(item), RARITY_COLORS[item.rarity]);
        break;
      }
      case 'key':
        run.keys += 1;
        break;
    }
    services.save!.markDirty();
  }

  gainXp(amount: number): void {
    const run = this.run;
    run.xp += amount * (1 + this.ctx.stats.xpGain / 100);
    while (run.xp >= xpForLevel(run.level)) {
      run.xp -= xpForLevel(run.level);
      run.level += 1;
      this.levelUp();
    }
  }

  private levelUp(): void {
    this.sfx('level_up', 0.9);
    this.fx.ring(this.player.x, this.player.y, 40, 0xffd84a, 500);
    this.lightFx(this.player.x, this.player.y, 70, 0xffd84a, 500);
    this.floatText(this.player.x, this.player.y - 26, t('levelUp'), 0xffd84a, true);
    this.player.heal(this.player.maxHp * 0.1, false);
    // A boon every second level: power grows slower, so each choice (and each monster) matters more.
    // The levels in between grant the Lantern's Blessing: a little permanent max HP and a real heal.
    if (!boonLevel(this.run.level)) {
      this.run.bonusMaxHp = (this.run.bonusMaxHp ?? 0) + BLESSING_HP;
      this.refreshPlayerStats();
      this.player.heal(this.player.maxHp * 0.25, true);
      this.hudEvent('blessing');
      return;
    }
    if (this.scene.isActive('BoonPick')) this.pendingLevelUps++;
    else this.time.delayedCall(350, () => {
      if (this.scene.isActive('BoonPick') || this.scene.isPaused()) this.pendingLevelUps++;
      else this.openBoonPick('level');
    });
  }

  // ------------------------------------------------------------------ World API
  melee(spec: MeleeSpec): number {
    return this.combat.melee(spec);
  }

  fire(spec: ProjectileSpec): void {
    this.combat.fire(spec);
  }

  nearestEnemy(x: number, y: number, maxDist: number, exclude?: Enemy): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist;
    for (const e of this.enemies) {
      if (!e.alive || e === exclude || e.invulnerable || e.state === 'spawn') continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  damagePlayer(amount: number, element: Element, source?: { x: number; y: number }, status?: [StatusKind, number]): void {
    if (this.dead) return;
    this.combat.damagePlayer(amount, element, source, status);
  }

  explode(x: number, y: number, radius: number, damage: number, element: Element, friendly: boolean, status?: [StatusKind, number]): void {
    this.combat.explode(x, y, radius, damage, element, friendly, status);
  }

  dotEnemy(e: Enemy, amount: number): void {
    const dmg = Math.max(1, Math.round(amount));
    e.hp -= dmg;
    if (Math.random() < 0.25) this.fx.number(e.x, e.y - 14, `${dmg}`, 0xc0a0ff);
    if (this.ctx.has('poison_leech') && e.statuses.has('poison')) this.player.heal(dmg * this.ctx.p('poison_leech') / 100, false);
    if (this.ctx.has('sunfire') && e.statuses.has('burn')) this.player.heal(dmg * this.ctx.p('sunfire') / 100, false);
    if (this.ctx.has('wildfire') && e.statuses.has('poison') && Math.random() * 100 < this.ctx.p('wildfire') * 0.1) this.combat.applyStatus(e, 'burn', 1);
    this.bossBarDirty = true;
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e: Enemy): void {
    if (!e.alive) return;
    e.alive = false;
    e.clearTelegraph();
    const boss = e instanceof Boss;
    this.combat.onEnemyDeath(e);
    this.fx.death(e.x, e.y - 6, e.def.projTint ?? 0xc8c0d8, e.elite || boss);
    this.sfx(boss ? 'boss_death' : e.elite ? 'elite_death' : 'enemy_death', 0.6);
    const run = this.run;
    run.kills += 1;
    if (e.elite) run.eliteKills += 1;
    const s = this.save;
    s.codex.enemies[e.def.id] = (s.codex.enemies[e.def.id] ?? 0) + 1;
    bus.emit('enemyKilled', { enemyId: e.def.id, elite: e.elite, boss, biome: this.biome.id });
    // Loot
    if (!boss) {
      const xpOrbs = Math.min(6, Math.max(1, Math.round(e.xp / 3)));
      for (let i = 0; i < xpOrbs; i++) this.pickups.spawn('xp', e.x, e.y - 4, e.xp / xpOrbs);
      const g = this.rng.int(e.def.gold[0], e.def.gold[1]) * (e.elite ? 3 : 1);
      for (let i = 0; i < Math.min(5, g); i++) this.pickups.spawn('gold', e.x, e.y - 4, Math.ceil(g / Math.min(5, g)));
      if (e.def.drop && Math.random() < e.def.drop[1] * (e.elite ? 2 : 1)) this.pickups.spawn('material', e.x, e.y - 4, 1, { id: e.def.drop[0] });
      if (Math.random() < 0.035 + this.ctx.stats.luck * 0.0005) this.pickups.spawn('heart', e.x, e.y - 4, 10 + this.depth * 2);
      const itemChance = (e.elite ? 0.35 : 0.022) * (1 + this.ctx.stats.magicFind / 200) + this.ctx.p('bonus_drop') / 100;
      if (Math.random() < itemChance) this.dropItem(e.x, e.y - 4, e.elite ? 'elite' : 'enemy');
      if (e.elite) this.pickups.spawn('embers', e.x, e.y - 4, 3 + this.depth * 2);
    }
    this.tweens.add({
      targets: e.sprite, alpha: 0, scaleY: e.sprite.scaleY * 1.3, scaleX: e.sprite.scaleX * 0.6, duration: 180,
      onComplete: () => e.destroy(),
    });
    e.shadow.setVisible(false);
    e.body.enable = false;
    this.enemies = this.enemies.filter((x) => x !== e);
    if (boss) (e as Boss).onDeath();
  }

  isWalkableAt(px: number, py: number, flying: boolean): boolean {
    const c = cellAt(this.layout, Math.floor(px / TILE), Math.floor(py / TILE));
    return flying ? c !== CELL.Wall : isWalkable(c);
  }

  flowDir(px: number, py: number): { x: number; y: number } {
    return this.flow.dirFrom(px, py, this.player.x, this.player.y);
  }

  hasLineOfSight(ax: number, ay: number, bx: number, by: number): boolean {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 8);
    for (let i = 1; i < steps; i++) {
      const x = ax + ((bx - ax) * i) / steps;
      const y = ay + ((by - ay) * i) / steps;
      const c = cellAt(this.layout, Math.floor(x / TILE), Math.floor(y / TILE));
      if (c === CELL.Wall || c === CELL.Obstacle) return false;
    }
    return true;
  }

  shake(intensity: number, ms: number): void {
    const k = this.save.settings.screenShake;
    if (k <= 0 || a11y.reduceMotion) return;
    // Kept gentle: frequent hits must never make the screen wobble enough to cause discomfort.
    shakeCamera(this.cameras.main, Math.min(ms, 400), Math.min(0.008, intensity * SHAKE_SCALE) * k);
  }

  /** Point at a monster type met for the first time: a gold ring and "!" follow it for a few seconds. */
  private markNewEnemy(e: Enemy): void {
    const ring = this.add.image(e.x, e.y, 'fx_ring_hd').setTint(0xffd84a).setBlendMode('ADD').setScale(0.4, 0.2).setDepth(95000);
    const mark = this.add.bitmapText(e.x, e.y - 24, FONT.head, '!').setOrigin(0.5, 1).setTint(0xffd84a).setDepth(95001);
    this.tweens.add({ targets: ring, alpha: 0.3, yoyo: true, repeat: -1, duration: 350 });
    this.sfx('quest_new', 0.6);
    const follow = this.time.addEvent({
      delay: 16, loop: true, callback: () => {
        ring.setPosition(e.x, e.y + 2);
        mark.setPosition(e.x, e.y - 24 + Math.sin(this.time.now / 120) * 2);
      },
    });
    const done = () => {
      follow.remove();
      this.tweens.killTweensOf(ring);
      ring.destroy();
      mark.destroy();
    };
    this.time.delayedCall(3000, done);
  }

  /** Monster strength adapted to how geared the hero is for this depth (fair first runs, no trivial depths). */
  private adaptive(): { hp: number; atk: number } {
    return adaptiveToughness(gearProgress(this.save, Math.min(this.depth, FINAL_DEPTH)));
  }

  /** Grass life on open floor, kept off the doors and the room's centre (where features stand). */
  private buildFoliage(floor: Phaser.GameObjects.RenderTexture): Foliage {
    const l = this.layout;
    const cx = Math.floor(l.w / 2);
    const cy = Math.floor(l.h / 2);
    const cells: { x: number; y: number }[] = [];
    for (let y = TOP_WALL + 1; y < l.h - 1; y++) {
      for (let x = 1; x < l.w - 1; x++) {
        if (cellAt(l, x, y) !== CELL.Floor) continue;
        const near = (p: { x: number; y: number }, r: number) => Math.abs(p.x - x) <= r && Math.abs(p.y - y) <= r;
        if (near(l.entry, 1) || near(l.exit, 2) || near({ x: cx, y: cy }, 2)) continue;
        cells.push({ x, y });
      }
    }
    const q = this.save.settings.quality === 'high';
    return new Foliage(this, floor, cells, this.rng.fork('foliage'), { flowers: 0.07, grass: q ? 0.06 : 0.02, patches: 0.14 });
  }

  hitStop(ms: number): void {
    // Back-to-back stops (multi-hit skills, crit streaks) would read as stutter: repeats inside 150 ms are much shorter.
    const now = this.time.now;
    const scaled = now - this.lastHitStopAt < 150 ? ms * 0.3 : ms;
    this.lastHitStopAt = now;
    this.hitStopMs = Math.max(this.hitStopMs, scaled);
  }

  light(x: number, y: number, radius: number, tint: number, ms: number): void {
    this.lightFx(x, y, radius, tint, ms);
  }

  lightFx(x: number, y: number, radius: number, tint: number, ms: number): void {
    this.lighting.add({ x, y, radius, tint, ttl: ms / 1000, intensity: 1 });
  }

  sfx(key: string, volume = 1): void {
    services.audio?.sfx(key, { volume });
  }

  onPlayerAttack(): void {
    this.combat.onAttack();
  }

  hudEvent(name: string, payload?: unknown): void {
    this.scene.get('Hud').events.emit(name, payload);
  }

  bossDefeated(): void {
    this.onBossDefeated(this.biome.boss);
  }

  onDash(): void {
    this.combat.onDash();
  }

  addFlare(amount: number): void {
    const before = this.player.flare;
    this.player.flare = Math.min(100, this.player.flare + amount);
    if (before < 100 && this.player.flare >= 100 && !this.flareReadyNotified) {
      this.flareReadyNotified = true;
      this.sfx('flare_ready', 0.6);
    }
    if (this.player.flare < 100) this.flareReadyNotified = false;
  }

  floatText(x: number, y: number, text: string, color: number, big = false): void {
    if (!text) return;
    this.fx.number(x, y, text, color, big);
  }

  /** Red screen-edge flash when the hero is hit (drawn by the Hud, which has an unzoomed camera). */
  damageVignette(): void {
    this.hudEvent('hurt');
  }

  update(_time: number, deltaMs: number): void {
    if (!this.player) return;
    let dt = Math.min(0.05, deltaMs / 1000);
    if (this.hitStopMs > 0) {
      this.hitStopMs -= deltaMs;
      this.physics.world.pause();
      return;
    }
    if (this.physics.world.isPaused) this.physics.world.resume();
    if (this.dead) dt *= 0.3;
    this.roomTime += dt;
    this.run.timeSec += dt;
    lookAhead(this, dt);
    this.auras.update(dt, this.enemies);
    this.foliage?.update(dt, this.player.x, this.player.y, this.player.moving);
    this.flow.update(this.player.x, this.player.y);
    this.player.hasteMul = this.combat.hasteTime > 0 ? 1 + this.combat.hasteAmount / 100 : 1;
    this.player.update(dt);
    for (const e of this.enemies.slice()) e.update(dt);
    for (const pr of this.projectiles.list) if (pr.alive) this.combat.updateProjectile(pr, dt);
    this.projectiles.compact();
    this.combat.update(dt);
    this.pickups.update(dt, this.player.x, this.player.y - 4, this.ctx.stats.pickupRadius, { w: this.roomWidth, h: this.roomHeight });
    this.lighting.update(dt);
    this.updateInteract();
    this.updateWaves(dt);
    this.checkExit();
  }

  private updateInteract(): void {
    const near = this.nearestInteractable();
    if (near && take('interact')) {
      if (near.once) near.used = true;
      near.use();
    }
  }

  private updateWaves(dt: number): void {
    if (this.cleared || this.dead) return;
    const k = this.roomData.kind;
    if (k !== 'combat' && k !== 'elite' && k !== 'challenge') return;
    const alive = this.enemies.filter((e) => e.alive).length;
    if (this.wavesLeft > 0) {
      this.waveTimer -= dt;
      if ((alive + this.spawning <= 1 && this.waveTimer <= 0) || (this.waveTimer <= -14 && this.spawning === 0)) {
        this.spawnWave();
        this.waveTimer = 1.2;
      }
    } else if (alive === 0 && this.spawning === 0) {
      this.onCleared(false);
    }
  }

  onCleared(peaceful: boolean): void {
    if (this.cleared) return;
    this.cleared = true;
    this.projectiles.clearHostile();
    if (!peaceful) {
      this.run.roomsCleared += 1;
      bus.emit('roomCleared', { kind: this.roomData.kind, depth: this.depth, floor: this.run.floor });
      this.sfx('room_clear', 0.9);
      this.scene.get('Hud').events.emit('roomCleared');
      this.time.delayedCall(400, () => this.features.spawnReward());
      this.pickups.magnetAll(['gold', 'xp', 'embers', 'material']);
      if (this.ctx.has('clutch_heal') && this.player.hp < this.player.maxHp * 0.3) this.player.heal(this.player.maxHp * this.ctx.p('clutch_heal') / 100, true);
      if (this.ctx.has('flare_room')) this.player.flare = 100;
      if (this.roomData.kind === 'challenge') for (let i = 0; i < 2; i++) this.features.spawnReward();
    }
    this.time.delayedCall(peaceful ? 300 : 900, () => this.openGate());
  }

  onBossDefeated(bossId: string): void {
    const run = this.run;
    if (!run.bossesKilled.includes(bossId)) run.bossesKilled.push(bossId);
    const s = this.save;
    const first = !s.unlocks.bossesDefeated.includes(bossId);
    if (first) s.unlocks.bossesDefeated.push(bossId);
    bus.emit('bossDefeated', { bossId, depth: this.depth });
    this.cameras.main.flash(400, 255, 240, 200);
    this.shake(0.012, 700);
    const x = Phaser.Math.Clamp(this.player.x, 40, this.roomWidth - 40);
    const y = (TOP_WALL + 6) * TILE;
    this.time.delayedCall(1200, () => {
      this.dropItem(x - 16, y, 'boss', bossId);
      this.dropItem(x + 16, y, 'boss', bossId);
      for (let i = 0; i < 20; i++) this.pickups.spawn('gold', x, y, 5 + this.depth * 3);
      for (let i = 0; i < 6; i++) this.pickups.spawn('embers', x, y, 10 + this.depth * 6);
      const bdef = BOSSES[BIOME_BOSS[bossId] ?? bossId];
      const trophy = bdef?.trophy;
      if (trophy) this.pickups.spawn('material', x, y, 1, { id: trophy });
      const relic = bdef?.relic ?? (bdef?.partner ? BOSSES[bdef.partner]?.relic : undefined);
      if (relic && !run.relics.includes(relic)) {
        RunManager.addRelic(run, relic);
        this.refreshPlayerStats();
        this.scene.get('Hud').events.emit('relicGained', relic);
      }
      this.cleared = true;
      this.projectiles.clearHostile();
      this.time.delayedCall(800, () => this.openGate());
    });
  }

  private checkExit(): void {
    if (!this.gateOpen || this.leaving || this.dead) return;
    const ex = this.layout.exit.x * TILE + 8;
    if (Math.abs(this.player.x - ex) < 14 && this.player.y < TOP_WALL * TILE + 10) this.leaveRoom();
  }

  private leaveRoom(): void {
    this.leaving = true;
    this.pickups.magnetAll();
    this.run.hp = Math.round(this.player.hp);
    this.run.flaskCharges = this.player.potions;
    services.save!.markDirty();
    this.sfx('step_out', 0.6);
    resetControls();
    const lastRow = RunManager.isLastRow(this.run);
    const wasBoss = this.roomData.kind === 'boss';
    this.cameras.main.fadeOut(350, 11, 10, 20);
    // Fade the Hud with the room so the controls do not hang over a black screen.
    this.scene.get('Hud').cameras.main.fadeOut(300, 11, 10, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('Hud');
      if (lastRow) {
        const result = RunManager.advance(this.run);
        if (result === 'victory') {
          this.scene.start('Results', { victory: true });
          return;
        }
        this.scene.start('Transition', { result, fromBoss: wasBoss });
        return;
      }
      this.scene.start('RunMap');
    });
  }

  playerDied(): void {
    if (this.dead) return;
    this.dead = true;
    this.player.die();
    this.player.hp = 0;
    this.sfx('player_death', 1);
    services.platform?.haptic('error');
    services.audio?.stopMusic(800);
    this.darknessBeforeDeath = this.lighting.darkness;
    this.cameras.main.zoomTo(worldZoom(3), 1200, 'Sine.easeInOut');
    this.lighting.darkness = 0.85;
    this.scene.get('Hud').cameras.main.fadeOut(900, 0, 0, 0);
    // One rewarded-video revive per run (never in daily runs, which are meant to be fair and comparable).
    const canRevive = !this.run.adRevived && !this.run.daily && !!services.ads?.canReward();
    this.time.delayedCall(canRevive ? 1300 : 2200, () => {
      if (canRevive) {
        this.scene.pause();
        this.scene.launch('Revive', { room: this });
      } else this.finishDeath();
    });
  }

  /** Death is final: fade out and show the results. */
  finishDeath(): void {
    this.scene.stop('Hud');
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Results', { victory: false }));
  }

  /** Rewarded revive: back on your feet with half health, a moment of invulnerability and a clear space. */
  revivePlayer(): void {
    this.dead = false;
    this.run.adRevived = true;
    this.player.revive(0.5);
    this.projectiles.clearHostile();
    this.explode(this.player.x, this.player.y, 70, 0, 'holy', true);
    this.lightFx(this.player.x, this.player.y, 120, 0xfff0c0, 900);
    this.fx.ring(this.player.x, this.player.y, 80, 0xfff0c0, 600);
    this.lighting.darkness = this.darknessBeforeDeath;
    this.cameras.main.zoomTo(worldZoom(2), 500, 'Sine.easeOut');
    this.scene.get('Hud').cameras.main.fadeIn(300);
    services.audio?.playMusic(this.roomData.kind === 'boss' ? (this.depth === 5 ? 'm_final' : 'm_boss') : this.biome.music, 600);
    this.sfx('heal', 1);
    services.platform?.haptic('success');
  }

  openPause(): void {
    if (this.dead || this.leaving || this.scene.isPaused()) return;
    this.scene.pause();
    this.scene.launch('Pause', { room: this });
  }

  get bossList(): Boss[] {
    return this.enemies.filter((e): e is Boss => e instanceof Boss);
  }

  private cleanup(): void {
    this.roomRenderer?.destroy();
    this.lighting?.destroy();
    this.projectiles?.clearAll();
    this.pickups?.clear();
    resetControls();
    this.input.keyboard?.removeAllListeners();
  }
}
