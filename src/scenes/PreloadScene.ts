import Phaser from 'phaser';
import { COLORS, FONT } from '@/ui/theme';
import { t } from '@/core/i18n';
import { registerAnimations } from '@/gfx/animations';
import { services } from '@/core/services';
import { installProgressTracking } from '@/game/Progress';
import { view } from '@/core/viewport';
import { nine } from '@/ui/skin';
import { TILES_KEY } from '@/data/biomes';

/**
 * Everything is packed for mobile: sprite atlases, one icon atlas, one portrait atlas and a single SFX audio
 * sprite, so the WebView makes a handful of requests instead of hundreds. Music streams on demand and the SFX
 * sprite is decoded in the background by NotifyScene so the loading screen never waits on audio.
 */
const ATLASES = ['heroes', 'actors', 'monsters', 'battlers', 'props'];
const BACKGROUNDS = ['DesertA', 'DesertB', 'DungeonA', 'DungeonB', 'DungeonC', 'DungeonD', 'ForestA', 'ForestB', 'ForestC', 'PlainA', 'PlainB'];
const ART = ['title', 'hub_bg', 'intro_1', 'intro_2', 'intro_3', 'intro_4', 'intro_5', 'intro_6', 'end_1', 'end_2', 'end_3', 'end_4', 'end_5'];
const MUSIC = ['m_title', 'm_intro', 'm_village', 'm_forest', 'm_crypt', 'm_desert', 'm_ice', 'm_throne', 'm_boss', 'm_final', 'm_victory', 'm_defeat', 'm_drowned', 'm_forge', 'm_crystal'];
const GEN_ATLASES = ['icons', 'portraits', 'bosses'];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const { w: W, h: H } = view;
    const barW = Math.min(220, W - 80);
    const y = Math.round(H * 0.62);
    this.add.bitmapText(W / 2, y - 18, FONT.small, t('loading')).setOrigin(0.5).setTint(COLORS.textDim);
    nine(this, W / 2 - barW / 2, y, 'ui_bar_bg', barW, 8).setOrigin(0, 0);
    const fill = this.add.image(W / 2 - barW / 2 + 1, y + 1, 'ui_white').setOrigin(0, 0).setTint(COLORS.ember);
    fill.setDisplaySize(1, 6);
    const flame = this.add.image(W / 2, y - 60, 'fx_light').setTint(COLORS.ember).setScale(0.5).setBlendMode('ADD');
    this.tweens.add({ targets: flame, scale: 0.6, alpha: 0.7, yoyo: true, repeat: -1, duration: 500 });
    this.load.on('progress', (p: number) => fill.setDisplaySize(Math.max(1, Math.round((barW - 2) * p)), 6));
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('[preload] failed', f.key));

    for (const a of ATLASES) this.load.atlas(a, `assets/pack/${a}.png`, `assets/pack/${a}.json`);
    for (const bg of BACKGROUNDS) this.load.image(`bg_${bg}`, `assets/pack/bg/${bg}.png`);
    // Only the tiles the game uses (tools/pack_tiles.py), instead of two ~10 MB tilesets.
    this.load.spritesheet(TILES_KEY, 'assets/pack/tiles.png', { frameWidth: 16, frameHeight: 16 });
    for (const a of GEN_ATLASES) this.load.atlas(`gen_${a}`, `assets/gen/${a}.png`, `assets/gen/${a}.json`);
    for (const a of ART) this.load.image(`art_${a}`, `assets/gen/art/${a}.png`);
    const music: Record<string, string> = {};
    for (const m of MUSIC) music[m] = `assets/audio/music/${m}.mp3`;
    services.audio?.setMusicUrls(music);
  }

  create(): void {
    // Expose every packed icon/portrait as its own texture key (shares the atlas image, no copy).
    for (const a of GEN_ATLASES) {
      const tex = this.textures.get(`gen_${a}`);
      for (const name of tex.getFrameNames()) {
        const f = tex.get(name);
        this.textures.addSpriteSheetFromAtlas(name, { atlas: `gen_${a}`, frame: name, frameWidth: f.width, frameHeight: f.height });
      }
    }
    registerAnimations(this);
    installProgressTracking();
    this.scene.launch('Notify');
    services.platform?.hideSplash();
    this.scene.start('Splash');
  }
}
