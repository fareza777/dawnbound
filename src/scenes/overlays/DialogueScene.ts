import Phaser from 'phaser';
import { COLORS, FONT } from '@/ui/theme';
import { Button, panel } from '@/ui/widgets';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import type { Line } from '@/data/dialogues';
import { SPEAKER_NAMES } from '@/data/dialogues';
import { npcById } from '@/data/npcs';
import { view } from '@/core/viewport';
import { nine } from '@/ui/skin';

export interface DialogueChoice {
  label: string;
  action: () => void;
  style?: 'normal' | 'primary';
}

export interface DialogueData {
  lines: Line[];
  choices?: DialogueChoice[];
  onDone?: () => void;
  from: string;
}

/** Visual-novel style dialogue box: portrait, name plate, typewriter text, tap to advance, optional choices. */
export class DialogueScene extends Phaser.Scene {
  private d!: DialogueData;
  private i = 0;
  private body!: Phaser.GameObjects.BitmapText;
  private nameText!: Phaser.GameObjects.BitmapText;
  private portrait?: Phaser.GameObjects.Image;
  private portraitFrame!: Phaser.GameObjects.NineSlice;
  private full = '';
  private shown = 0;
  private typing?: Phaser.Time.TimerEvent;
  private arrow!: Phaser.GameObjects.BitmapText;
  private choiceObjs: Phaser.GameObjects.GameObject[] = [];
  private unregisterBack?: () => void;
  private finished = false;

  constructor() {
    super('Dialogue');
  }

  init(d: DialogueData): void {
    this.d = d;
    this.i = 0;
    this.choiceObjs = [];
    this.finished = false;
    this.scene.bringToTop();
  }

  create(): void {
    const W = view.w;
    const H = view.h;
    services.audio?.setDuck(0.55);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0, 0).setInteractive();
    shade.on('pointerup', () => this.advance());
    const boxH = 128;
    const boxY = H - boxH - 14;
    panel(this, 8, boxY, W - 16, boxH, 'ui_panel_ornate').setInteractive().on('pointerup', () => this.advance());
    this.portraitFrame = nine(this, 14, boxY - 92, 'ui_panel_ornate', 100, 100).setOrigin(0, 0);
    this.nameText = this.add.bitmapText(122, boxY - 18, FONT.head, '').setTint(COLORS.gold);
    this.body = this.add.bitmapText(20, boxY + 14, FONT.body, '').setMaxWidth(W - 44).setTint(COLORS.text);
    this.arrow = this.add.bitmapText(W - 26, boxY + boxH - 20, FONT.head, 'v').setTint(COLORS.gold);
    this.tweens.add({ targets: this.arrow, y: this.arrow.y + 3, yoyo: true, repeat: -1, duration: 400 });
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 150 });
    this.unregisterBack = services.platform?.onBack(() => {
      if (!this.scene.isActive()) return false;
      this.finish();
      return true;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unregisterBack?.();
      services.audio?.setDuck(1);
    });
    if (this.d.lines.length === 0) this.showChoices();
    else this.showLine();
  }

  private speakerName(who: string): string {
    const n = npcById(who);
    if (n) return tr(n.name);
    const s = SPEAKER_NAMES[who];
    return s ? tr(s) : who;
  }

  private portraitKey(who: string): string | null {
    const key = `portraits_${who}`;
    if (this.textures.exists(key)) return key;
    return null;
  }

  private showLine(): void {
    const line = this.d.lines[this.i];
    const W = view.w;
    this.nameText.setText(this.speakerName(line.who));
    this.portrait?.destroy();
    const key = this.portraitKey(line.who);
    const boxY = view.h - 128 - 14;
    const right = line.who === 'rowan' || line.who === 'sera' || line.who === 'elio' || line.who === 'kaito';
    const px = right ? W - 114 : 14;
    this.portraitFrame.setX(px);
    this.nameText.setX(right ? W - 122 - this.nameText.width : 122);
    if (key) {
      this.portrait = this.add.image(px + 50, boxY - 42, key).setDisplaySize(92, 92);
      if (right) this.portrait.setFlipX(true);
    } else {
      const npc = npcById(line.who);
      const frame = npc ? `${npc.sprite}/walk/down/1` : line.who === 'rowan' ? 'hero1/idle/down/0' : 'hero1/idle/down/0';
      const atlas = npc ? 'actors' : 'heroes';
      this.portrait = this.add.image(px + 50, boxY - 42, atlas, frame).setScale(4);
      if (npc?.tint) this.portrait.setTint(npc.tint);
    }
    this.portrait.setAlpha(0);
    this.tweens.add({ targets: this.portrait, alpha: 1, duration: 150 });
    this.full = tr(line.text);
    this.shown = 0;
    this.body.setText('');
    this.arrow.setVisible(false);
    this.typing?.remove();
    this.typing = this.time.addEvent({
      delay: 22, repeat: this.full.length - 1,
      callback: () => {
        this.shown++;
        this.body.setText(this.full.slice(0, this.shown));
        if (this.shown % 3 === 0) services.audio?.sfx('type', { volume: 0.2, minGapMs: 25, detune: line.who === 'rowan' ? 200 : -100 });
        if (this.shown >= this.full.length) this.arrow.setVisible(true);
      },
    });
  }

  private advance(): void {
    if (this.finished || this.choiceObjs.length) return;
    if (this.shown < this.full.length) {
      this.typing?.remove();
      this.shown = this.full.length;
      this.body.setText(this.full);
      this.arrow.setVisible(true);
      return;
    }
    this.i++;
    if (this.i < this.d.lines.length) this.showLine();
    else this.showChoices();
  }

  private showChoices(): void {
    const choices = this.d.choices ?? [];
    if (choices.length === 0) {
      this.finish();
      return;
    }
    this.arrow.setVisible(false);
    const W = view.w;
    const bw = Math.min(260, W - 60);
    const boxY = view.h - 128 - 14;
    const all = [...choices, { label: t('goodbye'), action: () => undefined }];
    all.forEach((c, k) => {
      const y = boxY - 118 - (all.length - 1 - k) * 34;
      const b = new Button(this, W / 2, y, c.label, () => {
        this.finish(c.action);
      }, { w: bw, h: 28, style: (c as DialogueChoice).style ?? 'normal' });
      this.choiceObjs.push(b);
    });
    if (this.d.lines.length === 0) {
      this.portraitFrame.setVisible(false);
      this.body.setText('');
    }
  }

  private finish(after?: () => void): void {
    if (this.finished) return;
    this.finished = true;
    this.tweens.add({
      targets: this.cameras.main, alpha: 0, duration: 120,
      onComplete: () => {
        const from = this.d.from;
        this.scene.stop();
        if (this.scene.isPaused(from)) this.scene.resume(from);
        this.d.onDone?.();
        after?.();
      },
    });
  }
}

export function openDialogue(scene: Phaser.Scene, data: Omit<DialogueData, 'from'>): void {
  scene.scene.pause();
  scene.scene.launch('Dialogue', { ...data, from: scene.scene.key });
}
