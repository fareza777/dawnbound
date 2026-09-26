import Phaser from 'phaser';
import { COLORS, FONT, fontSize } from '@/ui/theme';
import { Button, label, panel, setTextFit, toast } from '@/ui/widgets';
import { showModal } from '@/ui/modal';
import { today } from '@/systems/bounties';
import { MATERIALS } from '@/data/materials';
import { t, tr } from '@/core/i18n';
import { controls } from '@/game/input';
import { services } from '@/core/services';
import { questById } from '@/data/quests';
import { npcById } from '@/data/npcs';
import { objectiveProgress } from '@/systems/quests';
import type { HubScene } from './HubScene';
import { view, vx, vy } from '@/core/viewport';
import { nine } from '@/ui/skin';

/** Village overlay: currencies, tracked quest, menu shortcuts, joystick and context button. */
export class HubHud extends Phaser.Scene {
  private hub!: HubScene;
  private embersText!: Phaser.GameObjects.BitmapText;
  private goldText!: Phaser.GameObjects.BitmapText;
  private shardText!: Phaser.GameObjects.BitmapText;
  private questTitle!: Phaser.GameObjects.BitmapText;
  private questW = 250;
  private questObj!: Phaser.GameObjects.BitmapText;
  private actBtn!: Phaser.GameObjects.Container;
  private actText!: Phaser.GameObjects.BitmapText;
  private actDisc!: Phaser.GameObjects.Graphics;
  private actIcon!: Phaser.GameObjects.Image;
  private actNear: boolean | null = null;
  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;
  private joyId: number | null = null;
  private origin = { x: 0, y: 0 };

  constructor() {
    super('HubHud');
  }

  init(d: { hub: HubScene }): void {
    this.hub = d.hub;
    this.joyId = null;
  }

  create(): void {
    const W = view.w;
    const H = view.h;
    // Currency bar
    panel(this, 4, 4, W - 8, 30, 'ui_panel_dark').setAlpha(0.9);
    const icon = (key: string, fb: string, x: number) =>
      (this.textures.exists(key) ? this.add.image(x, 19, key).setDisplaySize(14, 14) : this.add.image(x, 19, fb).setScale(1.5));
    icon('ui_icon_embers', 'pk_ember', 18);
    this.embersText = label(this, 28, 12, '', FONT.head, COLORS.ember);
    icon('ui_icon_gold', 'pk_coin', 98);
    this.goldText = label(this, 108, 12, '', FONT.head, COLORS.gold);
    icon('ui_icon_shard', 'pk_gem', 178);
    this.shardText = label(this, 188, 12, '', FONT.head, 0xff9ad0);
    new Button(this, W - 22, 19, '=', () => this.hub.openMenu('HubMenu'), { w: 28, h: 24, font: FONT.head });
    // Quest tracker
    this.questW = Math.min(250, W - 70);
    const bodyH = fontSize(FONT.body, view.res);
    const qp = panel(this, 4, 38, this.questW, 8 + bodyH + fontSize(FONT.small, view.res), 'ui_panel_dark').setAlpha(0.85).setInteractive();
    qp.on('pointerup', () => this.hub.openMenu('QuestLog'));
    this.questTitle = label(this, 12, 42, '', FONT.body, COLORS.gold);
    this.questObj = label(this, 12, 42 + bodyH, '', FONT.small, COLORS.text);
    // Shortcut column
    const shortcuts: [string, string, string][] = [['Inventory', 'ui_icon_inventory', t('inventory')], ['Hero', 'ui_icon_hero', t('character')], ['QuestLog', 'ui_icon_quests', t('quests')], ['Codex', 'ui_icon_codex', t('menuCodex')]];
    shortcuts.forEach(([scene, iconKey, name], i) => {
      const y = 52 + i * 42;
      const b = this.add.container(W - 26, y);
      const bg = nine(this, 0, 0, 'ui_btn', 36, 36);
      const ic = this.textures.exists(iconKey)
        ? this.add.image(0, 0, iconKey).setDisplaySize(26, 26)
        : this.add.bitmapText(0, 0, FONT.small, name.slice(0, 4)).setOrigin(0.5);
      b.add([bg, ic]);
      b.setSize(36, 36).setInteractive({ useHandCursor: true });
      b.on('pointerup', () => {
        services.audio?.sfx('ui_click');
        this.hub.openMenu(scene);
      });
    });
    // Context action button
    this.buildGift(W, 52 + shortcuts.length * 42);
    // Context action: attack the training dummy, or talk/use when something is in reach (same style as combat).
    this.actBtn = this.add.container(W - 70, H - 96);
    this.actDisc = this.add.graphics();
    this.actIcon = this.add.image(0, -3, 'ui_icon_attack').setDisplaySize(40, 40);
    this.actText = this.add.bitmapText(0, 44, FONT.small, '').setOrigin(0.5).setMaxWidth(90).setCenterAlign();
    this.actBtn.add([this.actDisc, this.actIcon, this.actText]);
    this.actBtn.setSize(68, 68).setInteractive();
    this.actBtn.on('pointerdown', () => {
      services.platform?.haptic('light');
      if (this.hub.nearestSpot()) controls.interact = true;
      else controls.attackHeld = true;
      this.tweens.add({ targets: this.actBtn, scale: 0.9, yoyo: true, duration: 70 });
    });
    // Joystick
    this.origin = { x: 76, y: H - 100 };
    this.joyBase = this.add.circle(this.origin.x, this.origin.y, 37, 0x0b0914, 0.45).setStrokeStyle(2, 0xd8d0ff, 0.45);
    this.joyKnob = this.add.circle(this.origin.x, this.origin.y, 15, 0xe8e2ff, 0.8).setStrokeStyle(2, 0x5a5078, 0.9);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.joyId !== null || vy(p) < H * 0.3 || vx(p) > W * 0.62) return;
      this.joyId = p.id;
      this.origin = { x: vx(p), y: vy(p) };
      this.joyBase.setPosition(vx(p), vy(p));
      this.moveJoy(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyId) this.moveJoy(p);
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyId) return;
      this.joyId = null;
      controls.moveX = 0;
      controls.moveY = 0;
      this.joyKnob.setPosition(this.origin.x, this.origin.y);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off('refresh'));
    this.events.on('refresh', () => this.refresh());
    // Remove on shutdown: the Hub outlives this Hud, and a stale handler would touch destroyed texts.
    const onHubResume = () => this.refresh();
    this.hub.events.on(Phaser.Scenes.Events.RESUME, onHubResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hub.events.off(Phaser.Scenes.Events.RESUME, onHubResume));
    this.refresh();
  }

  /** Daily gift from Pip, opened with an optional rewarded video. Shown only while available. */
  private buildGift(W: number, y: number): void {
    const s = services.save!.data;
    const available = () => s.shop.giftDay !== today() && !!services.ads?.canReward();
    const b = this.add.container(W - 26, y);
    const glow = this.add.image(0, 0, 'fx_light').setTint(COLORS.gold).setBlendMode('ADD').setScale(0.42).setAlpha(0.6);
    const bg = nine(this, 0, 0, 'ui_btn_primary', 36, 36);
    const ic = this.add.image(0, -1, this.textures.exists('ui_icon_gift') ? 'ui_icon_gift' : 'pk_coin').setDisplaySize(26, 26);
    b.add([glow, bg, ic]);
    b.setSize(36, 36).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: glow, alpha: 0.2, scale: 0.5, yoyo: true, repeat: -1, duration: 700 });
    this.tweens.add({ targets: ic, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 350, repeatDelay: 1400 });
    b.setVisible(available());
    b.on('pointerup', () => {
      if (!available()) return;
      services.audio?.sfx('ui_click');
      showModal(this, t('adGift'), t('adGiftBody'), [{ label: t('cancel') }, { label: t('adVideo'), style: 'primary', onClick: async () => {
        const ok = await services.ads!.showRewarded('daily_gift');
        if (!ok) return toast(this, t('adNotReady'), COLORS.textDim);
        // Scales with progress so it stays worth opening all game long.
        const depth = Math.max(1, s.unlocks.maxDepthReached);
        const gold = 60 + depth * 40;
        const embers = 15 + depth * 10;
        s.currency.gold += gold;
        s.currency.embers += embers;
        const pool = MATERIALS.filter((m) => (m.kind === 'monster' || m.kind === 'herb' || m.kind === 'ore') && m.tier <= Math.min(3, depth));
        const mat = pool[today() % Math.max(1, pool.length)];
        if (mat) s.materials[mat.id] = (s.materials[mat.id] ?? 0) + 2;
        s.shop.giftDay = today();
        services.save!.flush();
        services.audio?.sfx('coin');
        services.notify?.(t('adGiftGot', { g: gold, e: embers }), COLORS.gold, 'achievement');
        b.setVisible(false);
        this.refresh();
      } }]);
    });
    // Rewarded ads may finish loading after the village opens.
    this.time.addEvent({ delay: 2000, loop: true, callback: () => b.setVisible(available()) });
  }

  private moveJoy(p: Phaser.Input.Pointer): void {
    const dx = vx(p) - this.origin.x;
    const dy = vy(p) - this.origin.y;
    const d = Math.hypot(dx, dy);
    const k = d > 32 ? 32 / d : 1;
    this.joyKnob.setPosition(this.origin.x + dx * k, this.origin.y + dy * k);
    if (d < 6) {
      controls.moveX = 0;
      controls.moveY = 0;
    } else {
      controls.moveX = dx / d;
      controls.moveY = dy / d;
    }
  }

  refresh(): void {
    const s = services.save!.data;
    this.embersText.setText(`${s.currency.embers}`);
    this.goldText.setText(`${s.currency.gold}`);
    this.shardText.setText(`${s.currency.shards}`);
    const q = s.trackedQuest ? questById(s.trackedQuest) : undefined;
    if (q) {
      const st = s.quests[q.id]?.status;
      const maxW = this.questW - 16;
      setTextFit(this.questTitle, tr(q.title), maxW).setTint(q.type === 'main' ? COLORS.gold : COLORS.cyan);
      if (st === 'complete') setTextFit(this.questObj, t('returnTo', { n: tr(npcById(q.giver)?.name ?? { en: q.giver, id: q.giver }) }), maxW).setTint(COLORS.green);
      else {
        const o = q.objectives[0];
        const p = objectiveProgress(s, q, o, 0);
        setTextFit(this.questObj, tr(q.desc), maxW, p.need > 1 ? `${p.have}/${p.need}` : '').setTint(COLORS.text);
      }
    } else {
      this.questTitle.setText('');
      this.questObj.setText('');
    }
  }

  update(): void {
    const sp = this.hub.nearestSpot();
    this.actText.setText(sp ? sp.label : '');
    const near = !!sp;
    if (near !== this.actNear) {
      this.actNear = near;
      const ring = near ? COLORS.gold : 0xffb05a;
      const g = this.actDisc.clear();
      g.fillStyle(0x000000, 0.3).fillCircle(0, 3, 35);
      g.fillStyle(0x15112a, 0.82).fillCircle(0, 0, 34);
      g.fillStyle(ring, 0.16).fillCircle(0, 0, 31);
      g.fillStyle(0xffffff, 0.07).fillEllipse(0, -13, 44, 24);
      g.lineStyle(3, 0x07060d, 0.9).strokeCircle(0, 0, 35);
      g.lineStyle(2, ring, 0.95).strokeCircle(0, 0, 33.5);
      const key = near && this.textures.exists('ui_icon_interact') ? 'ui_icon_interact' : 'ui_icon_attack';
      this.actIcon.setTexture(key).setDisplaySize(40, 40);
    }
  }
}
