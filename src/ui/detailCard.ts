import Phaser from 'phaser';
import { COLORS, FONT } from './theme';
import { Button } from './widgets';
import { nine } from './skin';
import { view } from '@/core/viewport';
import { services } from '@/core/services';
import { t } from '@/core/i18n';
import { ScrollPanel } from './scroll';

export interface DetailArt {
  atlas: string;
  frame?: string;
  /** Looping animation to play instead of a still frame. */
  anim?: string;
  tint?: number;
}

export interface DetailLine {
  text: string;
  color?: number;
}

export interface DetailSpec {
  title: string;
  titleColor: number;
  subtitle?: string;
  art?: DetailArt;
  /** Relative bars, e.g. HP compared with the toughest monster. */
  bars?: { label: string; value: number; max: number; color: number }[];
  sections: { head: string; lines: DetailLine[] }[];
  /** Flavour text shown last, in a softer colour. */
  quote?: string;
}

const ART = 64;

/** Modal card with art, bars and sections, sized to its content. Tap outside, Close or Android back to dismiss. */
export function showDetailCard(scene: Phaser.Scene, spec: DetailSpec, onClose?: () => void): void {
  const W = view.w;
  const H = view.h;
  const layer = scene.add.container(0, 0).setDepth(1000);
  const dim = scene.add.rectangle(0, 0, W, H, COLORS.bg0, 0.82).setOrigin(0).setInteractive();
  layer.add(dim);
  const pw = Math.min(W - 24, 340);
  const px = Math.round((W - pw) / 2);
  const body = scene.add.container(px, 0);
  const tw = pw - 28;
  let y = 14;

  // Header: art slot, name, subtitle.
  body.add(nine(scene, 12, y, 'ui_slot', ART, ART).setOrigin(0, 0));
  if (spec.art && scene.textures.exists(spec.art.atlas)) body.add(artImage(scene, spec.art, 12 + ART / 2, y + ART / 2));
  const hx = 12 + ART + 10;
  const title = scene.add.bitmapText(hx, y + 4, FONT.head, spec.title).setTint(spec.titleColor).setMaxWidth(pw - hx - 12);
  body.add(title);
  let headerBottom = Math.max(y + ART, title.y + title.height);
  if (spec.subtitle) {
    const subtitle = scene.add.bitmapText(hx, title.y + title.height + 4, FONT.small, spec.subtitle).setTint(COLORS.textDim).setMaxWidth(pw - hx - 12);
    body.add(subtitle);
    headerBottom = Math.max(headerBottom, subtitle.y + subtitle.height);
  }
  y = headerBottom + 12;

  for (const b of spec.bars ?? []) {
    const bx = 86;
    const bw = pw - bx - 48;
    body.add(scene.add.bitmapText(14, y, FONT.small, b.label).setTint(COLORS.textDim));
    body.add(scene.add.rectangle(bx, y + 3, bw, 7, 0x0d0b1a).setOrigin(0, 0).setStrokeStyle(1, COLORS.border));
    const fill = scene.add.rectangle(bx + 1, y + 4, Math.max(2, (bw - 2) * Phaser.Math.Clamp(b.value / b.max, 0, 1)), 5, b.color).setOrigin(0, 0);
    body.add(fill);
    body.add(scene.add.bitmapText(pw - 14, y, FONT.small, `${b.value}`).setOrigin(1, 0).setTint(COLORS.text));
    fill.scaleX = 0;
    scene.tweens.add({ targets: fill, scaleX: 1, duration: 380, ease: 'Cubic.easeOut', delay: 80 });
    y += 28;
  }
  if (spec.bars?.length) y += 6;

  for (const sec of spec.sections) {
    if (!sec.lines.length) continue;
    const head = scene.add.bitmapText(14, y, FONT.body, sec.head).setMaxWidth(tw).setTint(COLORS.gold);
    body.add(head);
    y += head.height + 6;
    for (const l of sec.lines) {
      const txt = scene.add.bitmapText(22, y, FONT.small, l.text).setTint(l.color ?? COLORS.text).setMaxWidth(tw - 8);
      body.add(scene.add.image(16, y + 6, 'proj_star').setTint(l.color ?? COLORS.gold).setScale(0.55).setAlpha(0.8));
      body.add(txt);
      y += txt.height + 3;
    }
    y += 6;
  }
  if (spec.quote) {
    const q = scene.add.bitmapText(pw / 2, y, FONT.body, `"${spec.quote}"`).setOrigin(0.5, 0).setCenterAlign().setMaxWidth(tw).setTint(0xc8b0ff);
    body.add(q);
    y += q.height + 10;
  }

  let closed = false;
  let scroll: ScrollPanel | undefined;
  const close = () => {
    if (closed) return;
    closed = true;
    unregister?.();
    services.audio?.sfx('ui_close', { volume: 0.6 });
    scene.tweens.add({ targets: layer, alpha: 0, duration: 110, onComplete: () => {
      scroll?.destroy();
      layer.destroy();
    } });
    onClose?.();
  };
  const ph = Math.min(H - 32, y + 56);
  const top = Math.round((H - ph) / 2);
  body.setPosition(0, 0);
  scroll = new ScrollPanel(scene, px, top + 8, pw, ph - 56);
  scroll.add(body);
  scroll.setContentHeight(y);
  const closeBtn = new Button(scene, W / 2, top + ph - 26, t('cxClose'), close, { w: 140, h: 34 });
  const frame = nine(scene, px, top, 'ui_panel_ornate', pw, ph).setOrigin(0, 0).setInteractive();
  layer.add([frame, ...scroll.displayObjects, closeBtn]);
  dim.on('pointerup', close);
  const unregister = services.platform?.onBack(() => {
    close();
    return true;
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unregister?.());

  services.audio?.sfx('ui_page', { volume: 0.6 });
  layer.setAlpha(0);
  scene.tweens.add({ targets: layer, alpha: 1, duration: 140 });
}

/** Art centred and fitted on its visible (trimmed) pixels; pixel sprites keep whole-number scales. */
function artImage(scene: Phaser.Scene, art: DetailArt, x: number, y: number): Phaser.GameObjects.Sprite {
  const img = scene.add.sprite(x, y, art.atlas, art.frame);
  if (art.anim && scene.anims.exists(art.anim)) img.play(art.anim);
  const f = img.frame;
  img.setOrigin((f.x + f.width / 2) / f.realWidth, (f.y + f.height / 2) / f.realHeight);
  const fit = (ART - 8) / Math.max(f.width, f.height);
  img.setScale(art.frame ? (fit >= 1 ? Math.floor(fit) : fit) : Math.min(1.25, fit));
  if (art.tint !== undefined) img.setTint(art.tint);
  return img;
}
