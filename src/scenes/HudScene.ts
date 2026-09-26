import Phaser from 'phaser';
import { COLORS, FONT, RARITY_COLORS, fontSize } from '@/ui/theme';
import { Bar, fitBox, label, toast } from '@/ui/widgets';
import { controls } from '@/game/input';
import { t, tr } from '@/core/i18n';
import { xpForLevel } from '@/systems/combat';
import { itemName } from '@/systems/loot';
import { relicDef } from '@/data/relics';
import type { RoomScene } from './RoomScene';
import type { BossDef } from '@/data/bosses';
import type { ItemInstance } from '@/data/types';
import { services } from '@/core/services';
import { TutorialHints } from '@/ui/tutorialHints';
import { view, vx, vy } from '@/core/viewport';
import { nine } from '@/ui/skin';
import { a11y } from '@/core/a11y';
import { BLESSING_HP } from '@/game/progression';
import type { EnemyDef } from '@/data/enemies';

interface RoundButton {
  x: number;
  y: number;
  r: number;
  key: 'attack' | 'dash' | 'skill' | 'flare' | 'potion' | 'interact';
  /** Scratch vector drawing (not displayed): baked into `tex` whenever the button's look changes. */
  bg: Phaser.GameObjects.Graphics;
  /** What is actually drawn each frame: a texture, so the GPU never re-triangulates the circles. */
  tex: Phaser.GameObjects.RenderTexture;
  /** Overlay text: cooldown seconds, or the interact verb. */
  icon: Phaser.GameObjects.BitmapText;
  img?: Phaser.GameObjects.Image;
  /** Ring colour of the button's metal rim and progress arc. */
  ring: number;
  pointer: number | null;
  /** Live cooldown sweep (only drawn while the button is recharging). */
  cd?: Phaser.GameObjects.Graphics;
  /** Last drawn visual state: the button only re-tessellates its shapes when this changes. */
  state?: string;
}

/** Generated icon for each action button (the skill uses the hero's own icon). */
const BUTTON_ICONS: Record<string, string> = {
  attack: 'ui_icon_attack', dash: 'ui_icon_dash2', flare: 'ui_icon_flare', potion: 'ui_icon_flask', interact: 'ui_icon_interact',
};

/** Touch controls + HUD overlay for the combat room. Runs as its own scene on top of RoomScene. */
export class HudScene extends Phaser.Scene {
  private room!: RoomScene;
  private hp!: Bar;
  private xp!: Bar;
  private hpText!: Phaser.GameObjects.BitmapText;
  private goldText!: Phaser.GameObjects.BitmapText;
  private lvlText!: Phaser.GameObjects.BitmapText;
  private shieldText!: Phaser.GameObjects.BitmapText;
  private floorText!: Phaser.GameObjects.BitmapText;
  private joyBase!: Phaser.GameObjects.Image;
  private joyKnob!: Phaser.GameObjects.Image;
  private joyPointer: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private buttons: RoundButton[] = [];
  private bossBar?: Bar;
  private bossName?: Phaser.GameObjects.BitmapText;
  private bossGroup: Phaser.GameObjects.GameObject[] = [];
  private feed: Phaser.GameObjects.Container[] = [];
  private fpsText?: Phaser.GameObjects.BitmapText;
  private potionText!: Phaser.GameObjects.BitmapText;
  private hints?: TutorialHints;

  constructor() {
    super('Hud');
  }

  init(data: { room: RoomScene }): void {
    this.room = data.room;
    this.buttons = [];
    this.bossGroup = [];
    this.feed = [];
    this.joyPointer = null;
    this.bossBar = undefined;
  }

  create(): void {
    const W = view.w;
    const H = view.h;
    this.input.addPointer(3);
    this.buildTopBar(W);
    this.buildJoystick();
    this.buildButtons(W, H);
    this.setupPointers(W, H);
    // A scene's own event emitter survives restarts: without this, every room added another copy of each
    // listener and one item showed up as 10 notifications after 10 rooms.
    const custom = ['bossIntro', 'itemGained', 'relicGained', 'roomCleared', 'bossPhase', 'hurt', 'blessing', 'newEnemy', 'tip'];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => custom.forEach((n) => this.events.off(n)));
    this.events.on('bossIntro', (def: BossDef) => this.bossIntro(def));
    this.events.on('itemGained', (it: ItemInstance) => this.pushFeed(itemName(it), RARITY_COLORS[it.rarity]));
    this.events.on('relicGained', (id: string) => {
      const r = relicDef(id);
      if (r) this.pushFeed(`${t('relics')}: ${tr(r.name)}`, 0xb77cff);
    });
    this.events.on('roomCleared', () => this.banner(t('roomCleared'), COLORS.gold));
    this.events.on('blessing', () => this.pushFeed(t('blessing', { n: BLESSING_HP }), 0xffe6a0));
    this.events.on('tip', (text: string) => toast(this, text, COLORS.gold, Math.round(view.h * 0.32)));
    this.enemyCards = [];
    this.cardShowing = false;
    this.events.on('newEnemy', (def: EnemyDef) => this.queueEnemyCard(def));
    this.events.on('bossPhase', () => this.cameras.main.flash(200, 255, 80, 60));
    const hurt = this.add.image(0, 0, 'fx_edge').setOrigin(0, 0).setDisplaySize(W, H).setTint(0xff2030).setAlpha(0).setDepth(5);
    this.events.on('hurt', () => {
      this.tweens.killTweensOf(hurt);
      hurt.setAlpha(a11y.reduceMotion ? 0.3 : 0.6);
      this.tweens.add({ targets: hurt, alpha: 0, duration: 420, ease: 'Quad.easeOut' });
    });
    if (this.room.save.settings.showFps) this.fpsText = label(this, 4, H - 12, '', FONT.small, COLORS.textDim);
    this.banner(this.floorLabel(), COLORS.text, true);
    this.hints = new TutorialHints(this, this.room, () => this.buttons);
  }

  private floorLabel(): string {
    const run = this.room.run;
    const biome = tr(this.room.biome.name);
    return `${biome} · ${run.floor}-${run.map.rows > 0 ? this.room.run.visited.length - 1 : 0}`;
  }

  // ------------------------------------------------------------------ top bar
  private buildTopBar(W: number): void {
    const pad = 8;
    const bw = Math.min(140, W * 0.4);
    // The HP bar grows with the accessibility text size so its number always fits inside.
    const hpH = Math.max(14, fontSize(FONT.small, view.res) + 2);
    nine(this, pad - 3, pad - 3, 'ui_panel_dark', bw + 42, hpH + 22).setOrigin(0, 0).setAlpha(0.85);
    this.lvlText = label(this, pad + 2, pad + 1, '1', FONT.head, COLORS.gold);
    this.hp = new Bar(this, pad + 26, pad + 1, bw, hpH, COLORS.red);
    this.hpText = label(this, pad + 26 + bw / 2, pad + 1 + hpH / 2, '', FONT.small, COLORS.white, 0.5, 0.5);
    this.xp = new Bar(this, pad + 26, pad + hpH + 4, bw, 5, COLORS.gold);
    this.shieldText = label(this, pad + 26, pad + hpH + 11, '', FONT.small, 0x8ab8ff);
    this.goldText = label(this, W - 40, pad + 2, '0', FONT.head, COLORS.gold, 1, 0);
    this.add.image(W - 40 - 4, pad + 9, 'pk_coin').setOrigin(0, 0.5).setScale(1.3);
    this.floorText = label(this, W - 40, pad + 20, '', FONT.small, COLORS.textDim, 1, 0);
    const pauseBtn = nine(this, W - 30, pad - 2, 'ui_btn', 24, 24).setOrigin(0, 0).setInteractive();
    label(this, W - 18, pad + 9, 'II', FONT.head, COLORS.text, 0.5, 0.5);
    pauseBtn.on('pointerup', () => this.room.openPause());
  }

  // ------------------------------------------------------------------ controls
  private buildJoystick(): void {
    // Drawn at the render scale so the rings stay smooth on high-density screens.
    const k = view.res;
    if (!this.textures.exists('joy_base')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0x0b0914, 0.45).fillCircle(40 * k, 40 * k, 38 * k);
      g.lineStyle(3 * k, 0x07060d, 0.6).strokeCircle(40 * k, 40 * k, 38 * k);
      g.lineStyle(2 * k, 0xd8d0ff, 0.45).strokeCircle(40 * k, 40 * k, 36 * k);
      g.lineStyle(1 * k, 0xd8d0ff, 0.2).strokeCircle(40 * k, 40 * k, 22 * k);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        g.fillStyle(0xd8d0ff, 0.5).fillCircle((40 + Math.cos(a) * 30) * k, (40 + Math.sin(a) * 30) * k, 1.5 * k);
      }
      g.generateTexture('joy_base', 80 * k, 80 * k);
      g.clear();
      g.fillStyle(0x000000, 0.35).fillCircle(18 * k, 20 * k, 15 * k);
      g.fillStyle(0xe8e2ff, 0.85).fillCircle(18 * k, 18 * k, 15 * k);
      g.fillStyle(0xffffff, 0.9).fillCircle(15 * k, 14 * k, 6 * k);
      g.lineStyle(2 * k, 0x5a5078, 0.9).strokeCircle(18 * k, 18 * k, 15 * k);
      g.generateTexture('joy_knob', 36 * k, 36 * k);
      g.destroy();
    }
    const H = view.h;
    this.joyOrigin = { x: 70, y: H - 110 };
    this.joyBase = this.add.image(this.joyOrigin.x, this.joyOrigin.y, 'joy_base').setScale(1 / k).setAlpha(0.55).setDepth(10);
    this.joyKnob = this.add.image(this.joyOrigin.x, this.joyOrigin.y, 'joy_knob').setScale(1 / k).setAlpha(0.75).setDepth(11);
  }

  private buildButtons(W: number, H: number): void {
    const ax = W - 62;
    const ay = H - 100;
    const hero = this.room.player.hero;
    const mk = (key: RoundButton['key'], x: number, y: number, r: number, ring: number) => {
      // Room for the pulse ring, flare glow and dash pips around the disc.
      const size = Math.ceil((r + 12) * 2);
      const k = view.res;
      const bg = this.make.graphics({}, false).setScale(k);
      const tex = this.add.renderTexture(x, y, size * k, size * k).setOrigin(0.5).setScale(1 / k).setDepth(12);
      const iconKey = key === 'skill' ? `ui_icon_skill_${hero.id}` : BUTTON_ICONS[key];
      const img = this.textures.exists(iconKey) ? this.add.image(x, y, iconKey).setDisplaySize(r * 1.3, r * 1.3).setDepth(13) : undefined;
      const icon = label(this, x, y, '', r > 30 ? FONT.head : FONT.body, COLORS.white, 0.5, 0.5).setDepth(14);
      const b: RoundButton = { x, y, r, key, bg, tex, icon, img, ring, pointer: null };
      this.buttons.push(b);
      return b;
    };
    mk('attack', ax, ay, 36, 0xffb05a);
    mk('dash', ax - 70, ay + 26, 24, 0x9fe6ff);
    mk('skill', ax - 50, ay - 58, 25, hero.color);
    mk('flare', ax + 8, ay - 82, 21, 0xffd84a);
    const potion = mk('potion', ax - 104, ay - 34, 18, 0xff7a8a);
    this.potionText = label(this, potion.x + 11, potion.y + 11, '', FONT.small, COLORS.white, 0.5, 0.5).setDepth(15);
    const interact = mk('interact', ax, ay - 150, 26, COLORS.gold);
    interact.tex.setVisible(false);
    interact.img?.setVisible(false);
    interact.icon.setFont(FONT.small, fontSize(FONT.small, view.res)).setY(interact.y + interact.r + 8);
  }

  private setupPointers(W: number, H: number): void {
    const hit = (b: RoundButton, x: number, y: number) => Math.hypot(x - b.x, y - b.y) < b.r + 8;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      for (const b of this.buttons) {
        if (!this.buttonActive(b) || !hit(b, vx(p), vy(p))) continue;
        b.pointer = p.id;
        this.press(b);
        return;
      }
      if (vy(p) < 44) return;
      if (vx(p) < W * 0.6 && vy(p) > H * 0.35 && this.joyPointer === null) {
        this.joyPointer = p.id;
        if (this.room.save.settings.joystick === 'floating') {
          this.joyOrigin = { x: vx(p), y: vy(p) };
          this.joyBase.setPosition(vx(p), vy(p));
        }
        this.joyBase.setAlpha(0.85);
        this.updateJoy(p);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointer) this.updateJoy(p);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointer) {
        this.joyPointer = null;
        controls.moveX = 0;
        controls.moveY = 0;
        this.joyKnob.setPosition(this.joyOrigin.x, this.joyOrigin.y);
        this.joyBase.setAlpha(0.5);
      }
      for (const b of this.buttons) {
        if (b.pointer === p.id) {
          b.pointer = null;
          if (b.key === 'attack') controls.attackHeld = false;
        }
      }
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  private buttonActive(b: RoundButton): boolean {
    if (b.key === 'interact') return !!this.room.nearestInteractable();
    return true;
  }

  private press(b: RoundButton): void {
    services.platform?.haptic('light');
    switch (b.key) {
      case 'attack':
        if (this.room.nearestInteractable() && this.room.enemies.length === 0) controls.interact = true;
        else controls.attackHeld = true;
        break;
      case 'dash': controls.dash = true; break;
      case 'skill': controls.skill = true; break;
      case 'flare': controls.flare = true; break;
      case 'potion': controls.potion = true; break;
      case 'interact': controls.interact = true; break;
    }
    this.tweens.add({ targets: b.icon, scale: 0.85, yoyo: true, duration: 70 });
  }

  private updateJoy(p: Phaser.Input.Pointer): void {
    let dx = vx(p) - this.joyOrigin.x;
    let dy = vy(p) - this.joyOrigin.y;
    let d = Math.hypot(dx, dy);
    const max = 34;
    // Floating stick trails the thumb when it slides past the rim, so reversing direction is instant.
    if (d > max && this.room.save.settings.joystick === 'floating') {
      const pull = (d - max) / d;
      this.joyOrigin = { x: this.joyOrigin.x + dx * pull, y: this.joyOrigin.y + dy * pull };
      this.joyBase.setPosition(this.joyOrigin.x, this.joyOrigin.y);
      dx -= dx * pull;
      dy -= dy * pull;
      d = max;
    }
    const k = d > max ? max / d : 1;
    this.joyKnob.setPosition(this.joyOrigin.x + dx * k, this.joyOrigin.y + dy * k);
    // Small dead zone; full speed well before the rim (a short thumb flick is enough to run).
    const dead = 4;
    const full = 22;
    if (d < dead) {
      controls.moveX = 0;
      controls.moveY = 0;
    } else {
      const mag = Math.min(1, (d - dead) / (full - dead));
      controls.moveX = (dx / d) * mag;
      controls.moveY = (dy / d) * mag;
    }
  }

  // ------------------------------------------------------------------ per frame
  update(_time: number, delta: number): void {
    const room = this.room;
    if (!room.player) return;
    if (!this.scene.isPaused('Room')) this.hints?.update(delta / 1000);
    const p = room.player;
    const run = room.run;
    this.hp.setValue(p.hp / p.maxHp);
    this.hpText.setText(`${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`);
    this.xp.setValue(run.xp / xpForLevel(run.level));
    this.lvlText.setText(`${run.level}`);
    this.shieldText.setText(p.shield > 0 ? `+${Math.round(p.shield)}` : '');
    this.goldText.setText(`${run.gold}`);
    this.floorText.setText(`${run.depth}-${run.floor}`);
    this.potionText.setText(`${p.potions}`);
    this.drawButtons();
    const near = room.nearestInteractable();
    const ib = this.buttons.find((b) => b.key === 'interact')!;
    ib.icon.setVisible(!!near);
    if (near) ib.icon.setText(near.label.toUpperCase());
    if (room.bossBarDirty && this.bossBar) this.updateBossBar();
    if (this.fpsText) this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }

  /**
   * Buttons are vector shapes, which Phaser re-triangulates whenever they are redrawn. Redrawing all of them every
   * frame cost noticeable CPU on phones, so each button keeps a state key and only redraws when its look changes
   * (cooldown advances a step, press, charges, a pulse phase).
   */
  private drawButtons(): void {
    const p = this.room.player;
    const st = this.room.ctx.stats;
    for (const b of this.buttons) {
      const pressed = b.pointer !== null;
      if (b.key === 'interact') {
        const near = this.room.nearestInteractable();
        b.tex.setVisible(!!near);
        b.img?.setVisible(!!near);
        if (!near) continue;
        const pulse = 0.5 + Math.sin(this.time.now / 180) * 0.5;
        const key = `i${pressed ? 1 : 0}${Math.round(pulse * 8)}`;
        if (key === b.state) continue;
        b.state = key;
        const { g, c } = this.beginBake(b);
        this.drawDisc(g, c, 1, pressed);
        g.lineStyle(2, COLORS.gold, 0.3 + pulse * 0.5).strokeCircle(c.x, c.y, b.r + 3 + pulse * 2);
        this.endBake(b);
        continue;
      }
      let ready = 1;
      let text = '';
      if (b.key === 'dash') ready = p.dashCharges > 0 ? 1 : p.dashRechargeRatio;
      if (b.key === 'skill') {
        ready = 1 - p.skillCd / p.skillMax;
        if (p.skillCd > 0) text = `${Math.ceil(p.skillCd)}`;
      }
      if (b.key === 'flare') ready = p.flare / 100;
      if (b.key === 'potion') ready = p.potions > 0 ? 1 : 0;
      b.icon.setText(text);
      if (b.img) {
        b.img.setAlpha(ready >= 1 ? 1 : 0.5);
        const base = (b.r * 1.3) / b.img.width;
        b.img.setScale(pressed ? base * 0.88 : base);
      }
      const glow = b.key === 'flare' && ready >= 1 ? Math.round((0.5 + Math.sin(this.time.now / 120) * 0.4) * 8) : -1;
      const charges = b.key === 'dash' ? `${p.dashCharges}/${st.dashCharges}` : '';
      this.drawCooldown(b, ready);
      const key = `${pressed ? 1 : 0}|${ready >= 1 ? 1 : 0}|${glow}|${charges}`;
      if (key === b.state) continue;
      b.state = key;
      const { g, c } = this.beginBake(b);
      this.drawDisc(g, c, ready, pressed);
      if (glow >= 0) {
        const k = glow / 8;
        g.lineStyle(3, 0xffd84a, k).strokeCircle(c.x, c.y, b.r + 4);
        g.lineStyle(1, 0xfff4c0, k * 0.6).strokeCircle(c.x, c.y, b.r + 7);
      }
      if (b.key === 'dash') {
        for (let i = 0; i < st.dashCharges; i++) {
          const px = c.x - (st.dashCharges - 1) * 4 + i * 8;
          g.fillStyle(0x0b0914, 1).fillCircle(px, c.y + b.r + 3, 3);
          g.fillStyle(i < p.dashCharges ? 0x9fe6ff : 0x3a3450, 1).fillCircle(px, c.y + b.r + 3, 2);
        }
      }
      this.endBake(b);
    }
  }

  /** Cooldown: darken the unfilled part and sweep a coloured arc around the rim (live, only while recharging). */
  private drawCooldown(b: RoundButton, ready: number): void {
    const cd = (b.cd ??= this.add.graphics().setDepth(12.5));
    const step = ready < 1 ? Math.round(ready * 90) : -1;
    if (cd.getData('step') === step) return;
    cd.setData('step', step);
    cd.clear();
    cd.setVisible(step >= 0);
    if (step < 0) return;
    cd.fillStyle(0x000000, 0.5);
    cd.slice(b.x, b.y, b.r - 2, -Math.PI / 2 + ready * Math.PI * 2, Math.PI * 1.5, false).fillPath();
    if (ready > 0) {
      cd.lineStyle(3, b.ring, 0.95).beginPath();
      cd.arc(b.x, b.y, b.r - 0.5, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2, false).strokePath();
    }
  }

  /** Start redrawing a button in its own local space (centre of its texture). */
  private beginBake(b: RoundButton): { g: Phaser.GameObjects.Graphics; c: RoundButton } {
    b.bg.clear();
    const half = b.tex.width / view.res / 2;
    return { g: b.bg, c: { ...b, x: half, y: half } };
  }

  /** Rasterise the scratch drawing into the button's texture (only when its look changed). */
  private endBake(b: RoundButton): void {
    b.tex.clear();
    b.tex.draw(b.bg, 0, 0);
  }

  /** Glassy dark disc with drop shadow, top sheen and a metal rim in the button's colour. */
  private drawDisc(g: Phaser.GameObjects.Graphics, b: RoundButton, ready: number, pressed: boolean): void {
    const on = ready >= 1;
    g.fillStyle(0x000000, 0.3).fillCircle(b.x, b.y + 3, b.r + 1);
    g.fillStyle(pressed ? 0x2a2342 : 0x15112a, pressed ? 0.95 : 0.8).fillCircle(b.x, b.y, b.r);
    g.fillStyle(b.ring, on ? 0.16 : 0.06).fillCircle(b.x, b.y, b.r - 3);
    g.fillStyle(0xffffff, pressed ? 0.03 : 0.07).fillEllipse(b.x, b.y - b.r * 0.38, b.r * 1.3, b.r * 0.7);
    g.lineStyle(3, 0x07060d, 0.9).strokeCircle(b.x, b.y, b.r + 1);
    g.lineStyle(2, on ? b.ring : 0x5a5470, on ? 0.95 : 0.6).strokeCircle(b.x, b.y, b.r - 0.5);
    g.lineStyle(1, 0xffffff, on ? 0.35 : 0.12).beginPath();
    g.arc(b.x, b.y, b.r - 3, Math.PI * 1.1, Math.PI * 1.6, false).strokePath();
  }

  // ------------------------------------------------------------------ boss
  private bossIntro(def: BossDef): void {
    const W = view.w;
    const H = view.h;
    const band = this.add.rectangle(0, H * 0.35, W, 64, 0x000000, 0.75).setOrigin(0, 0.5).setDepth(50);
    const name = label(this, W / 2, H * 0.35 - 8, tr(def.name).toUpperCase(), FONT.title, COLORS.gold, 0.5, 0.5).setDepth(51).setScale(1.6);
    const title = label(this, W / 2, H * 0.35 + 16, tr(def.title), FONT.body, COLORS.textDim, 0.5, 0.5).setDepth(51);
    const quote = this.add.bitmapText(W / 2, H * 0.35 + 48, FONT.body, `"${tr(def.intro)}"`).setOrigin(0.5, 0).setMaxWidth(W - 40).setCenterAlign().setTint(0xffd9a0).setDepth(51);
    for (const o of [band, name, title, quote]) o.setAlpha(0);
    this.tweens.add({ targets: [band, name, title, quote], alpha: 1, duration: 300 });
    name.x -= 30;
    this.tweens.add({ targets: name, x: W / 2, duration: 500, ease: 'Cubic.easeOut' });
    this.time.delayedCall(2600, () => {
      this.tweens.add({ targets: [band, name, title, quote], alpha: 0, duration: 400, onComplete: () => [band, name, title, quote].forEach((o) => o.destroy()) });
    });
    // Boss bar
    const bw = W - 40;
    this.bossName = label(this, W / 2, 50, tr(def.name), FONT.head, COLORS.text, 0.5, 0).setDepth(30);
    this.bossBar = new Bar(this, 20, 66, bw, 8, 0xd03a4a).setDepth(30);
    this.bossGroup = [this.bossName, this.bossBar];
  }

  private updateBossBar(): void {
    const bosses = this.room.bossList;
    if (!this.bossBar) return;
    if (bosses.length === 0 && this.room.cleared) {
      this.bossGroup.forEach((o) => (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(false));
      return;
    }
    const all = [...bosses];
    const hp = all.reduce((a, b) => a + Math.max(0, b.hp), 0);
    const max = all.reduce((a, b) => a + b.maxHp, 0) || 1;
    this.bossBar.setValue(hp / max);
    this.room.bossBarDirty = false;
  }

  // ------------------------------------------------------------------ messages
  private banner(text: string, color: number, small = false): void {
    const W = view.w;
    const y = view.h * 0.26;
    const t1 = label(this, W / 2, y, text, small ? FONT.head : FONT.title, color, 0.5, 0.5).setDepth(40).setAlpha(0);
    if (!small) t1.setScale(1.4);
    if (t1.displayWidth > W - 24) t1.setScale((t1.scaleX * (W - 24)) / t1.displayWidth);
    this.tweens.add({ targets: t1, alpha: 1, y: y - 6, duration: 250 });
    this.tweens.add({ targets: t1, alpha: 0, delay: 1400, duration: 400, onComplete: () => t1.destroy() });
  }

  // ------------------------------------------------------------------ new enemy cards
  private enemyCards: EnemyDef[] = [];
  private cardShowing = false;

  private queueEnemyCard(def: EnemyDef): void {
    this.enemyCards.push(def);
    if (!this.cardShowing) this.showNextEnemyCard();
  }

  /** "NEW ENEMY" card: portrait, name and how it fights, shown once per monster type. */
  private showNextEnemyCard(): void {
    const def = this.enemyCards.shift();
    if (!def) {
      this.cardShowing = false;
      return;
    }
    this.cardShowing = true;
    const w = Math.min(230, view.w - 16);
    const x = 8;
    const y = 58;
    const c = this.add.container(-w - 10, y).setDepth(36);
    // Text first, so the card grows with the accessibility text size.
    const kicker = this.add.bitmapText(44, 5, FONT.small, t('newEnemy')).setTint(COLORS.orange);
    const name = fitBox(this.add.bitmapText(44, 5 + kicker.height, FONT.body, tr(def.name)).setTint(COLORS.text), w - 50);
    const how = this.add.bitmapText(44, name.y + name.displayHeight, FONT.small, t(`ai_${def.ai}`)).setMaxWidth(w - 50).setTint(COLORS.textDim);
    const h = Math.max(44, how.y + how.height + 5);
    const bg = nine(this, 0, 0, 'ui_panel_ornate', w, h).setOrigin(0, 0).setAlpha(0.96);
    const slot = nine(this, 6, (h - 32) / 2, 'ui_slot', 32, 32).setOrigin(0, 0);
    const base = def.sprite.atlas === 'monsters' ? def.sprite.key : def.sprite.key.replace('_walk', '');
    const frame = def.sprite.atlas === 'monsters' ? `${base}/down/1` : `${base}/walk/down/1`;
    const parts: Phaser.GameObjects.GameObject[] = [bg, slot];
    if (this.textures.exists(def.sprite.atlas) && this.textures.get(def.sprite.atlas).has(frame)) {
      const img = this.add.image(22, h / 2, def.sprite.atlas, frame);
      const f = img.frame;
      img.setOrigin((f.x + f.width / 2) / f.realWidth, (f.y + f.height / 2) / f.realHeight);
      img.setScale(Math.min(2, 28 / Math.max(f.width, f.height)));
      if (def.sprite.tint) img.setTint(def.sprite.tint);
      parts.push(img);
    }
    parts.push(kicker, name, how);
    c.add(parts);
    this.tweens.add({ targets: c, x, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: bg, alpha: 0.7, yoyo: true, repeat: 5, duration: 280 });
    this.time.delayedCall(3400, () => {
      this.tweens.add({
        targets: c, x: -w - 10, alpha: 0, duration: 240,
        onComplete: () => {
          c.destroy();
          this.showNextEnemyCard();
        },
      });
    });
  }

  private pushFeed(text: string, color: number): void {
    const W = view.w;
    const c = this.add.container(W - 8, 80).setDepth(35);
    const txt = this.add.bitmapText(0, 0, FONT.small, text).setOrigin(1, 0.5).setTint(color);
    const bg = nine(this, -txt.width - 6, -8, 'ui_panel_dark', txt.width + 12, 16).setOrigin(0, 0).setAlpha(0.85);
    c.add([bg, txt]);
    this.feed.unshift(c);
    this.feed.forEach((f, i) => this.tweens.add({ targets: f, y: 80 + i * 18, duration: 150 }));
    c.x += 60;
    this.tweens.add({ targets: c, x: W - 8, duration: 200, ease: 'Back.easeOut' });
    this.time.delayedCall(3000, () => {
      this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => {
        c.destroy();
        this.feed = this.feed.filter((f) => f !== c);
      } });
    });
  }
}
