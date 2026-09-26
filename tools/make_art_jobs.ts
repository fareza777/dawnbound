// Builds tools/jobs/all.json (text prompts only) from the game's data tables.
// Run: npx tsx tools/make_art_jobs.ts
import fs from 'node:fs';
import { ITEM_BASES, UNIQUES, baseById } from '../src/data/items';
import { RELICS } from '../src/data/relics';
import { MATERIALS, ELIXIRS } from '../src/data/materials';
import { BOONS, SPIRITS } from '../src/data/boons';
import { NPCS, HERO_LOOKS, SPIRIT_LOOKS } from '../src/data/npcs';

interface Job { out: string; prompt: string; model: string; style: string; w: number; h: number; remove_bg?: boolean; seed?: number }
const jobs: Job[] = [];
const G = 'src/assets/gen';

const TIER_LOOK = [
  'rusty brown pitted iron',
  'plain grey iron',
  'polished steel',
  'steel with gold trim and a small red gem',
  'pale silver-blue moonsteel with a soft glow',
  'dark metal engraved with glowing cyan runes',
  'radiant golden metal with warm ember glow',
  'cosmic purple metal with twinkling stars and violet glow',
];
const TYPE_LOOK: Record<string, string> = {
  sword: 'straight longsword', axe: 'battle axe', dagger: 'short curved dagger', spear: 'long spear polearm',
  staff: 'magic staff with a crystal orb', hammer: 'heavy war hammer', helm: 'helmet', armor: 'chest armor breastplate',
  boots: 'pair of boots', ring: 'finger ring with a gem', amulet: 'pendant amulet on a chain', charm: 'small magic charm talisman',
};

const icon = (out: string, prompt: string, style = 'topdown_item', seed?: number): void => {
  jobs.push({ out, prompt, model: 'rd-plus', style, w: 32, h: 32, remove_bg: true, ...(seed ? { seed } : {}) });
};

for (const b of ITEM_BASES) {
  const key = b.weaponType ?? b.slot;
  icon(`${G}/icons/item_${key}_${b.tier}.png`, `${b.name.en}, a ${TYPE_LOOK[key]} made of ${TIER_LOOK[b.tier - 1]}, fantasy RPG item icon`);
}
for (const u of UNIQUES) {
  const base = baseById(u.baseId)!;
  const key = base.weaponType ?? base.slot;
  icon(`${G}/icons/unique_${u.id}.png`, `legendary ${TYPE_LOOK[key]} called "${u.name.en}", ${u.flavor.en} ornate, glowing, unique fantasy RPG item icon`);
}
for (const r of RELICS) {
  const tierLook = r.tier === 'cursed' ? 'cursed, dark red aura' : r.tier === 'legendary' ? 'legendary, golden aura' : r.tier === 'epic' ? 'epic, purple glow' : r.tier === 'rare' ? 'blue shimmer' : 'simple';
  icon(`${G}/icons/relic_${r.id}.png`, `magic relic trinket "${r.name.en}", ${r.desc.en} ${tierLook}, fantasy RPG artifact icon`);
}
for (const m of MATERIALS) {
  icon(`${G}/icons/mat_${m.id}.png`, `${m.name.en}, crafting material, ${m.desc.en} fantasy RPG ingredient icon`);
}
const ELIXIR_COLORS: Record<string, string> = { red: 'red', green: 'green', yellow: 'yellow', gold: 'golden', purple: 'purple', blue: 'icy blue', orange: 'glowing orange' };
for (const e of ELIXIRS) {
  const c = e.icon.replace('icons_elixir_', '');
  icon(`${G}/icons/elixir_${c}.png`, `round glass potion bottle filled with ${ELIXIR_COLORS[c]} liquid, cork stopper, fantasy RPG potion icon`);
}
for (const b of BOONS) {
  const sp = SPIRITS[b.spirit];
  const duo = b.duo ? ` combined with ${SPIRITS[b.duo].element}` : '';
  icon(`${G}/icons/boon_${b.id}.png`, `${sp.element}${duo} magic skill icon "${b.name.en}", ${b.desc.en.replace(/\{v2?\}/g, '')}`, 'skill_icon');
}
const TALENT_LOOK: Record<string, string> = {
  might: 'crossed swords with orange flame', guard: 'shield with a heart', grace: 'winged boot with wind swirls', fortune: 'four leaf clover over gold coins',
};
for (const [k, v] of Object.entries(TALENT_LOOK)) icon(`${G}/icons/talent_${k}.png`, `${v}, skill tree talent icon`, 'skill_icon');
// UI icons for menus
const UI_ICONS: Record<string, string> = {
  inventory: 'leather backpack', quests: 'rolled parchment scroll with red wax seal', codex: 'old leather book with a golden emblem',
  settings: 'bronze gear cog', hero: 'knight helmet', map: 'folded treasure map', embers: 'glowing orange ember crystal',
  gold: 'stack of gold coins', shard: 'pink glowing memory crystal shard', flask: 'red health potion flask',
  attack: 'sword slash', dash: 'wind dash swoosh', skill: 'spinning blade', flare: 'bright lantern burst of light',
};
for (const [k, v] of Object.entries(UI_ICONS)) icon(`${G}/ui/icon_${k}.png`, `${v}, game UI icon`, k === 'attack' || k === 'dash' || k === 'skill' || k === 'flare' ? 'skill_icon' : 'topdown_item');

// Portraits (96x96, dark background)
const portrait = (id: string, look: string) =>
  jobs.push({ out: `${G}/portraits/${id}.png`, prompt: `fantasy RPG character portrait, bust shot, facing viewer, ${look}, dark moody background, rim lighting`, model: 'rd-plus', style: 'default', w: 96, h: 96 });
for (const n of NPCS) portrait(n.id, n.look);
for (const [id, look] of Object.entries(HERO_LOOKS)) portrait(id, look);
for (const [id, look] of Object.entries(SPIRIT_LOOKS)) portrait(`spirit_${id}`, look);

// Key art (216x384 portrait)
const art = (id: string, prompt: string) =>
  jobs.push({ out: `${G}/art/${id}.png`, prompt: `${prompt}, dramatic lighting, detailed pixel art illustration, vertical composition`, model: 'rd-plus', style: 'environment', w: 216, h: 384 });
art('title', 'a lone young hero with a glowing golden lantern standing on a cliff edge overlooking a small village at night, enormous starry night sky with a crescent moon, a glowing purple rift crack in the distant mountains, epic fantasy key art');
art('intro_1', 'a peaceful fantasy village with thatched cottages and green fields under a bright golden sunrise, birds in the sky');
art('intro_2', 'a dark sorcerer king in a black hood raising a hand as a glowing golden crystal shatters into five burning embers, purple lightning');
art('intro_3', 'a dark forest at night where shadowy monsters crawl out of a glowing purple crack in the ground, abandoned houses');
art('intro_4', 'a small village at night protected by a giant glowing golden lantern on a stone shrine, warm light dome against darkness');
art('intro_5', 'an old woman keeper with silver braids holding a glowing lantern, fighting shadow monsters at the village gate, sparks and embers');
art('intro_6', 'an old woman spirit passing a glowing flame to a young blond hero kneeling before a golden lantern shrine, emotional moment');
art('end_1', 'a dark throne room collapsing as five glowing embers merge into a radiant golden crystal, light rays');
art('end_2', 'a golden sunrise over mountains and a village, first dawn after a long night, villagers cheering');
art('end_3', 'a lantern flickering on a shrine at dusk, ominous purple glow deep in a cave below');
art('end_4', 'a young hero offering a hand to a kneeling defeated sorcerer in a black cloak, soft light between them');
art('end_5', 'a quiet village in morning light, a lantern on a shrine resting with a gentle glow, flowers blooming');
art('hub_bg', 'a cozy fantasy village square at night with lanterns and a glowing shrine, cottages, cobblestone path');

// App icon (upscaled 2x later)
jobs.push({ out: `${G}/brand/app_icon.png`, prompt: 'game app icon, a glowing golden lantern with a sword crossed behind it, night blue background, bold readable silhouette, centered', model: 'rd-plus', style: 'default', w: 256, h: 256 });
jobs.push({ out: `${G}/brand/app_icon_fg.png`, prompt: 'a glowing golden lantern with a sword crossed behind it, bold readable silhouette, centered, game icon', model: 'rd-plus', style: 'default', w: 256, h: 256, remove_bg: true });

fs.mkdirSync('tools/jobs', { recursive: true });
fs.writeFileSync('tools/jobs/all.json', JSON.stringify(jobs, null, 1));
console.log(`${jobs.length} jobs`);
