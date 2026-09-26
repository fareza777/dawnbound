import { OverlayScene } from '../overlays/OverlayScene';
import { COLORS, FONT } from '@/ui/theme';
import { Button, fitBox, label, panel, para, toast } from '@/ui/widgets';
import { nine } from '@/ui/skin';
import { ALT_BIOMES, BIOMES } from '@/data/biomes';
import { MUTATOR_EMBER_BONUS, weeklyMutator } from '@/data/mutators';
import { ENDLESS_GOAL } from '@/game/endless';
import { BIOME_BOSS, BOSSES } from '@/data/bosses';
import { confirm } from '@/ui/modal';
import { t, tr } from '@/core/i18n';
import { services } from '@/core/services';
import { ScrollPanel } from '@/ui/scroll';
import { claimBounty, ensureBounties, today } from '@/systems/bounties';
import { ENEMIES } from '@/data/enemies';
import { VOWS, vowEmberMult, vowHeat } from '@/data/vows';
import { HEROES, heroDef } from '@/data/heroes';
import { TALENTS, type TalentDef } from '@/data/talents';
import { ELIXIRS } from '@/data/materials';
import { RunManager } from '@/game/RunManager';
import { checkProgress } from '@/game/Progress';
import { hashString } from '@/core/rng';

// ============================================================================ Hub pause menu
export class HubMenuScene extends OverlayScene {
  constructor() {
    super('HubMenu');
  }

  create(): void {
    const inner = this.frame(t('village'), 0.6);
    const cx = this.W / 2;
    const bw = Math.min(220, inner.w - 20);
    const items: [string, () => void][] = [
      [t('resume'), () => this.close()],
      [t('inventory'), () => this.swap('Inventory')],
      [t('character'), () => this.swap('Hero')],
      [t('quests'), () => this.swap('QuestLog')],
      [t('menuCodex'), () => this.swap('Codex')],
      [t('menuSettings'), () => this.swap('Settings')],
      [t('mainMenu'), () => {
        services.save!.flush();
        this.scene.stop();
        this.scene.stop('Hub');
        this.scene.start('Menu');
      }],
    ];
    items.forEach(([name, fn], i) => new Button(this, cx, inner.y + 14 + i * 36, name, fn, { w: bw, h: 30, style: i === 0 ? 'primary' : 'normal' }));
  }

  private swap(key: string): void {
    const from = this.from;
    this.scene.stop();
    this.scene.launch(key, { from });
  }
}

// ============================================================================ Bounties
export class BountiesScene extends OverlayScene {
  constructor() {
    super('Bounties');
  }

  create(): void {
    const inner = this.frame(t('bounties'), 0.72);
    const s = this.save;
    ensureBounties(s);
    const msLeft = (today() + 1) * 86400000 - Date.now();
    label(this, inner.x, inner.y, t('bountyReset', { h: Math.floor(msLeft / 3600000), m: Math.floor((msLeft % 3600000) / 60000) }), FONT.small, COLORS.textDim);
    let y = inner.y + 18;
    for (const b of s.bounties.list) {
      panel(this, inner.x, y, inner.w, 70, b.done && !b.claimed ? 'ui_panel_ornate' : 'ui_panel_dark');
      const target = b.target ? tr(ENEMIES[b.target]?.name ?? { en: b.target, id: b.target }) : '';
      label(this, inner.x + 10, y + 6, t(`bounty_${b.kind}`, { n: b.need, t: target }), FONT.body, b.claimed ? COLORS.textDim : COLORS.text);
      const ratio = Math.min(1, b.have / b.need);
      this.add.rectangle(inner.x + 10, y + 30, inner.w - 120, 6, COLORS.bg0).setOrigin(0, 0.5);
      this.add.rectangle(inner.x + 10, y + 30, (inner.w - 120) * ratio, 6, b.done ? COLORS.green : COLORS.gold).setOrigin(0, 0.5);
      label(this, inner.x + 10, y + 38, `${b.have}/${b.need}`, FONT.small, COLORS.textDim);
      label(this, inner.x + 10, y + 52, `${t('reward')}: ${b.reward.embers} ${t('embers')}, ${b.reward.gold} ${t('gold')}`, FONT.small, COLORS.orange);
      new Button(this, inner.x + inner.w - 50, y + 35, b.claimed ? t('complete') : t('claim'), () => {
        if (claimBounty(s, b.id)) {
          services.audio?.sfx('quest_complete');
          services.save!.markDirty();
          checkProgress();
          this.scene.restart({ from: this.from });
        }
      }, { w: 84, h: 26, style: 'primary', disabled: !b.done || b.claimed });
      y += 76;
    }
  }
}

// ============================================================================ Vows (heat)
export class VowsScene extends OverlayScene {
  constructor() {
    super('Vows');
  }

  create(): void {
    const inner = this.frame(t('vows'), 0.92);
    const s = this.save;
    if (!s.unlocks.bossesDefeated.includes('gorehorn')) {
      para(this, inner.x, inner.y, t('vowsLocked'), inner.w, FONT.body, COLORS.textDim);
      return;
    }
    const heat = vowHeat(s.vows);
    label(this, inner.x, inner.y, `${t('heat')}: ${heat}   ·   ${t('embers')} x${vowEmberMult(s.vows).toFixed(1)}`, FONT.head, COLORS.ember);
    const scroll = new ScrollPanel(this, inner.x, inner.y + 24, inner.w, inner.h - 24);
    let y = 0;
    for (const v of VOWS) {
      const r = s.vows[v.id] ?? 0;
      scroll.add(panel(this, 0, y, inner.w, 50, r > 0 ? 'ui_panel_ornate' : 'ui_panel_dark'));
      scroll.add(this.add.bitmapText(10, y + 6, FONT.body, `${tr(v.name)}  ${r}/${v.maxRank}`).setTint(r > 0 ? COLORS.ember : COLORS.text));
      scroll.add(this.add.bitmapText(10, y + 24, FONT.small, tr(v.desc)).setMaxWidth(inner.w - 100).setTint(COLORS.textDim));
      scroll.add(new Button(this, inner.w - 66, y + 25, '-', () => {
        s.vows[v.id] = Math.max(0, r - 1);
        services.save!.markDirty();
        this.scene.restart({ from: this.from });
      }, { w: 28, h: 24, disabled: r <= 0 }));
      scroll.add(new Button(this, inner.w - 30, y + 25, '+', () => {
        s.vows[v.id] = Math.min(v.maxRank, r + 1);
        services.audio?.sfx('ui_confirm');
        services.save!.markDirty();
        this.scene.restart({ from: this.from });
      }, { w: 28, h: 24, style: 'primary', disabled: r >= v.maxRank }));
      y += 56;
    }
    scroll.setContentHeight(y);
  }
}

// ============================================================================ Jukebox
export class JukeboxScene extends OverlayScene {
  constructor() {
    super('Jukebox');
  }

  create(): void {
    const inner = this.frame(t('jukebox'), 0.8);
    const tracks: [string, string][] = [
      ['m_title', 'Dawnbound'], ['m_village', 'Emberhollow'], ['m_forest', 'Whisperwood'], ['m_crypt', 'Sunken Crypt'],
      ['m_desert', 'Scorchsand'], ['m_ice', 'Frostveil'], ['m_throne', 'Hollow Throne'], ['m_boss', 'Guardian'], ['m_final', 'The Hollow King'],
      ['m_intro', 'Prologue'], ['m_victory', 'Dawn Returns'], ['m_defeat', 'Wake at Dawn'],
      ['m_drowned', 'Drowned Catacombs'], ['m_forge', 'Emberforge'], ['m_crystal', 'Crystal Hollows'],
    ];
    const bw = (inner.w - 8) / 2;
    tracks.forEach(([key, name], i) => {
      new Button(this, inner.x + (i % 2) * (bw + 8) + bw / 2, inner.y + 16 + Math.floor(i / 2) * 34, name, () => services.audio?.playMusic(key, 400), { w: bw, h: 28, font: FONT.body });
    });
    new Button(this, this.W / 2, this.panelY + this.panelH - 26, t('villageMusic'), () => services.audio?.playMusic('m_village', 400), { w: 180, h: 26 });
  }
}

// ============================================================================ Hero select & wardrobe
export class HeroScene extends OverlayScene {
  /** Hero being inspected (may differ from the active hero, and may be locked). */
  private viewId = '';

  constructor() {
    super('Hero');
  }

  init(d: { from?: string; view?: string }): void {
    super.init(d);
    this.viewId = d.view ?? '';
  }

  create(): void {
    const inner = this.frame(t('character'), 0.94);
    const s = this.save;
    const hero = heroDef(this.viewId || s.profile.heroId);
    const unlocked = s.unlocks.heroes.includes(hero.id);
    const active = s.profile.heroId === hero.id;
    this.drawCards(inner, hero.id);

    // Header: framed portrait in the hero's colour, name, title and weapon.
    let y = inner.y + 76;
    const px = inner.x + 44;
    const frame = this.add.graphics();
    frame.fillStyle(0x07060d, 1).fillRoundedRect(px - 44, y - 2, 88, 88, 6);
    frame.lineStyle(2, hero.color, 1).strokeRoundedRect(px - 43, y - 1, 86, 86, 6);
    this.add.image(px, y + 42, 'fx_light').setTint(hero.color).setBlendMode('ADD').setScale(0.7).setAlpha(0.35);
    if (this.textures.exists(hero.portrait)) {
      const img = this.add.image(px, y + 42, hero.portrait).setDisplaySize(80, 80);
      if (!unlocked) img.setTint(0x3a3550);
    }
    const tx = inner.x + 98;
    label(this, tx, y, tr(hero.name), FONT.title, unlocked ? COLORS.gold : COLORS.textDim);
    fitBox(label(this, tx, y + 26, tr(hero.title), FONT.body, COLORS.textDim), inner.x + inner.w - tx - 4);
    const chipText = tr(hero.weapon);
    const chip = this.add.bitmapText(tx + 6, y + 48, FONT.small, chipText).setTint(hero.color);
    nine(this, tx, y + 45, 'ui_panel_dark', chip.width + 12, chip.height + 6).setOrigin(0, 0);
    this.children.bringToTop(chip);
    if (!unlocked) label(this, tx, y + 68, t('heroLocked'), FONT.head, COLORS.red);
    y += 96;

    // Ratings: how the hero plays at a glance.
    const r = hero.ratings;
    const rows: [string, number][] = [
      [t('rtPower'), r.power], [t('rtToughness'), r.toughness], [t('rtSpeed'), r.speed], [t('rtRange'), r.range], [t('rtDifficulty'), r.difficulty],
    ];
    const barX = inner.x + 92;
    const barW = inner.w - 96;
    rows.forEach(([name, v], i) => {
      const ry = y + i * 17;
      label(this, inner.x, ry, name, FONT.body, COLORS.textDim);
      for (let k = 0; k < 5; k++) {
        const seg = (barW - 16) / 5;
        const g = this.add.graphics();
        g.fillStyle(0x07060d, 1).fillRoundedRect(barX + k * (seg + 4), ry + 3, seg, 9, 2);
        if (k < v) g.fillStyle(i === 4 ? 0xff9a7a : hero.color, 1).fillRoundedRect(barX + k * (seg + 4) + 1, ry + 4, seg - 2, 7, 2);
      }
    });
    y += rows.length * 17 + 8;

    // Skill and passive with the hero's own skill icon.
    const skillIcon = `ui_icon_skill_${hero.id}`;
    if (this.textures.exists(skillIcon)) this.add.image(inner.x + 14, y + 14, skillIcon).setDisplaySize(28, 28);
    label(this, inner.x + 34, y, `${t('skill')}: ${tr(hero.skill.name)}`, FONT.body, hero.color);
    const sd = para(this, inner.x + 34, y + 17, `${tr(hero.skill.desc)} (${hero.skill.cooldown}s)`, inner.w - 36, FONT.small, COLORS.text);
    y += Math.max(32, 21 + sd.height) + 6;
    label(this, inner.x, y, `${t('passive')}: ${tr(hero.passive.name)}`, FONT.body, COLORS.purple);
    const pd = para(this, inner.x, y + 17, tr(hero.passive.desc), inner.w, FONT.small, COLORS.text);
    y += 22 + pd.height + 6;
    const lore = para(this, inner.x, y, tr(hero.lore), inner.w, FONT.small, COLORS.textDim);
    y += lore.height + 10;

    // Wardrobe (unlocked heroes with outfits).
    if (unlocked && hero.skins > 1) {
      label(this, inner.x, y, t('wardrobe'), FONT.head, COLORS.gold);
      y += 20;
      for (let k = 1; k <= hero.skins; k++) {
        const x = inner.x + 20 + (k - 1) * 44;
        const sel = (s.profile.skins[hero.id] ?? 1) === k;
        const b = panel(this, x - 18, y, 36, 40, sel ? 'ui_tab_on' : 'ui_tab').setInteractive();
        this.add.image(x, y + 20, 'heroes', `hero${k}/idle/down/0`).setScale(1.2);
        b.on('pointerup', () => {
          s.profile.skins[hero.id] = k;
          services.save!.markDirty();
          this.scene.restart({ from: this.from, view: hero.id });
        });
      }
    }

    // Action: choose, already chosen, or how to unlock.
    const by = inner.y + inner.h - 18;
    if (!unlocked) {
      this.add.bitmapText(this.W / 2, by, FONT.body, tr(hero.unlock)).setOrigin(0.5).setMaxWidth(inner.w).setCenterAlign().setTint(0xffd9a0);
    } else if (active) {
      new Button(this, this.W / 2, by, t('heroActive'), () => undefined, { w: 200, h: 30, disabled: true });
    } else {
      new Button(this, this.W / 2, by, t('heroChoose'), () => {
        s.profile.heroId = hero.id;
        services.save!.markDirty();
        services.audio?.sfx('ui_confirm');
        toast(this, t('heroChosen', { name: tr(hero.name) }), hero.color);
        this.scene.restart({ from: this.from, view: hero.id });
      }, { w: 200, h: 30, style: 'primary' });
    }
  }

  /** Four portrait cards; locked heroes stay recognisable but darkened. */
  private drawCards(inner: { x: number; y: number; w: number }, viewing: string): void {
    const s = this.save;
    const tw = inner.w / HEROES.length;
    HEROES.forEach((h, i) => {
      const unlocked = s.unlocks.heroes.includes(h.id);
      const x = inner.x + i * tw;
      const bg = panel(this, x + 2, inner.y, tw - 4, 66, h.id === viewing ? 'ui_tab_on' : 'ui_tab').setInteractive();
      if (this.textures.exists(h.portrait)) {
        const img = this.add.image(x + tw / 2, inner.y + 27, h.portrait).setDisplaySize(40, 40);
        if (!unlocked) img.setTint(0x2e2a44);
      }
      label(this, x + tw / 2, inner.y + 56, tr(h.name), FONT.small, unlocked ? (h.id === s.profile.heroId ? COLORS.gold : COLORS.text) : COLORS.textDim, 0.5, 0.5);
      if (h.id === s.profile.heroId) this.add.graphics().fillStyle(h.color, 1).fillCircle(x + tw - 10, inner.y + 9, 3);
      bg.on('pointerup', () => {
        services.audio?.sfx('ui_click');
        this.scene.restart({ from: this.from, view: h.id });
      });
    });
  }
}

// ============================================================================ Lantern Tree (talents)
export class LanternTreeScene extends OverlayScene {
  private selected?: TalentDef;

  constructor() {
    super('LanternTree');
  }

  init(d: { from?: string; sel?: string }): void {
    super.init(d);
    this.selected = TALENTS.find((x) => x.id === d.sel);
  }

  create(): void {
    const inner = this.frame(t('lanternTree'), 0.94);
    const s = this.save;
    label(this, inner.x, inner.y, `${t('embers')}: ${s.currency.embers}`, FONT.head, COLORS.ember);
    const branches: TalentDef['branch'][] = ['might', 'guard', 'grace', 'fortune'];
    const colW = inner.w / 4;
    const bosses = s.unlocks.bossesDefeated.length;
    const nodeY0 = inner.y + 60;
    const gfx = this.add.graphics();
    branches.forEach((br, bi) => {
      const cx = inner.x + colW * bi + colW / 2;
      label(this, cx, inner.y + 32, t(`branch_${br}`), FONT.small, COLORS.gold, 0.5, 0.5);
      const list = TALENTS.filter((x) => x.branch === br);
      list.forEach((tal, i) => {
        const y = nodeY0 + i * 56;
        const rank = s.talents[tal.id] ?? 0;
        const reqOk = !tal.requires || (s.talents[tal.requires] ?? 0) > 0;
        const gateOk = (tal.gate ?? 0) <= bosses;
        const available = reqOk && gateOk;
        if (i > 0) gfx.lineStyle(2, reqOk ? COLORS.gold : COLORS.border, 0.8).lineBetween(cx, y - 36, cx, y - 20);
        const sel = this.selected?.id === tal.id;
        const bg = this.add.circle(cx, y, 18, rank >= tal.maxRank ? 0x6b4a1a : rank > 0 ? 0x3a2a18 : 0x15132a).setStrokeStyle(2, sel ? 0xffffff : rank > 0 ? COLORS.gold : available ? COLORS.borderLight : COLORS.border);
        const iconKey = tal.icon;
        if (this.textures.exists(iconKey)) this.add.image(cx, y, iconKey).setDisplaySize(22, 22).setAlpha(available ? 1 : 0.35);
        else this.add.image(cx, y, 'proj_star').setTint(available ? COLORS.gold : COLORS.border);
        label(this, cx, y + 22, `${rank}/${tal.maxRank}`, FONT.small, rank > 0 ? COLORS.gold : COLORS.textDim, 0.5, 0);
        bg.setInteractive().on('pointerup', () => this.scene.restart({ from: this.from, sel: tal.id }));
      });
    });
    const tal = this.selected;
    const by = this.panelY + this.panelH - 110;
    panel(this, inner.x, by, inner.w, 98, 'ui_panel_dark');
    if (!tal) {
      para(this, inner.x + 8, by + 8, t('treeHint'), inner.w - 16, FONT.small, COLORS.textDim);
      return;
    }
    const rank = s.talents[tal.id] ?? 0;
    label(this, inner.x + 8, by + 6, `${tr(tal.name)}  ${t('talentRank', { a: rank, b: tal.maxRank })}`, FONT.head, COLORS.gold);
    para(this, inner.x + 8, by + 24, tr(tal.desc, { v: tal.value }), inner.w - 16, FONT.small, COLORS.text);
    const reqOk = !tal.requires || (s.talents[tal.requires] ?? 0) > 0;
    const gateOk = (tal.gate ?? 0) <= bosses;
    let why = '';
    if (!reqOk) why = t('requires', { x: tr(TALENTS.find((x) => x.id === tal.requires)!.name) });
    else if (!gateOk) why = t('requiresBosses', { n: tal.gate ?? 0 });
    if (why) label(this, inner.x + 8, by + 50, why, FONT.small, COLORS.red);
    if (rank >= tal.maxRank) {
      label(this, this.W / 2, by + 80, t('maxed'), FONT.head, COLORS.gold, 0.5, 0.5);
      return;
    }
    const cost = tal.costs[rank];
    new Button(this, this.W / 2, by + 78, `${t('learn')}  (${cost} ${t('embers')})`, () => {
      if (s.currency.embers < cost) return toast(this, t('notEnoughEmbers'), COLORS.red);
      s.currency.embers -= cost;
      s.talents[tal.id] = rank + 1;
      services.audio?.sfx('talent');
      services.platform?.haptic('success');
      services.save!.markDirty();
      checkProgress();
      this.scene.restart({ from: this.from, sel: tal.id });
    }, { w: 200, h: 26, style: 'primary', disabled: !reqOk || !gateOk || s.currency.embers < cost });
  }
}

// ============================================================================ Descend (run setup)
export class DescendScene extends OverlayScene {
  constructor() {
    super('Descend');
  }

  create(): void {
    const inner = this.frame(t('enterRift'), 0.9);
    const s = this.save;
    const hero = heroDef(s.profile.heroId);

    // Hero card
    let y = inner.y + 4;
    const g = this.add.graphics();
    g.fillStyle(0x07060d, 1).fillRoundedRect(inner.x, y, 64, 64, 6);
    g.lineStyle(2, hero.color, 1).strokeRoundedRect(inner.x + 1, y + 1, 62, 62, 6);
    if (this.textures.exists(hero.portrait)) this.add.image(inner.x + 32, y + 32, hero.portrait).setDisplaySize(58, 58);
    label(this, inner.x + 74, y + 2, tr(hero.name), FONT.head, COLORS.gold);
    fitBox(label(this, inner.x + 74, y + 22, `${tr(hero.title)}  ·  ${tr(hero.weapon)}`, FONT.small, hero.color), inner.w - 78);
    new Button(this, inner.x + 74 + 62, y + 48, t('selectHero'), () => {
      const from = this.from;
      this.scene.stop();
      this.scene.launch('Hero', { from });
    }, { w: 124, h: 22, font: FONT.small });
    y += 76;

    // The Depths: regions (main and discovered alternates) and their guardians.
    label(this, inner.x, y, t('theDepths'), FONT.head, COLORS.gold);
    y += 22;
    for (const b of BIOMES) {
      const beaten = s.unlocks.bossesDefeated.includes(b.boss);
      const reached = s.unlocks.maxDepthReached >= b.depth;
      nine(this, inner.x, y, beaten ? 'ui_panel' : 'ui_panel_dark', inner.w, 38).setOrigin(0, 0).setAlpha(reached ? 1 : 0.6);
      label(this, inner.x + 8, y + 6, `${b.depth}`, FONT.title, beaten ? COLORS.gold : reached ? COLORS.text : COLORS.border);
      const alts = ALT_BIOMES.filter((a) => a.depth === b.depth && s.flags[`region_${a.id}`]);
      const names = [b, ...alts].map((x) => (reached || s.flags[`region_${x.id}`] ? tr(x.name) : '???')).join('  /  ');
      fitBox(label(this, inner.x + 30, y + 5, names, FONT.body, reached ? COLORS.text : COLORS.textDim), inner.w - 38, 17);
      const bossName = b.boss === 'twin_lamias' ? tr({ en: 'The Twin Sisters', id: 'Saudari Kembar' }) : tr(BOSSES[BIOME_BOSS[b.boss] ?? b.boss]?.name ?? { en: '?', id: '?' });
      fitBox(label(this, inner.x + 30, y + 22, `${t('guardian')}: ${reached ? bossName : '???'}`, FONT.small, beaten ? COLORS.green : COLORS.textDim), inner.w - 38, 14);
      y += 42;
    }
    y += 4;

    const el = s.activeElixir ? ELIXIRS.find((e) => e.id === s.activeElixir) : undefined;
    label(this, inner.x, y, `${t('elixirs')}: ${el ? tr(el.name) : t('none')}`, FONT.small, el ? COLORS.green : COLORS.textDim);
    const heat = vowHeat(s.vows);
    label(this, inner.x + inner.w, y, `${t('heat')}: ${heat}${heat ? ` (x${vowEmberMult(s.vows).toFixed(1)} ${t('embers')})` : ''}`, FONT.small, heat ? COLORS.ember : COLORS.textDim, 1, 0);
    y += 18;

    // This week's mutator applies to every run except the Daily Run.
    const mut = weeklyMutator(Date.now());
    nine(this, inner.x, y, 'ui_panel_dark', inner.w, 40).setOrigin(0, 0);
    fitBox(label(this, inner.x + 8, y + 4, `${t('weekMutator')}: ${tr(mut.name)}  ·  +${Math.round(MUTATOR_EMBER_BONUS * 100)}% ${t('embers')}`, FONT.small, COLORS.cyan), inner.w - 16, 15);
    fitBox(label(this, inner.x + 8, y + 21, tr(mut.desc), FONT.small, COLORS.textDim), inner.w - 16, 15);
    y += 46;

    const bw = inner.w - 20;
    const endlessOpen = (s.stats.wins ?? 0) > 0;
    const by = Math.max(y + 18, inner.y + inner.h - 132);
    new Button(this, this.W / 2, by, t('normalRun'), () => this.start(false), { w: bw, h: 38, style: 'primary' });
    const best = s.stats.bestEndless ?? 0;
    new Button(this, this.W / 2, by + 44, endlessOpen ? `${t('endlessRun')}  ·  ${t('best')} ${best}/${ENDLESS_GOAL}` : `${t('endlessRun')} (${t('locked')})`, () => {
      confirm(this, t('endlessRun'), t('endlessDesc'), () => this.start(false, undefined, true));
    }, { w: bw, h: 30, disabled: !endlessOpen });
    const day = today();
    const dailyDone = s.daily.lastDay === day;
    new Button(this, this.W / 2, by + 80, dailyDone ? `${t('dailyRun')} (${t('complete')})` : t('dailyRun'), () => {
      if (dailyDone) return;
      confirm(this, t('dailyRun'), t('dailyDesc'), () => {
        s.daily.lastDay = day;
        this.start(true, hashString(`daily:${day}`));
      });
    }, { w: bw, h: 30, disabled: !s.unlocks.bossesDefeated.includes('gorehorn') || dailyDone });
    fitBox(para(this, inner.x, by + 102, t('descendHint'), inner.w, FONT.small, COLORS.textDim), inner.w, this.panelY + this.panelH - (by + 102) - 10);
  }

  private start(daily: boolean, seed?: number, endless = false): void {
    const s = this.save;
    RunManager.start({ heroId: s.profile.heroId, daily, seed, endless });
    services.audio?.sfx('descend');
    this.scene.stop();
    const hub = this.scene.get('Hub') as unknown as { goTo: (k: string) => void };
    this.scene.resume('Hub');
    hub.goTo('RunMap');
  }
}
