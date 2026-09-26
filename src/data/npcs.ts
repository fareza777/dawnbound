import type { L10n } from '@/core/i18n';

export type NpcRole =
  | 'lantern' | 'blacksmith' | 'alchemist' | 'merchant' | 'shrine' | 'hunter' | 'scholar' | 'vows' | 'garden'
  | 'training' | 'child' | 'bard';

export interface NpcDef {
  id: string;
  name: L10n;
  title: L10n;
  role: NpcRole;
  /** Actors atlas walk prefix, e.g. "npc13" → npc13/walk/down/1. */
  sprite: string;
  tint?: number;
  /** Tile position in the village map. */
  pos: [number, number];
  /** Portrait prompt (text-only generation) — must match the sprite's colours. */
  look: string;
  voice: 'warm' | 'gruff' | 'bright' | 'cheeky' | 'serene' | 'curt' | 'wise' | 'mysterious' | 'sunny' | 'stern' | 'small' | 'lyrical';
  /** Feature unlocked when the NPC first appears. */
  unlockAfter?: string;
}

const L = (en: string, id: string): L10n => ({ en, id });

export const NPCS: NpcDef[] = [
  {
    id: 'maren', name: L('Maren', 'Maren'), title: L('Spirit of the Lantern', 'Roh Lentera'), role: 'lantern', sprite: 'npc17', tint: 0x9ec8ff,
    pos: [14, 16], voice: 'warm',
    look: 'translucent ghostly elderly woman, long silver braided hair, soft blue spirit glow, gentle smile, keeper robe with golden lantern emblem',
  },
  {
    id: 'dorran', name: L('Captain Dorran', 'Kapten Dorran'), title: L('Village Guard', 'Penjaga Desa'), role: 'training', sprite: 'npc11',
    pos: [6, 22], voice: 'stern',
    look: 'grizzled middle-aged male captain, short dark blue hair with grey streaks, scar over eyebrow, dented blue steel armor, stern face',
  },
  {
    id: 'brom', name: L('Brom', 'Brom'), title: L('Blacksmith', 'Pandai Besi'), role: 'blacksmith', sprite: 'npc13',
    pos: [6, 13], voice: 'gruff', unlockAfter: 'mq_training',
    look: 'burly stocky blacksmith man, huge braided brown beard, bald head, soot on cheeks, leather apron, glowing forge light',
  },
  {
    id: 'ysolde', name: L('Ysolde', 'Ysolde'), title: L('Alchemist', 'Ahli Ramuan'), role: 'alchemist', sprite: 'npc10',
    pos: [18, 13], voice: 'bright', unlockAfter: 'mq_gorehorn',
    look: 'young woman alchemist, messy green hair in a bun, brass goggles on forehead, freckles, holding a bubbling green potion',
  },
  {
    id: 'pip', name: L('Pip', 'Pip'), title: L('Traveling Merchant', 'Pedagang Keliling'), role: 'merchant', sprite: 'npc22',
    pos: [18, 18], voice: 'cheeky', unlockAfter: 'mq_training',
    look: 'cheerful halfling merchant, green cap with feather, big grin, round cheeks, gold coin earring, green vest',
  },
  {
    id: 'liora', name: L('Sister Liora', 'Suster Liora'), title: L('Keeper of Shrines', 'Penjaga Kuil'), role: 'shrine', sprite: 'npc5',
    pos: [17, 7], voice: 'serene', unlockAfter: 'mq_descend',
    look: 'serene young priestess, long golden hair, white and gold hood, closed calm eyes, soft golden halo light',
  },
  {
    id: 'kael', name: L('Kael', 'Kael'), title: L('Monster Hunter', 'Pemburu Monster'), role: 'hunter', sprite: 'npc4',
    pos: [3, 17], voice: 'curt', unlockAfter: 'mq_descend',
    look: 'rugged young male hunter, spiky brown hair, three claw scars on cheek, dark green hood, bow on shoulder, sharp eyes',
  },
  {
    id: 'tobin', name: L('Old Tobin', 'Tobin Tua'), title: L('Scholar', 'Cendekiawan'), role: 'scholar', sprite: 'npc3',
    pos: [8, 5], voice: 'wise',
    look: 'old male scholar, white hair and long white beard, round spectacles, dark robe, ink-stained fingers, holding an old book',
  },
  {
    id: 'nyx', name: L('Nyx', 'Nyx'), title: L('Hooded Stranger', 'Orang Asing Bertudung'), role: 'vows', sprite: 'npc30',
    pos: [21, 23], voice: 'mysterious', unlockAfter: 'mq_gorehorn',
    look: 'mysterious hooded woman, deep lavender hood shadowing her face, glowing violet eyes, half silver mask, purple starry cloak',
  },
  {
    id: 'mira', name: L('Mira', 'Mira'), title: L('Farmer', 'Petani'), role: 'garden', sprite: 'npc12',
    pos: [21, 16], voice: 'sunny', unlockAfter: 'mq_descend',
    look: 'cheerful young farmer woman, long orange hair, straw hat, freckles, dirt on nose, holding a watering can, sunny smile',
  },
  {
    id: 'wren', name: L('Wren', 'Wren'), title: L('Village Child', 'Anak Desa'), role: 'child', sprite: 'npc7',
    pos: [14, 19], voice: 'small',
    look: 'small girl child, short pink hair with a ribbon, big curious eyes, patched dress, holding a wooden toy sword',
  },
  {
    id: 'finn', name: L('Finn', 'Finn'), title: L('Bard', 'Penyair'), role: 'bard', sprite: 'npc6',
    pos: [10, 19], voice: 'lyrical', unlockAfter: 'mq_gorehorn',
    look: 'charming young male bard, wavy dark blue hair, feathered red cap, playful smile, holding a lute',
  },
];

export function npcById(id: string): NpcDef | undefined {
  return NPCS.find((n) => n.id === id);
}

export const HERO_LOOKS: Record<string, string> = {
  rowan: 'young hero, spiky blond hair, determined blue eyes, blue tunic with brown leather shoulder strap, a small golden lantern charm, brave smile',
  sera: 'young female spear warrior, long white hair in a high ponytail, cyan eyes, light steel armor, fierce confident look',
  elio: 'young male mage, silver lavender hair, violet eyes, starry midnight blue robe, glowing star orb near his face',
  kaito: 'young swordsman, dark navy blue hair tied back, calm narrow eyes, dark blue kimono-style jacket, katana hilt visible',
};

export const SPIRIT_LOOKS: Record<string, string> = {
  ember: 'fire spirit face made of living flames, orange and yellow fire hair, glowing ember eyes, wild grin',
  rime: 'ice spirit woman with crystal frost crown, pale blue skin, snowflakes, serene cold eyes',
  tempest: 'lightning spirit with electric yellow hair crackling, bright eyes, energetic grin, storm clouds',
  venom: 'venom spirit woman with green serpent scales, leafy vines hair, emerald eyes, sly smile',
  aurora: 'radiant light spirit with golden halo, white glowing hair, gentle warm face, sunrise colors',
  umbra: 'shadow spirit with dark violet smoke body, glowing purple eyes, crescent moon mark, mysterious smile',
};
