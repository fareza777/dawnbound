/** Development-only hooks used by the automated play harness (tools/play.mjs). Never bundled in production. */
import Phaser from 'phaser';
import { controls } from './game/input';
import { services } from './core/services';
import { RunManager } from './game/RunManager';
import { FlowField } from './game/FlowField';
import type { RoomLayout } from './systems/roomgen';
import { Rng } from './core/rng';
import { generateItem, ilvlFor } from './systems/loot';
import { bestLoadout } from './game/equipBest';
import { MATERIALS } from './data/materials';
import type { Rarity } from './data/types';
import { view } from './core/viewport';
import { QUESTS } from './data/quests';
import { BIOMES } from './data/biomes';
import { setLang, type Lang } from './core/i18n';

type AnyScene = Phaser.Scene & Record<string, unknown>;

function press(obj: Phaser.GameObjects.GameObject | undefined): void {
  if (!obj) return;
  obj.emit('pointerdown', { x: 0, y: 0 });
  obj.emit('pointerup', { x: 0, y: 0 });
}

function buttonsIn(scene: Phaser.Scene): Phaser.GameObjects.Container[] {
  const out: Phaser.GameObjects.Container[] = [];
  const walk = (list: Phaser.GameObjects.GameObject[]) => {
    for (const o of list) {
      if (o instanceof Phaser.GameObjects.Container) {
        if ((o as unknown as { bw?: number }).bw !== undefined && o.input?.enabled) out.push(o);
        walk(o.list);
      }
    }
  };
  walk(scene.children.list);
  return out;
}

interface BotStats {
  /** Set true from the harness to freeze the bot (e.g. to screenshot a moment). */
  paused: boolean;
  rooms: number;
  deaths: number;
  runs: number;
  log: string[];
}

/** Simple autopilot: fights, loots, picks the first option in every menu, and keeps descending. */
function startAutoplay(game: Phaser.Game): BotStats {
  const stats: BotStats = { paused: false, rooms: 0, deaths: 0, runs: 0, log: [] };
  let lastScene = '';
  let stuck = 0;
  let lastPos = { x: 0, y: 0 };
  // Interactables the bot already used (shops never flag themselves as used, which trapped the bot in a loop).
  const visited = new WeakSet<object>();
  // Bot-owned flow field (the room's own field is centred on the player, the bot needs one centred on its target).
  let nav: { layout: object; field: FlowField } | null = null;
  const log = (m: string) => {
    stats.log.push(`${Math.round(performance.now() / 1000)}s ${m}`);
    if (stats.log.length > 200) stats.log.shift();
  };
  setInterval(() => {
    if (stats.paused) return;
    const active = game.scene.getScenes(true).map((s) => s.scene.key).filter((k) => k !== 'Notify');
    const top = active[active.length - 1] ?? '';
    if (top !== lastScene) {
      log(`scene ${active.join('>')}`);
      lastScene = top;
    }
    const sc = (k: string) => game.scene.getScene(k) as AnyScene;
    if (active.includes('Dialogue')) {
      const d = sc('Dialogue');
      const btns = buttonsIn(d);
      if (btns.length) press(btns[btns.length - 1]);
      else (d as unknown as { advance: () => void }).advance();
      return;
    }
    if (active.includes('BoonPick')) {
      const cards = (sc('BoonPick').cards as Phaser.GameObjects.Container[]) ?? [];
      if (cards[0]) cards[0].emit('pointerup');
      return;
    }
    for (const k of ['Event', 'Rest', 'Shop', 'Build', 'Pause', 'Descend']) {
      if (!active.includes(k)) continue;
      const btns = buttonsIn(sc(k));
      if (k === 'Shop' || k === 'Build' || k === 'Pause') {
        (sc(k) as unknown as { close: () => void }).close();
        return;
      }
      const enabled = btns.filter((b) => (b as unknown as { enabled: boolean }).enabled !== false);
      press(enabled[0]);
      return;
    }
    if (top === 'Results') {
      // "Return to Village" is the last button (an optional rewarded button may come first).
      const btns = buttonsIn(sc('Results'));
      press(btns[btns.length - 1]);
      stats.runs++;
      return;
    }
    if (top === 'Intro' || top === 'Transition' || top === 'Splash') {
      (sc(top) as unknown as { advance?: () => void }).advance?.();
      game.scene.getScene(top).input.emit('pointerup', { x: 10, y: 10 });
      return;
    }
    if (top === 'Menu' || top === 'Onboarding') {
      const s = services.save!.data;
      s.profile.onboardingDone = true;
      s.profile.introSeen = true;
      game.scene.getScene(top).scene.start(s.run ? 'RunMap' : 'Hub');
      return;
    }
    if (top === 'HubHud' || active.includes('Hub')) {
      const s = services.save!.data;
      s.flags.rift_open = 1;
      if (!game.scene.isPaused('Hub')) {
        RunManager.start({ heroId: s.profile.heroId });
        (sc('Hub') as unknown as { goTo: (k: string) => void }).goTo('RunMap');
      }
      return;
    }
    if (top === 'RunMap') {
      const run = RunManager.run;
      if (!run) return;
      const choices = RunManager.choices(run);
      if (choices[0] && !(sc('RunMap').transitioning as boolean)) {
        (sc('RunMap') as unknown as { select: (n: unknown) => void }).select(choices[0]);
        log(`node ${choices[0].kind}`);
      }
      return;
    }
    if (active.includes('Room') && !game.scene.isPaused('Room')) {
      const room = sc('Room') as unknown as {
        player: { x: number; y: number; hp: number; maxHp: number; alive: boolean; potions: number; skillCd: number; flare: number };
        enemies: { x: number; y: number; alive: boolean }[];
        interactables: { x: number; y: number; used?: boolean }[];
        cleared: boolean; layout: RoomLayout; roomData: { kind: string };
        pickups: { list: { alive: boolean; kind: string; x: number; y: number }[] };
        projectiles: { list: { alive: boolean; x: number; y: number; vx: number; vy: number; spec: { friendly?: boolean } }[] };
      };
      const p = room.player;
      if (!p || !p.alive) {
        controls.moveX = 0;
        controls.moveY = 0;
        controls.attackHeld = false;
        return;
      }
      const alive = room.enemies.filter((e) => e.alive);
      let tx: number | null = null;
      let ty: number | null = null;
      if (alive.length) {
        const e = alive.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        controls.attackHeld = d < 170;
        if (d > 26) {
          tx = e.x;
          ty = e.y;
        }
        if (p.skillCd <= 0 && d < 40) controls.skill = true;
        if (p.flare >= 100) controls.flare = true;
        if (p.hp < p.maxHp * 0.35 && p.potions > 0) controls.potion = true;
        if (p.hp < p.maxHp * 0.5 && Math.random() < 0.08) controls.dash = true;
        // Dodge: dash sideways away from a hostile projectile that is closing in.
        const threat = room.projectiles.list.find((q) => q.alive && !q.spec.friendly && Math.hypot(q.x - p.x, q.y - p.y) < 48
          && (p.x - q.x) * q.vx + (p.y - q.y) * q.vy > 0);
        if (threat) {
          const len = Math.hypot(threat.vx, threat.vy) || 1;
          controls.moveX = -threat.vy / len;
          controls.moveY = threat.vx / len;
          controls.dash = true;
          lastPos = { x: p.x, y: p.y };
          return;
        }
      } else {
        controls.attackHeld = false;
        const item = room.pickups.list.find((q) => q.alive && q.kind === 'item');
        const inter = room.interactables.find((i) => !i.used && !visited.has(i));
        if (item) {
          tx = item.x;
          ty = item.y;
        } else if (inter) {
          tx = inter.x;
          ty = inter.y;
          if (Math.hypot(inter.x - p.x, inter.y - p.y) < 16) {
            controls.interact = true;
            visited.add(inter);
          }
        } else if (room.cleared) {
          tx = room.layout.exit.x * 16 + 8;
          ty = 40;
        }
      }
      if (tx !== null && ty !== null) {
        if (!nav || nav.layout !== room.layout) nav = { layout: room.layout, field: new FlowField(room.layout) };
        nav.field.update(tx, ty);
        const dir = nav.field.dirFrom(p.x, p.y, tx, ty);
        controls.moveX = dir.x;
        controls.moveY = dir.y;
        if (Math.hypot(p.x - lastPos.x, p.y - lastPos.y) < 0.5) stuck++;
        else stuck = 0;
        if (stuck > 12) {
          controls.moveX = Math.random() * 2 - 1;
          controls.moveY = Math.random() * 2 - 1;
          controls.dash = true;
          stuck = 0;
        }
      } else {
        controls.moveX = 0;
        controls.moveY = 0;
      }
      lastPos = { x: p.x, y: p.y };
    }
  }, 100);
  return stats;
}

interface Box { x: number; y: number; r: number; b: number; masked: boolean }

function hasMask(o: Phaser.GameObjects.GameObject | null): boolean {
  for (let c: Phaser.GameObjects.GameObject | null = o; c; c = (c as unknown as { parentContainer: Phaser.GameObjects.GameObject | null }).parentContainer) {
    if ((c as unknown as { mask?: unknown }).mask) return true;
  }
  return false;
}

function visibleChain(o: Phaser.GameObjects.GameObject): boolean {
  for (let c: Phaser.GameObjects.GameObject | null = o; c; c = (c as unknown as { parentContainer: Phaser.GameObjects.GameObject | null }).parentContainer) {
    const v = c as unknown as { visible?: boolean; alpha?: number };
    if (v.visible === false || (v.alpha ?? 1) < 0.05) return false;
  }
  return true;
}

/** QA: every visible text whose bounds stick out of the smallest box (panel, button, slot) it sits in, or off-screen. */
function findOverflow(game: Phaser.Game): string[] {
  const out: string[] = [];
  const W = view.w;
  for (const sc of game.scene.getScenes(true)) {
    const boxes: Box[] = [];
    const texts: Phaser.GameObjects.BitmapText[] = [];
    const walk = (list: Phaser.GameObjects.GameObject[]) => {
      for (const o of list) {
        if (!visibleChain(o)) continue;
        if (o instanceof Phaser.GameObjects.Container) walk(o.list);
        else if (o instanceof Phaser.GameObjects.BitmapText) texts.push(o);
        else if (o instanceof Phaser.GameObjects.NineSlice) {
          const b = o.getBounds();
          boxes.push({ x: b.x, y: b.y, r: b.right, b: b.bottom, masked: hasMask(o) });
        }
      }
    };
    walk(sc.children.list);
    for (const tx of texts) {
      if (!tx.text.trim()) continue;
      const tb = tx.getBounds();
      if (tb.width < 1) continue;
      const cx = tb.centerX;
      const cy = tb.centerY;
      const txMasked = hasMask(tx);
      // Boxes inside a scroll mask only count for texts in the same list (hidden rows would give false alarms).
      const inside = boxes.filter((b) => txMasked === b.masked && cx >= b.x && cx <= b.r && cy >= b.y && cy <= b.b)
        .sort((a, b) => (a.r - a.x) * (a.b - a.y) - (b.r - b.x) * (b.b - b.y));
      const box = inside[0];
      const tag = `${sc.scene.key}: "${tx.text.replace(/\s+/g, ' ').slice(0, 40)}"`;
      const uiCamera = sc.cameras.main.zoom <= view.res + 0.01;
      if (uiCamera && (tb.x < -1 || tb.right > W + 1)) out.push(`${tag} off-screen (${Math.round(tb.x)}..${Math.round(tb.right)})`);
      if (!box) continue;
      const vert = !box.masked && !txMasked;
      const over = Math.max(box.x - tb.x, tb.right - box.r, vert ? box.y - tb.y : 0, vert ? tb.bottom - box.b : 0);
      if (over > 1.5) out.push(`${tag} exceeds box by ${Math.round(over)}px`);
    }
  }
  return out;
}

export function installDevHooks(): void {
  const game = (window as unknown as { __game: Phaser.Game }).__game;
  Object.assign(window as unknown as Record<string, unknown>, {
    __controls: controls,
    __services: services,
    __run: RunManager,
    /** Fill the stash with random gear and materials for UI screenshots. */
    __grant: (n = 16, seed = 'qa') => {
      const s = services.save!.data;
      const rng = new Rng(seed);
      for (let i = 0; i < n; i++) {
        s.inventory.push(generateItem(rng, { ilvl: rng.int(1, 40), depth: rng.int(1, 5), source: 'chest', rarity: rng.int(0, 5) as Rarity, uid: `qa${seed}${i}` }));
      }
      for (const m of MATERIALS) s.materials[m.id] = (s.materials[m.id] ?? 0) + rng.int(1, 20);
      s.currency.embers += 5000;
      return `granted ${n}`;
    },
    __overflow: () => findOverflow(game),
    /** Perf A/B: turn grass life on or off for the forest (applies to the next room). */
    __setFoliage: (on: boolean) => {
      BIOMES[0].theme.foliage = on;
      return on;
    },
    __questIds: QUESTS.map((q) => ({ id: q.id, type: q.type })),
    /** Balance benchmarks: stash three depth-appropriate items per slot, then wear the best (Equip Best). */
    __gearFor: (depth: number, rarity: Rarity = 1, seed = 1) => {
      const s = services.save!.data;
      const rng = new Rng(seed);
      s.inventory = [];
      s.equipped = {};
      for (const slot of ['weapon', 'helm', 'armor', 'boots', 'ring', 'amulet', 'charm'] as const) {
        for (let i = 0; i < 3; i++) s.inventory.push(generateItem(rng, { ilvl: ilvlFor(depth, 1, rng), depth, source: 'enemy', rarity, slot, uid: `b${slot}${i}` }));
      }
      s.equipped = bestLoadout(s);
      return Object.keys(s.equipped).length;
    },
    __setLang: (l: Lang) => {
      setLang(l);
      services.save!.data.settings.lang = l;
      return l;
    },
    __autoplay: () => {
      const st = startAutoplay(game);
      (window as unknown as { __bot: BotStats }).__bot = st;
      return 'autoplay on';
    },
  });
}
