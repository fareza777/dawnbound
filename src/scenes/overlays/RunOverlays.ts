import Phaser from 'phaser';
import { OverlayScene, type OverlayData } from './OverlayScene';
import { COLORS, FONT, RARITY_COLORS } from '@/ui/theme';
import { Button, fitBox, label, panel, para, toast } from '@/ui/widgets';
import { confirm } from '@/ui/modal';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { bus } from '@/core/events';
import { RunManager, buildContext } from '@/game/RunManager';
import { SPIRITS, SPIRIT_IDS, boonDef } from '@/data/boons';
import { relicDef, RELIC_TIER_COLOR, type RelicDef } from '@/data/relics';
import { eventById, type EventChoice, type Outcome } from '@/data/events';
import { materialDef } from '@/data/materials';
import { generateItem, ilvlFor, itemName } from '@/systems/loot';
import { formatStatValue } from '@/systems/stats';
import { STATS, type StatKey } from '@/data/stats';
import { Rng, hashString } from '@/core/rng';
import { boonDescription } from './BoonPickScene';
import { ScrollPanel } from '@/ui/scroll';

// ============================================================================ Pause
export class PauseScene extends OverlayScene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const inner = this.frame(t('pause'), 0.62);
    services.audio?.setDuck(0.4);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => services.audio?.setDuck(1));
    const run = RunManager.run;
    const cx = this.W / 2;
    let y = inner.y + 10;
    if (run) {
      label(this, cx, y, `${t('seed')}: ${run.seed.toString(36).toUpperCase()}`, FONT.small, COLORS.textDim, 0.5, 0);
      y += 14;
      const mins = Math.floor(run.timeSec / 60);
      label(this, cx, y, `${t('time')}: ${mins}m ${Math.floor(run.timeSec % 60)}s  ·  ${t('kills')}: ${run.kills}`, FONT.small, COLORS.textDim, 0.5, 0);
      y += 24;
    }
    const bw = Math.min(220, inner.w - 20);
    new Button(this, cx, y + 14, t('resume'), () => this.close(), { w: bw, h: 30, style: 'primary' });
    y += 40;
    new Button(this, cx, y + 14, t('build'), () => {
      this.scene.launch('Build', { from: 'Pause' });
      this.scene.pause();
    }, { w: bw, h: 30 });
    y += 40;
    new Button(this, cx, y + 14, t('menuSettings'), () => {
      this.scene.launch('Settings', { from: 'Pause' });
      this.scene.pause();
    }, { w: bw, h: 30 });
    y += 40;
    new Button(this, cx, y + 14, t('abandonRun'), () => {
      confirm(this, t('abandonRun'), t('abandonConfirm'), () => {
        const from = this.from;
        this.scene.stop('Hud');
        this.scene.stop(from);
        this.scene.stop();
        this.scene.start('Results', { victory: false, abandoned: true });
      }, true);
    }, { w: bw, h: 30, style: 'danger' });
    y += 40;
    new Button(this, cx, y + 14, t('quitToMenu'), () => {
      services.save!.flush();
      const from = this.from;
      this.scene.stop('Hud');
      this.scene.stop(from);
      this.scene.stop();
      this.scene.start('Menu');
    }, { w: bw, h: 30 });
    this.fitTo(y + 30);
  }
}

// ============================================================================ Build viewer
export class BuildScene extends OverlayScene {
  constructor() {
    super('Build');
  }

  create(): void {
    const inner = this.frame(t('build'), 0.88);
    const run = RunManager.run;
    const scroll = new ScrollPanel(this, inner.x, inner.y, inner.w, inner.h);
    let y = 0;
    const add = (o: Phaser.GameObjects.GameObject & { height?: number }) => scroll.add(o);
    if (!run) return;
    const ctx = buildContext(this.save, run);
    add(this.add.bitmapText(0, y, FONT.head, t('stats')).setTint(COLORS.gold));
    y += 18;
    const keys: StatKey[] = ['maxHp', 'atk', 'def', 'critChance', 'critDmg', 'atkSpeed', 'moveSpeed', 'dashCharges', 'lifesteal', 'cdr', 'dodge', 'dmgReduction', 'luck'];
    keys.forEach((k, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      add(this.add.bitmapText(col * (inner.w / 2), y + row * 12, FONT.small, `${tr(STATS[k].name)}: ${formatStatValue(k, ctx.stats[k])}`).setTint(COLORS.text));
    });
    y += Math.ceil(keys.length / 2) * 12 + 10;
    add(this.add.bitmapText(0, y, FONT.head, `${t('boons')} (${run.boons.length})`).setTint(COLORS.gold));
    y += 18;
    if (run.boons.length === 0) {
      add(this.add.bitmapText(0, y, FONT.small, t('nothingHere')).setTint(COLORS.textDim));
      y += 14;
    }
    for (const b of run.boons) {
      const def = boonDef(b.id);
      if (!def) continue;
      const sp = SPIRITS[def.spirit];
      const iconKey = `icons_boon_${def.id}`;
      add(this.textures.exists(iconKey)
        ? this.add.image(10, y + 10, iconKey).setDisplaySize(20, 20)
        : this.add.image(10, y + 6, 'proj_orb').setTint(sp.color).setBlendMode('ADD'));
      add(this.add.bitmapText(26, y, FONT.body, `${tr(def.name)}  ${b.rank}/${def.maxRank}`).setTint(sp.color));
      const d = this.add.bitmapText(26, y + 14, FONT.small, boonDescription(def, b.rank)).setMaxWidth(inner.w - 30).setTint(COLORS.textDim);
      add(d);
      y += Math.max(24, 18 + d.height) + 4;
    }
    y += 6;
    add(this.add.bitmapText(0, y, FONT.head, `${t('relics')} (${run.relics.length})`).setTint(COLORS.gold));
    y += 18;
    for (const id of run.relics) {
      const r = relicDef(id);
      if (!r) continue;
      if (this.textures.exists(r.icon)) add(this.add.image(10, y + 10, r.icon).setDisplaySize(20, 20));
      add(this.add.bitmapText(26, y, FONT.body, tr(r.name)).setTint(RELIC_TIER_COLOR[r.tier]));
      const d = this.add.bitmapText(26, y + 14, FONT.small, tr(r.desc)).setMaxWidth(inner.w - 30).setTint(COLORS.textDim);
      add(d);
      y += Math.max(24, 18 + d.height) + 4;
    }
    scroll.setContentHeight(y + 10);
  }
}

// ============================================================================ Rest
export class RestScene extends OverlayScene {
  constructor() {
    super('Rest');
  }

  create(): void {
    const inner = this.frame(t('restTitle'), 0.56, false);
    const room = this.room!;
    const run = RunManager.run!;
    para(this, inner.x, inner.y, t('restBody'), inner.w, FONT.body, COLORS.textDim);
    const cx = this.W / 2;
    const bw = inner.w - 20;
    let y = inner.y + 60;
    const done = () => this.close(() => room.refreshPlayerStats());
    new Button(this, cx, y, t('restHeal'), () => {
      room.player.heal(room.player.maxHp * 0.35, true);
      services.audio?.sfx('heal');
      done();
    }, { w: bw, h: 34, style: 'primary' });
    y += 44;
    const canUpgrade = run.boons.some((b) => (boonDef(b.id)?.maxRank ?? 0) > b.rank);
    new Button(this, cx, y, t('restUpgrade'), () => {
      const id = RunManager.upgradeRandomBoon(run, RunManager.rngFor(run, 'rest_temper'));
      if (id) toast(this.scene.get('Hud'), `${tr(boonDef(id)!.name)} ↑`, COLORS.gold);
      services.audio?.sfx('anvil');
      done();
    }, { w: bw, h: 34, disabled: !canUpgrade });
    y += 44;
    new Button(this, cx, y, t('restFlask'), () => {
      room.player.potions = room.player.maxPotions;
      room.player.heal(room.player.maxHp * 0.1, true);
      services.audio?.sfx('potion');
      done();
    }, { w: bw, h: 34 });
    this.fitTo(y + 17, 20);
  }
}

// ============================================================================ Shop
interface Ware {
  kind: 'boon' | 'relic' | 'heal' | 'flask' | 'item' | 'reroll';
  price: number;
  relic?: RelicDef;
  spirit?: string;
  sold: boolean;
}

export class ShopScene extends OverlayScene {
  private wares: Ware[] = [];
  private goldText!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Shop');
  }

  create(): void {
    const inner = this.frame(t('shop'), 0.86);
    const run = RunManager.run!;
    const room = this.room!;
    const ctx = room.ctx;
    const node = RunManager.node(run);
    const rng = new Rng(hashString(`${run.seed}:shop:${node.id}:${run.depth}:${run.floor}`));
    const discount = (1 - ctx.p('shop_discount') / 100) * (1 + (run.vows.v_poor ?? 0) * 0.25);
    const price = (n: number) => Math.max(1, Math.round(n * discount * (1 + (run.depth - 1) * 0.25)));
    const key = `shop:${node.id}`;
    const stored = (room as unknown as { shopCache?: Record<string, Ware[]> }).shopCache ?? {};
    if (stored[key]) this.wares = stored[key];
    else {
      this.wares = [
        { kind: 'boon', price: price(75), spirit: rng.pick(SPIRIT_IDS), sold: false },
        { kind: 'boon', price: price(75), spirit: rng.pick(SPIRIT_IDS), sold: false },
        { kind: 'relic', price: price(120), relic: RunManager.relicOffer(run, rng, [['common', 50], ['rare', 40], ['epic', 10]]) ?? undefined, sold: false },
        { kind: 'item', price: price(90), sold: false },
        { kind: 'heal', price: price(40), sold: false },
        { kind: 'flask', price: price(35), sold: false },
      ];
      stored[key] = this.wares;
      (room as unknown as { shopCache?: Record<string, Ware[]> }).shopCache = stored;
    }
    const npcSay = this.add.bitmapText(inner.x, inner.y, FONT.body, t('merchantGreet')).setMaxWidth(inner.w).setTint(0xffd9a0);
    this.goldText = label(this, this.W / 2, inner.y + npcSay.height + 6, '', FONT.head, COLORS.gold, 0.5, 0);
    this.refreshGold();
    const blood = ctx.has('blood_shop');
    let y = inner.y + npcSay.height + 28;
    const rowH = Math.min(52, Math.floor((inner.h - (y - inner.y) - 10) / this.wares.length) - 4);
    this.wares.forEach((w) => {
      this.makeRow(w, inner.x, y, inner.w, rowH, blood);
      y += rowH + 4;
    });
  }

  private refreshGold(): void {
    this.goldText.setText(`${t('gold')}: ${RunManager.run!.gold}`);
  }

  private wareInfo(w: Ware): { name: string; desc: string; color: number } {
    switch (w.kind) {
      case 'boon': {
        const sp = SPIRITS[w.spirit as keyof typeof SPIRITS];
        return { name: `${tr(sp.title)}`, desc: t('wareBoon'), color: sp.color };
      }
      case 'relic': return w.relic ? { name: tr(w.relic.name), desc: tr(w.relic.desc), color: RELIC_TIER_COLOR[w.relic.tier] } : { name: '-', desc: '', color: COLORS.textDim };
      case 'item': return { name: t('wareItem'), desc: t('wareItemDesc'), color: COLORS.blue };
      case 'heal': return { name: t('wareHeal'), desc: t('wareHealDesc'), color: COLORS.red };
      case 'flask': return { name: t('restFlask'), desc: t('wareFlaskDesc'), color: 0xff9ad0 };
      default: return { name: '', desc: '', color: COLORS.text };
    }
  }

  private wareIcon(w: Ware): string | null {
    const key = w.kind === 'relic' ? w.relic?.icon
      : w.kind === 'boon' ? SPIRITS[w.spirit as keyof typeof SPIRITS]?.portrait
      : w.kind === 'item' ? 'ui_icon_inventory'
      : 'ui_icon_flask';
    return key && this.textures.exists(key) ? key : null;
  }

  private makeRow(w: Ware, x: number, y: number, width: number, h: number, blood: boolean): void {
    const info = this.wareInfo(w);
    panel(this, x, y, width, h, 'ui_panel_dark');
    const icon = this.wareIcon(w);
    const tx = icon ? x + 36 : x + 8;
    if (icon) this.add.image(x + 18, y + h / 2, icon).setDisplaySize(26, 26);
    this.add.bitmapText(tx, y + 5, FONT.body, info.name).setTint(info.color);
    fitBox(this.add.bitmapText(tx, y + 21, FONT.small, info.desc).setMaxWidth(width - (tx - x) - 88).setTint(COLORS.textDim), width - (tx - x) - 88, h - 23);
    const cost = blood ? `${Math.ceil(w.price / 5)} HP` : `${w.price}`;
    const btn = new Button(this, x + width - 42, y + h / 2, w.sold ? t('soldOut') : cost, () => this.buy(w, btn), {
      w: 72, h: 26, style: 'primary', disabled: w.sold || (w.kind === 'relic' && !w.relic),
    });
  }

  private buy(w: Ware, btn: Button): void {
    const run = RunManager.run!;
    const room = this.room!;
    const blood = room.ctx.has('blood_shop');
    if (blood) {
      const hpCost = Math.ceil(w.price / 5);
      if (room.player.hp <= hpCost + 1) return toast(this, t('notEnoughHp'), COLORS.red);
      room.player.hp -= hpCost;
    } else {
      if (run.gold < w.price) {
        services.audio?.sfx('ui_error');
        return toast(this, t('notEnoughGold'), COLORS.red);
      }
      run.gold -= w.price;
    }
    w.sold = true;
    btn.setCaption(t('soldOut')).setEnabled(false);
    services.audio?.sfx('buy');
    bus.emit('purchase', { shop: 'run', cost: w.price });
    this.refreshGold();
    switch (w.kind) {
      case 'boon':
        this.close(() => room.openBoonPick('orb', w.spirit as never));
        return;
      case 'relic':
        if (w.relic) {
          RunManager.addRelic(run, w.relic.id);
          room.refreshPlayerStats();
        }
        break;
      case 'item': {
        const s = this.save;
        // Seeded from the run so daily/shared seeds stay reproducible.
        const rng = RunManager.rngFor(run, 'shop_item');
        const item = generateItem(rng, { ilvl: ilvlFor(run.depth, run.floor, new Rng(run.seed)), depth: run.depth, source: 'shop', uid: services.save!.nextUid(), rarity: rng.chance(0.3) ? 3 : 2 });
        s.inventory.push(item);
        toast(this, itemName(item), RARITY_COLORS[item.rarity]);
        break;
      }
      case 'heal':
        room.player.heal(room.player.maxHp * 0.4, true);
        break;
      case 'flask':
        room.player.potions = room.player.maxPotions;
        break;
    }
    services.save!.markDirty();
  }
}

// ============================================================================ Event
export class EventScene extends OverlayScene {
  private eventId?: string;

  constructor() {
    super('Event');
  }

  init(data: OverlayData & { eventId?: string }): void {
    super.init(data);
    this.eventId = data.eventId;
  }

  create(): void {
    const ev = eventById(this.eventId) ?? eventById('ev_spirit_well')!;
    const inner = this.frame(tr(ev.speaker), 0.84, false);
    const s = this.save;
    if (!s.codex.events.includes(ev.id)) s.codex.events.push(ev.id);
    this.drawPortrait(ev.portrait, this.W / 2, inner.y + 42);
    const text = para(this, inner.x + 4, inner.y + 90, tr(ev.text), inner.w - 8, FONT.body, COLORS.text);
    let y = inner.y + 100 + text.height;
    const run = RunManager.run!;
    ev.choices.forEach((c) => {
      const afford = (!c.cost?.gold || run.gold >= c.cost.gold);
      // Readable choice: the action in the body font, what it costs or gives on a dimmer line below.
      const h = c.hint ? 44 : 34;
      const btn = new Button(this, this.W / 2, y + h / 2, tr(c.label), () => this.choose(c), { w: inner.w - 8, h, disabled: !afford, font: FONT.body });
      if (c.hint) {
        btn.text.setY(-8);
        const hint = this.add.bitmapText(0, 9, FONT.small, tr(c.hint)).setOrigin(0.5).setTint(afford ? 0xffd9a0 : COLORS.textDim);
        btn.add(hint);
      }
      y += h + 6;
    });
    this.fitTo(y);
    services.audio?.sfx('event_open', { volume: 0.7 });
  }

  private drawPortrait(key: string, x: number, y: number): void {
    const [atlas, frame] = key.includes(':') ? key.split(':') : [key, undefined];
    if (!this.textures.exists(atlas)) return;
    const img = frame ? this.add.image(x, y, atlas, frame) : this.add.image(x, y, atlas);
    const scale = Math.min(3, 72 / Math.max(img.width, img.height));
    img.setScale(scale);
    const glow = this.add.image(x, y, 'fx_light').setTint(0xc8b0ff).setBlendMode('ADD').setScale(0.6).setAlpha(0.3);
    this.children.moveBelow(glow, img);
  }

  private choose(c: EventChoice): void {
    const run = RunManager.run!;
    const room = this.room!;
    if (c.cost?.gold) run.gold -= c.cost.gold;
    if (c.cost?.hpPct) room.player.hp = Math.max(1, room.player.hp - room.player.maxHp * (c.cost.hpPct / 100));
    const success = c.chance === undefined || Math.random() < c.chance;
    const outcomes = success ? c.outcome : c.fail ?? [];
    const resultText = success ? tr(c.result) : tr(c.failResult ?? c.result);
    bus.emit('eventChoice', { eventId: this.eventId ?? '', choice: tr(c.label) });
    this.children.removeAll(true);
    const inner = this.frame(success ? t('eventResult') : t('eventFail'), 0.5, false);
    const lines = this.applyOutcomes(outcomes);
    const p = para(this, inner.x + 4, inner.y + 4, resultText, inner.w - 8, FONT.body, COLORS.text);
    let y = inner.y + p.height + 16;
    for (const l of lines) {
      label(this, this.W / 2, y, l.text, FONT.small, l.color, 0.5, 0);
      y += 13;
    }
    const fight = outcomes.find((o) => o.type === 'fight') as { type: 'fight'; elite?: boolean } | undefined;
    const boons = outcomes.filter((o) => o.type === 'boon').length;
    y += 10;
    new Button(this, this.W / 2, y + 14, t('continue'), () => {
      this.close(() => {
        room.refreshPlayerStats();
        if (boons > 0) {
          (room as unknown as { pendingEventBoons: number }).pendingEventBoons = boons - 1;
          room.openBoonPick('orb', SPIRIT_IDS[Math.floor(Math.random() * SPIRIT_IDS.length)]);
        }
        if (fight) room.startAmbush(!!fight.elite);
      });
    }, { w: 160, h: 28, style: 'primary' });
    this.fitTo(y + 28);
    services.save!.markDirty();
  }

  private applyOutcomes(list: Outcome[]): { text: string; color: number }[] {
    const run = RunManager.run!;
    const room = this.room!;
    const s = this.save;
    const out: { text: string; color: number }[] = [];
    const rng = RunManager.rngFor(run, `event_${this.eventId ?? ''}`);
    for (const o of list) {
      switch (o.type) {
        case 'gold': run.gold = Math.max(0, run.gold + o.v); out.push({ text: `${o.v > 0 ? '+' : ''}${o.v} ${t('gold')}`, color: COLORS.gold }); break;
        case 'hp':
          if (o.v >= 0) room.player.heal(room.player.maxHp * (o.v / 100), false);
          else room.player.hp = Math.max(1, room.player.hp + room.player.maxHp * (o.v / 100));
          out.push({ text: `${o.v > 0 ? '+' : ''}${o.v}% HP`, color: o.v > 0 ? COLORS.green : COLORS.red });
          break;
        case 'maxhp':
          run.bonusMaxHp = (run.bonusMaxHp ?? 0) + o.v;
          room.player.hp = Math.max(1, room.player.hp + o.v);
          out.push({ text: `${o.v > 0 ? '+' : ''}${o.v} ${t('maxHp')}`, color: o.v > 0 ? COLORS.green : COLORS.red });
          break;
        case 'boon': break;
        case 'upgrade': {
          const id = RunManager.upgradeRandomBoon(run, rng);
          if (id) out.push({ text: `${tr(boonDef(id)!.name)} ↑`, color: COLORS.cyan });
          break;
        }
        case 'relic': {
          const r = RunManager.relicOffer(run, rng, [[o.tier, 1]]);
          if (r) {
            RunManager.addRelic(run, r.id);
            out.push({ text: `${t('relics')}: ${tr(r.name)}`, color: RELIC_TIER_COLOR[r.tier] });
          }
          break;
        }
        case 'item': {
          const item = generateItem(rng, { ilvl: ilvlFor(run.depth, run.floor, rng), depth: run.depth, source: 'reward', rarity: (o.rarity ?? 2) as 0, uid: services.save!.nextUid() });
          s.inventory.push(item);
          out.push({ text: itemName(item), color: RARITY_COLORS[item.rarity] });
          break;
        }
        case 'embers': run.embersFound = Math.max(0, run.embersFound + o.v); out.push({ text: `${o.v > 0 ? '+' : ''}${o.v} ${t('embers')}`, color: COLORS.ember }); break;
        case 'material': {
          s.materials[o.id] = (s.materials[o.id] ?? 0) + o.n;
          const d = materialDef(o.id);
          out.push({ text: `+${o.n} ${d ? tr(d.name) : o.id}`, color: COLORS.blue });
          bus.emit('materialGained', { materialId: o.id, amount: o.n });
          break;
        }
        case 'shard': s.currency.shards += 1; out.push({ text: `+1 ${t('shards')}`, color: 0xff9ad0 }); break;
        case 'lore':
          if (!s.codex.lore.includes(o.id)) s.codex.lore.push(o.id);
          bus.emit('loreFound', { loreId: o.id });
          out.push({ text: t('loreFound'), color: 0xc8b0ff });
          break;
        case 'flask':
          room.player.potions = Math.max(0, Math.min(room.player.maxPotions + 1, room.player.potions + o.v));
          out.push({ text: `${o.v > 0 ? '+' : ''}${o.v} ${t('potion')}`, color: 0xff9ad0 });
          break;
        case 'flag': s.flags[o.id] = 1; break;
        case 'fight': out.push({ text: t('ambush'), color: COLORS.red }); break;
      }
    }
    return out;
  }
}
