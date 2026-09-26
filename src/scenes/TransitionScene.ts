import { BaseScene } from './BaseScene';
import { COLORS, FONT } from '@/ui/theme';
import { label } from '@/ui/widgets';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { RunManager } from '@/game/RunManager';
import { biomeForDepth, BIOMES } from '@/data/biomes';
import { DEPTH_ARRIVAL } from '@/data/story';

/** Between floors / depths: a short cinematic card with the biome name and a line of story. */
export class TransitionScene extends BaseScene {
  private result: 'floor' | 'depth' = 'floor';
  private fromBoss = false;

  constructor() {
    super('Transition');
  }

  init(data: { result: 'floor' | 'depth'; fromBoss: boolean }): void {
    this.result = data.result;
    this.fromBoss = data.fromBoss;
    this.transitioning = false;
  }

  create(): void {
    const run = RunManager.run;
    if (!run) {
      this.scene.start('Hub');
      return;
    }
    const { W, H } = this;
    const biome = biomeForDepth(run.depth, run.regions);
    this.fadeIn(700);
    services.audio?.sfx('descend', { volume: 0.8 });
    const bg = this.add.image(W / 2, H / 2, biome.theme.bg);
    bg.setScale(Math.max(W / bg.width, H / bg.height) * 1.1).setTint(0x7a70a0).setAlpha(0.8);
    this.tweens.add({ targets: bg, scale: bg.scale * 1.08, y: H / 2 - 20, duration: 4000 });
    const shade = this.add.graphics();
    shade.fillStyle(0x000000, 0.55).fillRect(0, 0, W, H);
    let y = H * 0.36;
    if (this.fromBoss) {
      const prev = BIOMES[run.depth - 2];
      if (prev) {
        const ember = label(this, W / 2, H * 0.2, `${tr(prev.ember)}`, FONT.head, COLORS.ember, 0.5, 0.5).setAlpha(0);
        const got = label(this, W / 2, H * 0.2 + 18, t('emberRecovered'), FONT.small, COLORS.textDim, 0.5, 0.5).setAlpha(0);
        const glow = this.add.image(W / 2, H * 0.2 - 30, 'fx_light').setTint(COLORS.ember).setBlendMode('ADD').setScale(0.6).setAlpha(0);
        this.tweens.add({ targets: [ember, got, glow], alpha: 1, duration: 600 });
      }
    }
    const kicker = this.result === 'depth' ? t('depthN', { n: run.depth }) : t('floorN', { n: run.floor });
    const k = label(this, W / 2, y, kicker.toUpperCase(), FONT.head, COLORS.textDim, 0.5, 0.5).setAlpha(0);
    y += 26;
    const name = label(this, W / 2, y, tr(biome.name).toUpperCase(), FONT.title, COLORS.gold, 0.5, 0.5).setScale(1.8).setAlpha(0);
    y += 34;
    const sub = label(this, W / 2, y, tr(biome.subtitle), FONT.body, 0xd8c8f0, 0.5, 0.5).setAlpha(0);
    this.tweens.add({ targets: k, alpha: 1, duration: 500, delay: 300 });
    this.tweens.add({ targets: name, alpha: 1, duration: 700, delay: 600 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 700, delay: 1000 });
    const flagKey = `arrived_${run.depth}`;
    if (this.result === 'depth' && !this.save.flags[flagKey]) {
      this.save.flags[flagKey] = 1;
      const line = DEPTH_ARRIVAL[run.depth];
      if (line) {
        const txt = this.add.bitmapText(W / 2, H * 0.62, FONT.body, `"${tr(line)}"`).setOrigin(0.5, 0).setMaxWidth(W - 50).setCenterAlign().setTint(0xffd9a0).setAlpha(0);
        label(this, W / 2, H * 0.62 - 16, 'Maren', FONT.small, COLORS.gold, 0.5, 0.5);
        this.tweens.add({ targets: txt, alpha: 1, duration: 800, delay: 1400 });
      }
    }
    let moving = false;
    const next = () => {
      if (moving) return;
      moving = true;
      const go = () => this.goTo('RunMap', {}, 500);
      // Entering a new Depth is a natural break (the paced interstitial slot); floor changes are not.
      if (this.result === 'depth') void (services.ads?.naturalBreak() ?? Promise.resolve()).then(go, go);
      else go();
    };
    this.time.delayedCall(this.result === 'depth' ? 5200 : 2600, next);
    this.input.once('pointerup', () => this.time.delayedCall(200, next));
    this.handleBack(() => true);
  }
}
