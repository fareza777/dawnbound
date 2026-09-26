import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { COLORS, FONT } from '@/ui/theme';
import { Bar, Button, fitBox, label, panel } from '@/ui/widgets';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { biomeForDepth } from '@/data/biomes';
import { ENEMIES } from '@/data/enemies';
import { BIOME_BOSS, BOSSES } from '@/data/bosses';
import type { MapNode, NodeKind, RunState, SaveData } from '@/data/types';
import { RunManager, buildContext } from '@/game/RunManager';
import { nodeById } from '@/systems/floorgen';
import { SPIRITS, SPIRIT_IDS } from '@/data/boons';
import { Rng, hashString } from '@/core/rng';
import { EVENTS, type EventDef } from '@/data/events';
import { addEmberParticles } from './SplashScene';

const KIND_LABEL: Record<NodeKind, { en: string; id: string }> = {
  start: { en: 'Entrance', id: 'Pintu Masuk' },
  combat: { en: 'Battle', id: 'Pertempuran' },
  elite: { en: 'Elite', id: 'Elit' },
  treasure: { en: 'Treasure', id: 'Harta' },
  shop: { en: 'Merchant', id: 'Pedagang' },
  shrine: { en: 'Spirit Shrine', id: 'Kuil Roh' },
  event: { en: 'Encounter', id: 'Pertemuan' },
  rest: { en: 'Campfire', id: 'Api Unggun' },
  challenge: { en: 'Trial', id: 'Ujian' },
  mystery: { en: 'Unknown', id: 'Misteri' },
  boss: { en: 'Guardian', id: 'Penjaga' },
};

const REWARD_TINT: Record<string, number> = {
  boon: 0xffd84a, gold: 0xf2c14e, item: 0x5fa8ff, relic: 0xb77cff, heal: 0xe0304a, hammer: 0xc0c0d0, embers: 0xff7a2f, material: 0x8fdc4a,
};

export class RunMapScene extends BaseScene {
  /** Space kept free at the bottom for the banner ad. */
  private adReserve = 0;
  private run!: RunState;

  constructor() {
    super('RunMap');
  }

  create(): void {
    this.transitioning = false;
    const run = RunManager.run;
    if (!run) {
      this.scene.start('Hub');
      return;
    }
    this.run = run;
    this.fadeIn(300);
    const biome = biomeForDepth(run.depth, run.regions);
    services.audio?.playMusic(biome.music);
    this.drawBackground(biome.theme.bg);
    this.adReserve = this.useBanner();
    this.drawHeader();
    this.drawMap();
    this.drawFooter();
    this.handleBack(() => {
      this.scene.launch('Pause', { room: null, from: 'RunMap' });
      this.scene.pause();
      return true;
    });
    this.ensureContent();
  }

  /** Pre-roll node contents (shrine spirit, event id) deterministically so reloading shows the same map. */
  private ensureContent(): void {
    const rng = new Rng(hashString(`${this.run.seed}:content:${this.run.depth}:${this.run.floor}`));
    const seen = new Set(this.save.codex.events);
    for (const n of this.run.map.nodes) {
      if (n.kind === 'shrine' && !n.content) n.content = rng.pick(SPIRIT_IDS);
      if ((n.kind === 'event' || n.kind === 'mystery') && !n.content) {
        const pool = eventPool(this.save, this.run.depth, biomeForDepth(this.run.depth, this.run.regions).id);
        const story = pool.filter((e) => e.quest);
        const fresh = pool.filter((e) => !seen.has(e.id));
        n.content = story.length && rng.chance(0.75) ? rng.pick(story).id : rng.pick(fresh.length && rng.chance(0.7) ? fresh : pool).id;
      }
      if ((n.kind === 'combat' || n.kind === 'elite') && !n.modifier && rng.chance(0.12 + this.run.depth * 0.03)) {
        n.modifier = rng.pick(['darkness', 'haste', 'bloodmoon']);
      }
    }
    services.save!.markDirty();
  }

  private drawBackground(bgKey: string): void {
    const { W, H } = this;
    const bg = this.add.image(W / 2, H / 2, bgKey);
    bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(0x3a3456);
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.bg0, COLORS.bg0, COLORS.bg0, COLORS.bg0, 0.85, 0.85, 0.35, 0.35).fillRect(0, 0, W, H * 0.5);
    g.fillGradientStyle(COLORS.bg0, COLORS.bg0, COLORS.bg0, COLORS.bg0, 0.35, 0.35, 0.9, 0.9).fillRect(0, H * 0.5, W, H * 0.5);
    addEmberParticles(this, W, H, 1);
  }

  private drawHeader(): void {
    const { W } = this;
    const run = this.run;
    const biome = biomeForDepth(run.depth, run.regions);
    panel(this, 6, 6, W - 12, 62, 'ui_panel_dark').setAlpha(0.92);
    label(this, W / 2, 14, tr(biome.name).toUpperCase(), FONT.title, COLORS.gold, 0.5, 0);
    const floorTxt = t(RunManager.floorLabelKey(run.map), { d: run.depth, f: run.floor });
    label(this, W / 2, 38, floorTxt, FONT.body, COLORS.textDim, 0.5, 0);
    fitBox(label(this, W / 2, 54, `"${tr(biome.subtitle)}"`, FONT.small, 0xa08cc0, 0.5, 0), W - 28, 14);
  }

  private nodePos(n: MapNode): { x: number; y: number } {
    const W = this.W;
    const H = this.H - this.adReserve;
    const top = 100;
    const bottom = H - 150;
    const rows = this.run.map.rows;
    const y = bottom - (n.row / (rows - 1)) * (bottom - top);
    const laneW = Math.min(110, (W - 60) / 2);
    const jitter = new Rng(hashString(n.id + this.run.seed)).int(-8, 8);
    return { x: W / 2 + (n.lane - 1) * laneW + (n.row === 0 || n.row === rows - 1 ? 0 : jitter), y };
  }

  private drawMap(): void {
    const run = this.run;
    const map = run.map;
    const g = this.add.graphics();
    const visited = new Set(run.visited);
    const choices = new Set(RunManager.choices(run).map((n) => n.id));
    for (const n of map.nodes) {
      const a = this.nodePos(n);
      for (const id of n.next) {
        const m = nodeById(map, id)!;
        const b = this.nodePos(m);
        const travelled = visited.has(n.id) && visited.has(m.id);
        const open = n.id === run.nodeId && choices.has(m.id);
        const color = travelled ? COLORS.gold : open ? 0xffd9a0 : 0x5a5189;
        const alpha = travelled || open ? 0.95 : 0.45;
        // Dotted path
        const steps = Math.floor(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 6);
        for (let i = 1; i < steps; i++) {
          const tt = i / steps;
          g.fillStyle(color, alpha).fillRect(Math.round(a.x + (b.x - a.x) * tt) - 1, Math.round(a.y + (b.y - a.y) * tt) - 1, 2, 2);
        }
      }
    }
    for (const n of map.nodes) this.drawNode(n, visited.has(n.id), n.id === run.nodeId, choices.has(n.id));
  }

  private drawNode(n: MapNode, visited: boolean, current: boolean, available: boolean): void {
    const { x, y } = this.nodePos(n);
    const boss = n.kind === 'boss';
    const r = boss ? 22 : 15;
    const c = this.add.container(x, y);
    const ring = this.add.graphics();
    const base = available ? 0x3a2a18 : visited ? 0x241f36 : 0x15132a;
    ring.fillStyle(0x000000, 0.5).fillCircle(0, 2, r);
    ring.fillStyle(base, 1).fillCircle(0, 0, r);
    ring.lineStyle(2, available ? COLORS.gold : visited ? 0x9c6b2a : 0x3c3563, 1).strokeCircle(0, 0, r);
    c.add(ring);
    const icon = this.nodeIcon(n);
    if (icon) c.add(icon);
    if (visited && !current) {
      (icon as Phaser.GameObjects.Image | null)?.setAlpha(0.45);
    }
    if (n.content && REWARD_TINT[n.content] && (n.kind === 'combat' || n.kind === 'elite' || n.kind === 'challenge')) {
      const dot = this.add.image(r - 3, -r + 3, 'proj_orb').setTint(REWARD_TINT[n.content]).setScale(1.1);
      c.add(dot);
    }
    if (n.modifier) {
      const mod = this.add.bitmapText(-r + 2, -r + 1, FONT.small, '!').setTint(0xff4f6d);
      c.add(mod);
    }
    if (current) {
      const lantern = this.add.image(0, -r - 8, 'fx_light_px').setTint(0xffd9a0).setBlendMode('ADD').setScale(0.35);
      c.add(lantern);
      this.tweens.add({ targets: lantern, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });
    }
    if (available) {
      this.tweens.add({ targets: c, scale: 1.1, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.easeInOut' });
      const glow = this.add.image(x, y, 'fx_light').setTint(COLORS.ember).setBlendMode('ADD').setScale(r / 40).setAlpha(0.45);
      this.children.moveBelow(glow, c);
      c.setSize(r * 2 + 16, r * 2 + 16).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.select(n));
    }
    const name = label(this, x, y + r + 3, tr(KIND_LABEL[n.kind]), FONT.small, available ? COLORS.text : COLORS.textDim, 0.5, 0);
    name.setAlpha(available || boss ? 1 : 0.6);
  }

  private nodeIcon(n: MapNode): Phaser.GameObjects.GameObject | null {
    const biome = biomeForDepth(this.run.depth, this.run.regions);
    const img = (atlas: string, frame: string, max = 22) => {
      if (!this.textures.get(atlas).has(frame)) return null;
      const i = this.add.image(0, 0, atlas, frame);
      i.setScale(Math.min(1.4, max / Math.max(i.width, i.height)));
      return i;
    };
    switch (n.kind) {
      case 'start': return img('props', 'lamp/torch_0/0', 20);
      case 'combat': {
        const e = ENEMIES[biome.enemies[0]];
        return img('monsters', `${e.sprite.key}/down/1`, 26);
      }
      case 'elite': {
        const e = ENEMIES[biome.elites[0]];
        const i = img('monsters', `${e.sprite.key}/down/1`, 28);
        (i as Phaser.GameObjects.Image | null)?.setTint(0xffd84a);
        return i;
      }
      case 'treasure': return img('props', 'chest/chest_03/0', 20);
      case 'shop': return this.add.image(0, 0, 'pk_coin').setScale(2.2);
      case 'shrine': {
        const i = img('props', 'p/statue_01', 24) as Phaser.GameObjects.Image | null;
        if (i && n.content) i.setTint(SPIRITS[n.content as keyof typeof SPIRITS]?.color ?? 0xffffff);
        return i;
      }
      case 'rest': return img('props', 'fire/campfire_burning/1', 24);
      case 'event': return this.add.bitmapText(0, -1, FONT.title, '?').setOrigin(0.5).setTint(0xc8b0ff);
      case 'mystery': return this.add.bitmapText(0, -1, FONT.title, '??').setOrigin(0.5).setTint(0xff9ad0);
      case 'challenge': return img('props', 'p/torii_01', 26);
      case 'boss': {
        const def = BOSSES[BIOME_BOSS[biome.boss] ?? biome.boss];
        return def ? img('battlers', def.frame, 40) : null;
      }
    }
  }

  private drawFooter(): void {
    const W = this.W;
    const H = this.H - this.adReserve;
    const run = this.run;
    const ctx = buildContext(this.save, run);
    const maxHp = Math.round(ctx.stats.maxHp);
    const hp = run.hp < 0 ? maxHp : run.hp;
    panel(this, 6, H - 122, W - 12, 116, 'ui_panel_dark').setAlpha(0.92);
    label(this, 16, H - 114, `HP ${hp}/${maxHp}`, FONT.small, COLORS.text);
    new Bar(this, 16, H - 104, W / 2 - 30, 7, COLORS.red).setValue(hp / maxHp, false);
    label(this, W / 2 + 4, H - 114, `${t('gold')}: ${run.gold}`, FONT.small, COLORS.gold);
    fitBox(label(this, W / 2 + 4, H - 102, `Lv ${run.level}  ·  ${t('boons')}: ${run.boons.length}  ·  ${t('relics')}: ${run.relics.length}`, FONT.small, COLORS.textDim), W / 2 - 20);
    label(this, W / 2, H - 84, t('chooseRoute'), FONT.head, COLORS.gold, 0.5, 0);
    const bw = (W - 36) / 2;
    new Button(this, 18 + bw / 2, H - 38, t('build'), () => {
      this.scene.launch('Build', { from: 'RunMap' });
      this.scene.pause();
    }, { w: bw, h: 28 });
    new Button(this, 18 + bw * 1.5 + 6, H - 38, t('menuBtn'), () => {
      this.scene.launch('Pause', { room: null, from: 'RunMap' });
      this.scene.pause();
    }, { w: bw, h: 28 });
  }

  private select(n: MapNode): void {
    if (this.transitioning) return;
    services.audio?.sfx('ui_confirm');
    services.platform?.haptic('medium');
    const run = this.run;
    const node = RunManager.moveTo(run, n.id);
    let kind: NodeKind = node.kind;
    let reward = node.content;
    if (kind === 'mystery') {
      const r = new Rng(hashString(`${run.seed}:mystery:${n.id}`));
      kind = r.weighted([['event', 45], ['treasure', 20], ['combat', 20], ['elite', 8], ['shop', 7]] as const);
      if (kind === 'combat' || kind === 'elite') reward = r.pick(['relic', 'item', 'boon']);
    }
    this.goTo('Room', { kind, reward, content: node.content, modifier: node.modifier });
  }
}

/** Events that can appear at this depth and region, skipping resolved quest events. */
function eventPool(save: SaveData, depth: number, region: string): EventDef[] {
  return EVENTS.filter((e) => e.minDepth <= depth && (e.maxDepth ?? 9) >= depth
    && (!e.onceFlag || !save.flags[e.onceFlag])
    && (!e.region || e.region === region)
    && (!e.quest || save.quests[e.quest]?.status === 'active'));
}
