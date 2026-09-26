import type { L10n } from '@/core/i18n';
import type { Element } from './types';

export type AiKind =
  | 'hopper' | 'chaser' | 'charger' | 'shooter' | 'caster' | 'swarm' | 'ghost' | 'burrower' | 'bomber'
  | 'turret' | 'tank' | 'summoner' | 'fallen';

export type Pattern = 'aimed' | 'spread3' | 'spread5' | 'ring6' | 'ring10' | 'spiral' | 'burst3' | 'homing' | 'wave' | 'lob';

export interface EnemySprite {
  atlas: 'monsters' | 'actors';
  /** Animation prefix, e.g. "m01_0" → "m01_0_down". Actors use "<key>_walk". */
  key: string;
  scale?: number;
  tint?: number;
  /** Sprite has only a meaningful front-facing animation. */
  frontOnly?: boolean;
  bodyOffsetY?: number;
}

export interface EnemyDef {
  id: string;
  name: L10n;
  lore: L10n;
  sprite: EnemySprite;
  ai: AiKind;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  radius: number;
  xp: number;
  gold: [number, number];
  element?: Element;
  /** Status applied on hit: [kind, chance 0..1]. */
  onHit?: [string, number];
  pattern?: Pattern;
  cooldown?: number;
  range?: number;
  projSpeed?: number;
  flying?: boolean;
  splitInto?: string;
  explode?: boolean;
  summon?: string;
  resist?: Partial<Record<Element, number>>;
  drop?: [string, number];
  weight?: number;
  /** Projectile sprite tint. */
  projTint?: number;
}

const m = (key: string, scale = 1, extra: Partial<EnemySprite> = {}): EnemySprite => ({ atlas: 'monsters', key, scale, ...extra });
const a = (key: string, scale = 1, extra: Partial<EnemySprite> = {}): EnemySprite => ({ atlas: 'actors', key: `${key}_walk`, scale, ...extra });

export const ENEMIES: Record<string, EnemyDef> = {
  // ---------------- Depth 1 · Whisperwood ----------------
  slime_green: {
    id: 'slime_green', name: { en: 'Moss Slime', id: 'Lendir Lumut' },
    lore: { en: 'Harmless alone. It is never alone.', id: 'Tak berbahaya sendirian. Ia tak pernah sendirian.' },
    sprite: m('m01_0'), ai: 'hopper', hp: 22, atk: 7, def: 0, speed: 58, radius: 6, xp: 3, gold: [1, 3],
    drop: ['slime_gel', 0.25], weight: 10,
  },
  slime_blue: {
    id: 'slime_blue', name: { en: 'Dew Slime', id: 'Lendir Embun' },
    lore: { en: 'Splits in two when struck hard enough.', id: 'Membelah dua bila dipukul cukup keras.' },
    sprite: m('m01_1'), ai: 'hopper', hp: 30, atk: 8, def: 0, speed: 52, radius: 6, xp: 4, gold: [1, 3],
    splitInto: 'slimeling', drop: ['slime_gel', 0.3], weight: 7,
  },
  slimeling: {
    id: 'slimeling', name: { en: 'Slimeling', id: 'Lendir Kecil' },
    lore: { en: 'A fragment with a grudge.', id: 'Pecahan yang menyimpan dendam.' },
    sprite: m('m01_1', 0.7), ai: 'hopper', hp: 10, atk: 5, def: 0, speed: 70, radius: 4, xp: 1, gold: [0, 1], weight: 0,
  },
  mushroom: {
    id: 'mushroom', name: { en: 'Sporecap', id: 'Topi Spora' },
    lore: { en: 'Roots itself and puffs choking spores.', id: 'Menancap di tanah dan menyemburkan spora beracun.' },
    sprite: m('bonus_1', 1, { frontOnly: true }), ai: 'turret', hp: 34, atk: 8, def: 2, speed: 0, radius: 7, xp: 5, gold: [2, 4],
    pattern: 'ring6', cooldown: 2.6, projSpeed: 55, element: 'poison', onHit: ['poison', 0.5], drop: ['mushroom_cap', 0.3],
    weight: 6, projTint: 0xa8e05f,
  },
  wasp: {
    id: 'wasp', name: { en: 'Thornwasp', id: 'Tawon Duri' },
    lore: { en: 'Its sting carries the forest\'s patience: slow, certain.', id: 'Sengatnya membawa kesabaran hutan: lambat, pasti.' },
    sprite: m('bonus_3', 1, { frontOnly: true }), ai: 'swarm', hp: 16, atk: 6, def: 0, speed: 92, radius: 5, xp: 3, gold: [1, 2],
    flying: true, onHit: ['poison', 0.35], element: 'poison', drop: ['wasp_stinger', 0.25], weight: 7,
  },
  thornworm: {
    id: 'thornworm', name: { en: 'Thornworm', id: 'Cacing Duri' },
    lore: { en: 'Burrows beneath roots, rises to spit thorns.', id: 'Menggali di bawah akar, muncul untuk meludahkan duri.' },
    sprite: m('bonus_2', 1, { frontOnly: true }), ai: 'burrower', hp: 40, atk: 9, def: 2, speed: 70, radius: 7, xp: 6, gold: [2, 5],
    pattern: 'spread3', cooldown: 1.8, projSpeed: 90, weight: 4, projTint: 0xd9b36b,
  },
  grove_imp: {
    id: 'grove_imp', name: { en: 'Grove Imp', id: 'Imp Rimba' },
    lore: { en: 'Steals shiny things. Explodes when cornered.', id: 'Mencuri benda berkilau. Meledak bila terpojok.' },
    sprite: m('bonus_0', 1, { frontOnly: true }), ai: 'bomber', hp: 18, atk: 18, def: 0, speed: 84, radius: 6, xp: 4, gold: [3, 8],
    explode: true, element: 'fire', weight: 4,
  },
  slime_knight: {
    id: 'slime_knight', name: { en: 'Slime Knight', id: 'Ksatria Lendir' },
    lore: { en: 'A slime that swallowed a sword and learned to use it.', id: 'Lendir yang menelan pedang dan belajar memakainya.' },
    sprite: m('m03_0'), ai: 'charger', hp: 70, atk: 13, def: 4, speed: 60, radius: 7, xp: 10, gold: [4, 9],
    cooldown: 2.4, range: 70, drop: ['slime_gel', 0.6], weight: 3,
  },
  sporemother: {
    id: 'sporemother', name: { en: 'Sporemother', id: 'Induk Spora' },
    lore: { en: 'Every mushroom in Whisperwood is her child.', id: 'Setiap jamur di Hutan Bisikan adalah anaknya.' },
    sprite: m('bonus_1', 2.2, { frontOnly: true, tint: 0xffc0e0 }), ai: 'summoner', hp: 380, atk: 12, def: 5, speed: 18, radius: 14,
    xp: 40, gold: [30, 50], summon: 'mushroom', pattern: 'ring10', cooldown: 3.2, projSpeed: 60, element: 'poison',
    onHit: ['poison', 0.6], drop: ['mushroom_cap', 1], weight: 0, projTint: 0xa8e05f,
  },

  // ---------------- Depth 2 · Sunken Crypt ----------------
  skeleton: {
    id: 'skeleton', name: { en: 'Restless Bones', id: 'Tulang Gelisah' },
    lore: { en: 'They still guard what they no longer remember.', id: 'Mereka masih menjaga yang tak lagi mereka ingat.' },
    sprite: m('m05_0'), ai: 'chaser', hp: 38, atk: 11, def: 3, speed: 50, radius: 6, xp: 5, gold: [2, 5],
    resist: { poison: 0.5 }, drop: ['bone_dust', 0.35], weight: 9,
  },
  skeleton_archer: {
    id: 'skeleton_archer', name: { en: 'Bone Archer', id: 'Pemanah Tulang' },
    lore: { en: 'Its aim was better when it had eyes.', id: 'Bidikannya lebih baik saat ia masih punya mata.' },
    sprite: m('m05_1'), ai: 'shooter', hp: 30, atk: 11, def: 2, speed: 44, radius: 6, xp: 6, gold: [2, 6],
    pattern: 'aimed', cooldown: 1.9, projSpeed: 120, range: 110, resist: { poison: 0.5 }, drop: ['bone_dust', 0.35],
    weight: 6, projTint: 0xe8e0c8,
  },
  zombie: {
    id: 'zombie', name: { en: 'Drowned One', id: 'Si Tenggelam' },
    lore: { en: 'The crypt flooded once. Some never left.', id: 'Kripta pernah banjir. Beberapa tak pernah pergi.' },
    sprite: m('m02_1'), ai: 'tank', hp: 78, atk: 14, def: 4, speed: 34, radius: 7, xp: 7, gold: [2, 6],
    cooldown: 3, onHit: ['weaken', 0.3], drop: ['grave_moss', 0.3], weight: 6,
  },
  ghost: {
    id: 'ghost', name: { en: 'Lantern Wisp', id: 'Arwah Lentera' },
    lore: { en: 'A soul that followed the wrong light.', id: 'Jiwa yang mengikuti cahaya yang salah.' },
    sprite: m('m02_5'), ai: 'ghost', hp: 27, atk: 10, def: 0, speed: 46, radius: 6, xp: 6, gold: [2, 5], flying: true,
    element: 'shadow', pattern: 'aimed', cooldown: 2.6, projSpeed: 70, resist: { physical: 0.3 }, drop: ['ectoplasm', 0.35],
    weight: 6, projTint: 0xb9a8ff,
  },
  bone_mage: {
    id: 'bone_mage', name: { en: 'Grave Chanter', id: 'Pelantun Kubur' },
    lore: { en: 'Sings the dead awake. Silence it first.', id: 'Menyanyikan orang mati hingga bangun. Bungkam dia lebih dulu.' },
    sprite: m('bonus_5', 1, { frontOnly: true }), ai: 'caster', hp: 40, atk: 12, def: 2, speed: 40, radius: 6, xp: 9, gold: [4, 8],
    pattern: 'spiral', cooldown: 3, projSpeed: 65, element: 'shadow', summon: 'skeleton', weight: 3, projTint: 0x9b6bff,
  },
  crypt_bat: {
    id: 'crypt_bat', name: { en: 'Crypt Fiend', id: 'Iblis Kripta' },
    lore: { en: 'Nests in coffins. Hates light.', id: 'Bersarang di peti mati. Benci cahaya.' },
    sprite: m('bonus_4', 1, { frontOnly: true }), ai: 'swarm', hp: 20, atk: 9, def: 0, speed: 100, radius: 5, xp: 4, gold: [1, 3],
    flying: true, onHit: ['bleed', 0.3], weight: 6,
  },
  skeleton_warrior: {
    id: 'skeleton_warrior', name: { en: 'Crypt Guard', id: 'Penjaga Kripta' },
    lore: { en: 'Swore an oath to the Lanternkeepers. Broke it in death.', id: 'Bersumpah pada Penjaga Lentera. Melanggarnya saat mati.' },
    sprite: m('m05_4'), ai: 'charger', hp: 120, atk: 17, def: 8, speed: 52, radius: 7, xp: 14, gold: [6, 12],
    cooldown: 2.2, range: 80, resist: { poison: 0.5 }, drop: ['bone_dust', 0.8], weight: 3,
  },
  wraith: {
    id: 'wraith', name: { en: 'Grief Wraith', id: 'Hantu Duka' },
    lore: { en: 'It weeps ice.', id: 'Ia menangiskan es.' },
    sprite: m('m02_6'), ai: 'ghost', hp: 70, atk: 14, def: 0, speed: 50, radius: 7, xp: 12, gold: [5, 10], flying: true,
    element: 'shadow', pattern: 'ring6', cooldown: 2.4, projSpeed: 60, resist: { physical: 0.4 }, drop: ['ectoplasm', 0.8],
    weight: 3, projTint: 0x8e7bff,
  },
  bone_captain: {
    id: 'bone_captain', name: { en: 'Captain Morrow', id: 'Kapten Morrow' },
    lore: { en: 'Led the crypt guard. Still gives orders.', id: 'Memimpin penjaga kripta. Masih memberi perintah.' },
    sprite: m('m05_3', 1.8), ai: 'summoner', hp: 520, atk: 18, def: 10, speed: 40, radius: 12, xp: 50, gold: [40, 60],
    summon: 'skeleton', pattern: 'spread5', cooldown: 2.8, projSpeed: 100, drop: ['bone_dust', 1], weight: 0, projTint: 0xe8e0c8,
  },

  // ---------------- Depth 3 · Scorchsand Dunes ----------------
  scorpion: {
    id: 'scorpion', name: { en: 'Dune Stinger', id: 'Penyengat Bukit' },
    lore: { en: 'Buries itself in warm sand to wait.', id: 'Mengubur diri di pasir hangat untuk menunggu.' },
    sprite: m('m04_5'), ai: 'charger', hp: 54, atk: 16, def: 6, speed: 60, radius: 7, xp: 8, gold: [3, 7],
    cooldown: 2.2, range: 75, onHit: ['poison', 0.4], element: 'poison', drop: ['chitin', 0.35], weight: 8,
  },
  scorpion_red: {
    id: 'scorpion_red', name: { en: 'Emberback', id: 'Punggung Bara' },
    lore: { en: 'Its tail glows before it strikes.', id: 'Ekornya menyala sebelum menyerang.' },
    sprite: m('m04_6'), ai: 'shooter', hp: 47, atk: 15, def: 5, speed: 48, radius: 7, xp: 9, gold: [3, 8],
    pattern: 'spread3', cooldown: 2, projSpeed: 100, element: 'fire', onHit: ['burn', 0.4], range: 100, drop: ['chitin', 0.35],
    weight: 6, projTint: 0xff8a3c,
  },
  sand_slime: {
    id: 'sand_slime', name: { en: 'Glass Slime', id: 'Lendir Kaca' },
    lore: { en: 'Sand fused by the heat into a living jewel.', id: 'Pasir yang dilebur panas menjadi permata hidup.' },
    sprite: m('m01_4'), ai: 'hopper', hp: 43, atk: 13, def: 3, speed: 60, radius: 6, xp: 6, gold: [2, 6],
    splitInto: 'slimeling', drop: ['sand_pearl', 0.2], weight: 7,
  },
  mummy: {
    id: 'mummy', name: { en: 'Sandwrapped', id: 'Terbalut Pasir' },
    lore: { en: 'Kings buried with their servants. Both still march.', id: 'Raja yang dikubur bersama pelayannya. Keduanya masih berbaris.' },
    sprite: m('m05_2'), ai: 'tank', hp: 108, atk: 18, def: 7, speed: 36, radius: 7, xp: 12, gold: [4, 9],
    cooldown: 3, onHit: ['slow', 0.4], resist: { poison: 0.5 }, drop: ['ancient_linen', 0.4], weight: 5,
  },
  dust_wisp: {
    id: 'dust_wisp', name: { en: 'Dust Djinnling', id: 'Jin Debu' },
    lore: { en: 'A spark of Azhar\'s magic, bored and dangerous.', id: 'Percikan sihir Azhar, bosan dan berbahaya.' },
    sprite: m('m04_0'), ai: 'caster', hp: 40, atk: 14, def: 2, speed: 55, radius: 6, xp: 10, gold: [4, 9], flying: true,
    pattern: 'burst3', cooldown: 2.4, projSpeed: 110, element: 'shock', onHit: ['shock', 0.35], weight: 4, projTint: 0x8fe3ff,
  },
  sandworm: {
    id: 'sandworm', name: { en: 'Sand Maw', id: 'Mulut Pasir' },
    lore: { en: 'You hear it before you see it. Then it is too late.', id: 'Kau mendengarnya sebelum melihatnya. Lalu sudah terlambat.' },
    sprite: m('bonus_2', 1.3, { frontOnly: true, tint: 0xffd08a }), ai: 'burrower', hp: 70, atk: 17, def: 4, speed: 80, radius: 9,
    xp: 11, gold: [4, 9], pattern: 'spread5', cooldown: 2, projSpeed: 95, weight: 4, projTint: 0xd9b36b,
  },
  scorpion_black: {
    id: 'scorpion_black', name: { en: 'Obsidian Stinger', id: 'Penyengat Obsidian' },
    lore: { en: 'Its shell turns aside ordinary steel.', id: 'Cangkangnya menangkis baja biasa.' },
    sprite: m('m04_4'), ai: 'charger', hp: 170, atk: 22, def: 14, speed: 64, radius: 8, xp: 16, gold: [8, 14],
    cooldown: 2, range: 90, onHit: ['poison', 0.6], element: 'poison', drop: ['chitin', 1], weight: 3,
  },
  sword_slime_gold: {
    id: 'sword_slime_gold', name: { en: 'Gilded Duelist', id: 'Pendekar Emas' },
    lore: { en: 'Swallowed a king\'s blade. Thinks it is the king.', id: 'Menelan pedang raja. Mengira dirinya raja.' },
    sprite: m('m03_4'), ai: 'charger', hp: 150, atk: 20, def: 8, speed: 70, radius: 7, xp: 15, gold: [12, 20],
    cooldown: 1.8, range: 80, drop: ['sand_pearl', 0.6], weight: 3,
  },
  scorpion_king: {
    id: 'scorpion_king', name: { en: 'Scorpion King Sethar', id: 'Raja Kalajengking Sethar' },
    lore: { en: 'Ruled the dunes before the djinn came.', id: 'Menguasai bukit pasir sebelum jin datang.' },
    sprite: m('m04_6', 2.2), ai: 'charger', hp: 700, atk: 24, def: 12, speed: 70, radius: 14, xp: 60, gold: [50, 80],
    cooldown: 1.8, range: 110, pattern: 'spread5', projSpeed: 100, element: 'fire', onHit: ['burn', 0.5], drop: ['chitin', 1],
    weight: 0, projTint: 0xff8a3c,
  },

  // ---------------- Depth 4 · Frostveil Cathedral ----------------
  frost_slime: {
    id: 'frost_slime', name: { en: 'Rime Slime', id: 'Lendir Embun Beku' },
    lore: { en: 'Leaves a trail of frost wherever it hops.', id: 'Meninggalkan jejak beku di setiap lompatannya.' },
    sprite: m('m01_5'), ai: 'hopper', hp: 70, atk: 16, def: 4, speed: 60, radius: 6, xp: 8, gold: [3, 7],
    element: 'ice', onHit: ['chill', 0.5], splitInto: 'slimeling', drop: ['frost_crystal', 0.25], weight: 8,
  },
  ice_sword_slime: {
    id: 'ice_sword_slime', name: { en: 'Glacier Duelist', id: 'Pendekar Gletser' },
    lore: { en: 'Frozen mid-duel, thawed mid-grudge.', id: 'Membeku di tengah duel, mencair di tengah dendam.' },
    sprite: m('m03_1'), ai: 'charger', hp: 130, atk: 22, def: 8, speed: 66, radius: 7, xp: 14, gold: [6, 12],
    cooldown: 2, range: 85, element: 'ice', onHit: ['chill', 0.6], drop: ['frost_crystal', 0.5], weight: 4,
  },
  banshee: {
    id: 'banshee', name: { en: 'Choir Banshee', id: 'Banshee Paduan Suara' },
    lore: { en: 'The cathedral choir never stopped singing.', id: 'Paduan suara katedral tak pernah berhenti bernyanyi.' },
    sprite: m('m02_4'), ai: 'ghost', hp: 80, atk: 18, def: 0, speed: 50, radius: 6, xp: 12, gold: [5, 10], flying: true,
    element: 'ice', pattern: 'ring10', cooldown: 2.8, projSpeed: 60, onHit: ['chill', 0.4], resist: { physical: 0.35 },
    drop: ['wraith_silk', 0.4], weight: 6, projTint: 0x9ee8ff,
  },
  frost_genie: {
    id: 'frost_genie', name: { en: 'Hoarfrost Djinn', id: 'Jin Embun Beku' },
    lore: { en: 'Bound to the cathedral bells.', id: 'Terikat pada lonceng katedral.' },
    sprite: m('m04_1'), ai: 'caster', hp: 90, atk: 19, def: 4, speed: 50, radius: 7, xp: 14, gold: [6, 12], flying: true,
    pattern: 'homing', cooldown: 2.6, projSpeed: 70, element: 'ice', onHit: ['chill', 0.5], weight: 4, projTint: 0x9ee8ff,
  },
  frost_skeleton: {
    id: 'frost_skeleton', name: { en: 'Frozen Pilgrim', id: 'Peziarah Beku' },
    lore: { en: 'Came to pray for the sun. Stayed.', id: 'Datang untuk berdoa bagi matahari. Tak pernah pulang.' },
    sprite: m('m02_0', 1, { tint: 0xd0ecff }), ai: 'shooter', hp: 80, atk: 18, def: 5, speed: 44, radius: 6, xp: 10,
    gold: [4, 9], pattern: 'spread3', cooldown: 2, projSpeed: 110, range: 110, element: 'ice', onHit: ['chill', 0.4],
    drop: ['bone_dust', 0.4], weight: 6, projTint: 0x9ee8ff,
  },
  frost_imp: {
    id: 'frost_imp', name: { en: 'Icicle Imp', id: 'Imp Es' },
    lore: { en: 'Shatters into knives.', id: 'Pecah menjadi pisau-pisau.' },
    sprite: m('bonus_4', 1, { frontOnly: true, tint: 0xa8e8ff }), ai: 'bomber', hp: 40, atk: 26, def: 0, speed: 96, radius: 6,
    xp: 7, gold: [3, 8], explode: true, element: 'ice', onHit: ['chill', 1], flying: true, weight: 4,
  },
  frost_minotaur: {
    id: 'frost_minotaur', name: { en: 'Rimehorn', id: 'Tanduk Beku' },
    lore: { en: 'Gorehorn\'s brother. Colder, and angrier.', id: 'Saudara Gorehorn. Lebih dingin, dan lebih marah.' },
    sprite: m('m04_3', 1.25), ai: 'charger', hp: 300, atk: 28, def: 12, speed: 70, radius: 10, xp: 24, gold: [14, 24],
    cooldown: 2, range: 110, element: 'ice', onHit: ['chill', 0.6], drop: ['frost_crystal', 1], weight: 3,
  },
  frost_banshee: {
    id: 'frost_banshee', name: { en: 'Mother Superior Ysa', id: 'Bunda Ysa' },
    lore: { en: 'She led the choir. She leads it still.', id: 'Dia memimpin paduan suara. Dia masih memimpinnya.' },
    sprite: m('m02_4', 2.2), ai: 'caster', hp: 820, atk: 24, def: 6, speed: 40, radius: 14, xp: 70, gold: [60, 90], flying: true,
    pattern: 'spiral', cooldown: 1.6, projSpeed: 70, element: 'ice', onHit: ['chill', 0.6], summon: 'banshee',
    resist: { physical: 0.25 }, drop: ['wraith_silk', 1], weight: 0, projTint: 0x9ee8ff,
  },

  // ---------------- Depth 5 · Hollow Throne ----------------
  fire_slime: {
    id: 'fire_slime', name: { en: 'Cinder Slime', id: 'Lendir Arang' },
    lore: { en: 'Molten at the core. Do not hug.', id: 'Cair di intinya. Jangan dipeluk.' },
    sprite: m('m01_2'), ai: 'hopper', hp: 110, atk: 22, def: 6, speed: 64, radius: 6, xp: 10, gold: [4, 9],
    element: 'fire', onHit: ['burn', 0.5], splitInto: 'slimeling', drop: ['magma_core', 0.2], weight: 7,
  },
  ember_ghost: {
    id: 'ember_ghost', name: { en: 'Ashen Soul', id: 'Jiwa Abu' },
    lore: { en: 'What remains when a Lanternkeeper forgets why.', id: 'Yang tersisa saat Penjaga Lentera lupa alasannya.' },
    sprite: m('m02_7'), ai: 'ghost', hp: 110, atk: 24, def: 0, speed: 56, radius: 6, xp: 14, gold: [5, 11], flying: true,
    element: 'fire', pattern: 'burst3', cooldown: 2.2, projSpeed: 90, onHit: ['burn', 0.4], resist: { physical: 0.35 },
    drop: ['void_essence', 0.3], weight: 6, projTint: 0xff8a3c,
  },
  dread_knight: {
    id: 'dread_knight', name: { en: 'Dread Knight', id: 'Ksatria Teror' },
    lore: { en: 'Malachar\'s honour guard. They chose this.', id: 'Pengawal kehormatan Malachar. Mereka memilih ini.' },
    sprite: m('m05_5'), ai: 'charger', hp: 220, atk: 30, def: 14, speed: 60, radius: 7, xp: 18, gold: [8, 15],
    cooldown: 1.9, range: 90, element: 'shadow', drop: ['void_essence', 0.5], weight: 5,
  },
  void_mage: {
    id: 'void_mage', name: { en: 'Hollow Acolyte', id: 'Pengikut Hampa' },
    lore: { en: 'Prays to an empty throne.', id: 'Berdoa pada takhta yang kosong.' },
    sprite: m('bonus_5', 1, { frontOnly: true, tint: 0xff9ad0 }), ai: 'caster', hp: 120, atk: 26, def: 4, speed: 44, radius: 6,
    xp: 16, gold: [6, 12], pattern: 'wave', cooldown: 2.4, projSpeed: 80, element: 'shadow', summon: 'hell_imp',
    weight: 4, projTint: 0xff5ad0,
  },
  hell_imp: {
    id: 'hell_imp', name: { en: 'Cinder Imp', id: 'Imp Bara' },
    lore: { en: 'Laughs all the way to the explosion.', id: 'Tertawa sampai meledak.' },
    sprite: m('bonus_0', 1, { frontOnly: true, tint: 0xff9a7a }), ai: 'bomber', hp: 60, atk: 34, def: 0, speed: 100, radius: 6,
    xp: 8, gold: [3, 8], explode: true, element: 'fire', onHit: ['burn', 1], weight: 4,
  },
  magma_scorpion: {
    id: 'magma_scorpion', name: { en: 'Magma Stinger', id: 'Penyengat Magma' },
    lore: { en: 'Crawled out of the lava because it was bored.', id: 'Merangkak keluar dari lava karena bosan.' },
    sprite: m('m04_6', 1.1, { tint: 0xff7050 }), ai: 'shooter', hp: 170, atk: 28, def: 10, speed: 50, radius: 8, xp: 16,
    gold: [6, 12], pattern: 'spread5', cooldown: 2.2, projSpeed: 100, range: 110, element: 'fire', onHit: ['burn', 0.5],
    drop: ['magma_core', 0.4], weight: 5, projTint: 0xff8a3c,
  },
  hollow_minotaur: {
    id: 'hollow_minotaur', name: { en: 'Hollow Bull', id: 'Banteng Hampa' },
    lore: { en: 'Emptied of everything but rage.', id: 'Dikosongkan dari segalanya kecuali amarah.' },
    sprite: m('m04_2', 1.3, { tint: 0xc890ff }), ai: 'charger', hp: 460, atk: 38, def: 16, speed: 74, radius: 10, xp: 30,
    gold: [16, 28], cooldown: 1.8, range: 120, element: 'shadow', drop: ['void_essence', 1], weight: 3,
  },
  fallen_keeper: {
    id: 'fallen_keeper', name: { en: 'Fallen Lanternkeeper', id: 'Penjaga Lentera yang Jatuh' },
    lore: { en: 'Once, she carried a lantern like yours.', id: 'Dulu, dia membawa lentera sepertimu.' },
    sprite: a('arpg27', 1.2), ai: 'fallen', hp: 900, atk: 34, def: 14, speed: 80, radius: 9, xp: 80, gold: [60, 100],
    cooldown: 1.4, range: 90, pattern: 'spread5', projSpeed: 120, element: 'shadow', drop: ['void_essence', 1], weight: 0,
    projTint: 0xff5ad0,
  },

  // ---------------- Depth 2 (alt) · Drowned Catacombs ----------------
  bog_slime: {
    id: 'bog_slime', name: { en: 'Bog Slime', id: 'Lendir Rawa' },
    lore: { en: 'It drank the flood water, and the flood water drank it back.', id: 'Ia meminum air banjir, dan air banjir balas meminumnya.' },
    sprite: m('m01_6', 1.05, { tint: 0xb8d8a8 }), ai: 'hopper', hp: 35, atk: 11, def: 2, speed: 56, radius: 6, xp: 6, gold: [2, 5],
    element: 'poison', onHit: ['poison', 0.35], splitInto: 'slimeling', drop: ['grave_moss', 0.3], weight: 7,
  },
  drowned_one: {
    id: 'drowned_one', name: { en: 'Waterlogged Husk', id: 'Sekam Basah' },
    lore: { en: 'Heavy with river water. Every blow it lands chills to the bone.', id: 'Berat oleh air sungai. Setiap pukulannya membekukan hingga ke tulang.' },
    sprite: m('m02_3', 1.1), ai: 'tank', hp: 84, atk: 14, def: 5, speed: 32, radius: 7, xp: 9, gold: [3, 7],
    cooldown: 3, element: 'ice', onHit: ['chill', 0.45], drop: ['grave_moss', 0.35], weight: 6,
  },
  tide_caster: {
    id: 'tide_caster', name: { en: 'Tide Chanter', id: 'Pelantun Pasang' },
    lore: { en: 'Calls the drowned bell. The water answers in waves.', id: 'Membunyikan lonceng tenggelam. Air menjawab dengan gelombang.' },
    sprite: m('bonus_5', 1, { frontOnly: true, tint: 0x7fd8ff }), ai: 'caster', hp: 38, atk: 12, def: 2, speed: 40, radius: 6, xp: 9,
    gold: [4, 8], pattern: 'wave', cooldown: 3.2, projSpeed: 70, element: 'ice', onHit: ['chill', 0.3], weight: 4, projTint: 0x7fd8ff,
  },
  eel_wraith: {
    id: 'eel_wraith', name: { en: 'Eel Wraith', id: 'Arwah Belut' },
    lore: { en: 'Coils through flooded coffins faster than you can blink.', id: 'Melilit di antara peti mati yang banjir lebih cepat dari kedipan mata.' },
    sprite: m('m02_6', 1, { tint: 0x9ff0e0 }), ai: 'ghost', hp: 48, atk: 13, def: 0, speed: 62, radius: 6, xp: 10, gold: [4, 9], flying: true,
    element: 'shadow', pattern: 'burst3', cooldown: 2.6, projSpeed: 80, resist: { physical: 0.3 }, drop: ['ectoplasm', 0.4], weight: 4,
    projTint: 0x9ff0e0,
  },

  // ---------------- Depth 3 (alt) · Emberforge Caverns ----------------
  cinder_imp: {
    id: 'cinder_imp', name: { en: 'Cinder Imp', id: 'Imp Arang' },
    lore: { en: 'Stokes the old forges with anything that burns. Including you.', id: 'Mengobarkan tungku tua dengan apa pun yang bisa terbakar. Termasuk kau.' },
    sprite: m('bonus_0', 1, { frontOnly: true, tint: 0xffa060 }), ai: 'caster', hp: 52, atk: 15, def: 2, speed: 58, radius: 6, xp: 10,
    gold: [4, 9], pattern: 'aimed', cooldown: 2.2, projSpeed: 95, element: 'fire', onHit: ['burn', 0.4], weight: 6, projTint: 0xff8a3c,
  },
  ember_slime: {
    id: 'ember_slime', name: { en: 'Slag Slime', id: 'Lendir Terak' },
    lore: { en: 'Cooled on the outside. Very much not on the inside.', id: 'Dingin di luar. Sama sekali tidak di dalam.' },
    sprite: m('m03_2', 1), ai: 'hopper', hp: 62, atk: 14, def: 4, speed: 58, radius: 6, xp: 7, gold: [2, 6],
    element: 'fire', onHit: ['burn', 0.35], splitInto: 'slimeling', drop: ['magma_core', 0.12], weight: 7,
  },
  magma_crawler: {
    id: 'magma_crawler', name: { en: 'Magma Crawler', id: 'Perayap Magma' },
    lore: { en: 'Swims through molten rock and surfaces right under your boots.', id: 'Berenang di batuan cair dan muncul tepat di bawah sepatumu.' },
    sprite: m('bonus_2', 1.3, { frontOnly: true, tint: 0xff7050 }), ai: 'burrower', hp: 95, atk: 17, def: 5, speed: 82, radius: 9, xp: 12,
    gold: [4, 9], element: 'fire', onHit: ['burn', 0.5], drop: ['magma_core', 0.25], weight: 4,
  },
  forge_golem: {
    id: 'forge_golem', name: { en: 'Forge Golem', id: 'Golem Tempa' },
    lore: { en: 'Built to guard the Ember forges. Nobody told it the smiths are gone.', id: 'Dibuat untuk menjaga tungku Bara. Tak ada yang memberitahunya para pandai besi telah tiada.' },
    sprite: m('m05_2', 1.15, { tint: 0xffb070 }), ai: 'tank', hp: 160, atk: 19, def: 9, speed: 34, radius: 8, xp: 16, gold: [5, 11],
    cooldown: 2.8, element: 'fire', resist: { fire: 0.5 }, drop: ['iron_ore', 0.5], weight: 3,
  },

  // ---------------- Depth 4 (alt) · Crystal Hollows ----------------
  crystal_bat: {
    id: 'crystal_bat', name: { en: 'Glimmer Bat', id: 'Kelelawar Kilau' },
    lore: { en: 'Its wings chime like glass. Too late, usually.', id: 'Sayapnya berdenting seperti kaca. Biasanya sudah terlambat.' },
    sprite: m('bonus_4', 1, { frontOnly: true, tint: 0x9fe8ff }), ai: 'swarm', hp: 42, atk: 15, def: 0, speed: 106, radius: 5, xp: 6,
    gold: [2, 5], flying: true, onHit: ['chill', 0.3], weight: 6,
  },
  shard_slime: {
    id: 'shard_slime', name: { en: 'Shard Slime', id: 'Lendir Serpih' },
    lore: { en: 'Full of tiny crystals. Breaking it only makes more.', id: 'Penuh kristal kecil. Memecahkannya hanya menghasilkan lebih banyak.' },
    sprite: m('m03_5', 1.05, { tint: 0xd8b8ff }), ai: 'hopper', hp: 78, atk: 16, def: 5, speed: 60, radius: 6, xp: 9, gold: [3, 7],
    splitInto: 'slimeling', drop: ['frost_crystal', 0.3], weight: 6,
  },
  prism_caster: {
    id: 'prism_caster', name: { en: 'Prism Seer', id: 'Peramal Prisma' },
    lore: { en: 'Bends starlight into blades. Mostly pointed at you.', id: 'Membengkokkan cahaya bintang menjadi bilah. Kebanyakan diarahkan padamu.' },
    sprite: m('m04_1', 1, { tint: 0xffb0e0 }), ai: 'caster', hp: 88, atk: 18, def: 4, speed: 48, radius: 7, xp: 14, gold: [6, 12],
    flying: true, pattern: 'ring6', cooldown: 3, projSpeed: 80, element: 'holy', weight: 4, projTint: 0xffc0f0,
  },
  geode_golem: {
    id: 'geode_golem', name: { en: 'Geode Golem', id: 'Golem Geode' },
    lore: { en: 'A cave that learned to walk. Crack the shell to reach the heart.', id: 'Sebuah gua yang belajar berjalan. Pecahkan cangkangnya untuk mencapai jantungnya.' },
    sprite: m('m05_2', 1.2, { tint: 0x9fd8ff }), ai: 'tank', hp: 175, atk: 21, def: 11, speed: 32, radius: 8, xp: 18, gold: [6, 12],
    cooldown: 3, element: 'ice', resist: { ice: 0.5, physical: 0.15 }, drop: ['frost_crystal', 0.5], weight: 3,
  },
};

export function enemyDef(id: string): EnemyDef {
  const d = ENEMIES[id];
  if (!d) throw new Error(`Unknown enemy ${id}`);
  return d;
}

/** Floors per depth (mirrors systems/floorgen; kept local so data stays dependency-free). */
const FLOORS = 3;

/**
 * Monsters are built to take several hits (about 4-6 for a regular monster with a build of that depth), so each
 * type's pattern has time to matter instead of everything dying to the first swing.
 */
export const MONSTER_TOUGHNESS = 3;

/**
 * HP/ATK multiplier for depth + floor + vows so the same roster stays relevant. One even step per floor (a new
 * depth is never a bigger jump than a new floor); by the last floor of depth 5 monsters have ~3.4x HP, ~2.9x ATK (before toughness).
 */
export function enemyScaling(depth: number, floor: number, heat = 0): { hp: number; atk: number } {
  const step = (depth - 1) * FLOORS + (floor - 1);
  return {
    hp: MONSTER_TOUGHNESS * (1 + step * 0.18) * (1 + heat * 0.06),
    atk: (1 + step * 0.135) * (1 + heat * 0.04),
  };
}
