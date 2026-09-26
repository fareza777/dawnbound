import type { L10n } from '@/core/i18n';
import { TILE_INDEX } from './tileIndex';

/** Tile index helpers. main = original_atlas (112 cols), legacy = legacy_atlas (74 cols). */
export const MAIN_COLS = 112;
export const LEGACY_COLS = 74;
export interface TileRef {
  sheet: 'main' | 'legacy';
  i: number;
}
export const M = (c: number, r: number): TileRef => ({ sheet: 'main', i: r * MAIN_COLS + c });
export const LG = (c: number, r: number): TileRef => ({ sheet: 'legacy', i: r * LEGACY_COLS + c });

/** Grass floor: plain base, speckled variants and a few sprouts (Whisperwood and the village lawns). */
export const GRASS_FLOOR: [TileRef, number][] = [
  [M(18, 30), 10], [LG(7, 114), 3], [LG(8, 114), 3], [LG(7, 115), 2], [LG(8, 115), 2], [LG(40, 12), 1],
];
/** White, red and pink flower patches drawn over grass. */
export const FLOWER_PATCHES: [TileRef, number][] = [[LG(53, 55), 2], [LG(54, 55), 2], [LG(55, 55), 2]];

/** Spritesheet holding only the tiles the game uses (tools/pack_tiles.py). */
export const TILES_KEY = 'tiles_ss';

/** Frame of a tile in the packed sheet. A missing entry means tools/pack_tiles.py needs re-running. */
export function tileFrame(t: TileRef): number {
  const f = TILE_INDEX[`${t.sheet}:${t.i}`];
  if (f === undefined) {
    console.warn(`[tiles] ${t.sheet}:${t.i} is not packed; run tools/pack_tiles.py`);
    return 0;
  }
  return f;
}

export interface WallStyle {
  /** Three columns (left edge, middle, right edge) for each wall face row, top to bottom. */
  faceRows: [TileRef, TileRef, TileRef][];
  /** Row drawn on the floor directly below the wall face (soft shadow). */
  shadow: [TileRef, TileRef, TileRef];
  /** Row above the face that fades into the dark ceiling. */
  cap: [TileRef, TileRef, TileRef];
  /** Colour of the solid wall tops / outside area. */
  ceiling: number;
  rim: number;
}

export interface BiomeTheme {
  floor: [TileRef, number][];
  floorAlt: [TileRef, number][];
  /** Overlay decals scattered on the floor (drawn as tiles). */
  decals: [TileRef, number][];
  /** Grassy floor: colour patches, flowers and swaying tall grass (gfx/Foliage). */
  foliage?: boolean;
  wall: WallStyle;
  hazard: 'lava' | 'water' | 'pit' | 'ice' | 'spikes';
  hazardTile: TileRef;
  /** Decorative props from the props atlas (frame names) placed on obstacle cells. */
  obstacles: string[];
  /** Small breakables. */
  breakables: string[];
  torch: string;
  ambient: number;
  darkness: number;
  lightTint: number;
  particles: 'leaves' | 'dust' | 'sand' | 'snow' | 'embers' | 'spores';
  bg: string;
}

export interface BiomeDef {
  id: string;
  depth: number;
  name: L10n;
  subtitle: L10n;
  music: string;
  theme: BiomeTheme;
  enemies: string[];
  elites: string[];
  minibosses: string[];
  boss: string;
  ember: L10n;
}

const greyWall: WallStyle = {
  cap: [LG(53, 2), LG(54, 2), LG(55, 2)],
  faceRows: [
    [LG(53, 3), LG(54, 3), LG(55, 3)],
    [LG(53, 4), LG(54, 4), LG(55, 4)],
    [LG(53, 6), LG(54, 6), LG(55, 6)],
  ],
  shadow: [LG(53, 7), LG(54, 7), LG(55, 7)],
  ceiling: 0x0e0c16,
  rim: 0x3a3548,
};
const beigeWall: WallStyle = {
  cap: [LG(50, 2), LG(51, 2), LG(52, 2)],
  faceRows: [
    [LG(50, 3), LG(51, 3), LG(52, 3)],
    [LG(50, 4), LG(51, 4), LG(52, 4)],
    [LG(50, 6), LG(51, 6), LG(52, 6)],
  ],
  shadow: [LG(50, 7), LG(51, 7), LG(52, 7)],
  ceiling: 0x14100c,
  rim: 0x6b5a48,
};
const orangeWall: WallStyle = {
  cap: [LG(50, 8), LG(51, 8), LG(52, 8)],
  faceRows: [
    [LG(50, 9), LG(51, 9), LG(52, 9)],
    [LG(50, 10), LG(51, 10), LG(52, 10)],
    [LG(50, 12), LG(51, 12), LG(52, 12)],
  ],
  shadow: [LG(50, 13), LG(51, 13), LG(52, 13)],
  ceiling: 0x1a0e08,
  rim: 0x7a4424,
};
const lavenderWall: WallStyle = {
  cap: [LG(53, 8), LG(54, 8), LG(55, 8)],
  faceRows: [
    [LG(53, 9), LG(54, 9), LG(55, 9)],
    [LG(53, 10), LG(54, 10), LG(55, 10)],
    [LG(53, 12), LG(54, 12), LG(55, 12)],
  ],
  shadow: [LG(53, 13), LG(54, 13), LG(55, 13)],
  ceiling: 0x0c0c1c,
  rim: 0x55507a,
};

export const BIOMES: BiomeDef[] = [
  {
    id: 'forest',
    depth: 1,
    name: { en: 'Whisperwood', id: 'Hutan Bisikan' },
    subtitle: { en: 'Where the old roots listen', id: 'Tempat akar-akar tua mendengarkan' },
    music: 'm_forest',
    theme: {
      // Base green with fine grass speckles (tiles from the same pack), flower patches as decals.
      floor: [...GRASS_FLOOR],
      floorAlt: [[M(3, 36), 3], [M(2, 36), 1]],
      decals: [...FLOWER_PATCHES, [LG(40, 11), 2], [LG(40, 13), 1]],
      foliage: true,
      wall: beigeWall,
      hazard: 'water',
      hazardTile: M(13, 34),
      obstacles: ['p/tree_02', 'p/tree_04', 'p/tree_11', 'p/tree_12', 'p/tree_13', 'p/rock_18', 'p/rock_25', 'p/rock_03'],
      breakables: ['p/pot_01', 'p/pot_02', 'p/crate_01', 'p/barrel_01'],
      torch: 'torch_torch_03',
      ambient: 0x9fd18a,
      darkness: 0.35,
      lightTint: 0xffd9a0,
      particles: 'leaves',
      bg: 'bg_ForestA',
    },
    enemies: ['slime_green', 'slime_blue', 'mushroom', 'wasp', 'thornworm', 'grove_imp'],
    elites: ['slime_knight', 'wasp', 'mushroom'],
    minibosses: ['sporemother'],
    boss: 'gorehorn',
    ember: { en: 'Ember of Growth', id: 'Bara Pertumbuhan' },
  },
  {
    id: 'crypt',
    depth: 2,
    name: { en: 'Sunken Crypt', id: 'Kripta Tenggelam' },
    subtitle: { en: 'The dead keep their own counsel', id: 'Orang mati menyimpan rahasianya' },
    music: 'm_crypt',
    theme: {
      floor: [[LG(34, 2), 12], [LG(34, 3), 3], [LG(34, 11), 2], [LG(34, 12), 1]],
      floorAlt: [[LG(34, 14), 2], [LG(34, 15), 2], [M(41, 26), 2]],
      decals: [[M(49, 34), 2], [M(50, 34), 1], [M(49, 35), 1]],
      wall: greyWall,
      hazard: 'pit',
      hazardTile: M(0, 0),
      obstacles: ['p/column_01', 'p/column_02', 'p/statue_01', 'p/column_07', 'p/rock_07'],
      breakables: ['p/pot_10', 'p/pot_11', 'p/pot_12', 'p/crate_02', 'p/barrel_02'],
      torch: 'torch_torch_01',
      ambient: 0x8a92c9,
      darkness: 0.62,
      lightTint: 0xffc070,
      particles: 'dust',
      bg: 'bg_DungeonA',
    },
    enemies: ['skeleton', 'skeleton_archer', 'zombie', 'ghost', 'bone_mage', 'crypt_bat'],
    elites: ['skeleton_warrior', 'wraith', 'zombie'],
    minibosses: ['bone_captain'],
    boss: 'twin_lamias',
    ember: { en: 'Ember of Memory', id: 'Bara Ingatan' },
  },
  {
    id: 'desert',
    depth: 3,
    name: { en: 'Scorchsand Dunes', id: 'Bukit Pasir Membara' },
    subtitle: { en: 'The sun remembers what it burned', id: 'Matahari mengingat yang pernah ia bakar' },
    music: 'm_desert',
    theme: {
      floor: [[M(43, 23), 10], [M(43, 28), 5], [M(44, 23), 3], [M(43, 26), 2], [M(43, 27), 2]],
      floorAlt: [[M(1, 36), 3], [M(1, 33), 2]],
      decals: [[M(49, 34), 1], [M(51, 34), 1], [M(50, 35), 1]],
      wall: orangeWall,
      hazard: 'spikes',
      hazardTile: M(0, 0),
      obstacles: ['p/rock_19', 'p/rock_26', 'p/rock_36', 'p/column_03', 'p/statue_02'],
      breakables: ['p/pot_4', 'p/pot_5', 'p/pot_6', 'p/barrel_03', 'p/crate_03'],
      torch: 'torch_torch_05',
      ambient: 0xffd29a,
      darkness: 0.3,
      lightTint: 0xffe0a0,
      particles: 'sand',
      bg: 'bg_DesertA',
    },
    enemies: ['scorpion', 'scorpion_red', 'sand_slime', 'mummy', 'dust_wisp', 'sandworm'],
    elites: ['scorpion_black', 'sword_slime_gold', 'mummy'],
    minibosses: ['scorpion_king'],
    boss: 'azhar',
    ember: { en: 'Ember of Will', id: 'Bara Tekad' },
  },
  {
    id: 'ice',
    depth: 4,
    name: { en: 'Frostveil Cathedral', id: 'Katedral Tirai Beku' },
    subtitle: { en: 'Prayers freeze before they rise', id: 'Doa membeku sebelum naik' },
    music: 'm_ice',
    theme: {
      floor: [[LG(35, 2), 10], [LG(35, 3), 4], [LG(35, 8), 3], [LG(35, 11), 2], [LG(35, 12), 2]],
      floorAlt: [[M(7, 33), 2], [M(8, 33), 2], [M(5, 36), 2]],
      decals: [[M(52, 36), 1]],
      wall: lavenderWall,
      hazard: 'ice',
      hazardTile: M(7, 33),
      obstacles: ['p/column_05', 'p/column_06', 'p/statue_03', 'p/column_10', 'p/rock_39'],
      breakables: ['p/pot_13', 'p/pot_14', 'p/crate_04', 'p/barrel_04'],
      torch: 'torch_torch_09',
      ambient: 0xaee6ff,
      darkness: 0.5,
      lightTint: 0xbfe8ff,
      particles: 'snow',
      bg: 'bg_DungeonC',
    },
    enemies: ['frost_slime', 'ice_sword_slime', 'banshee', 'frost_genie', 'frost_skeleton', 'frost_imp'],
    elites: ['frost_minotaur', 'banshee', 'ice_sword_slime'],
    minibosses: ['frost_banshee'],
    boss: 'vesper',
    ember: { en: 'Ember of Love', id: 'Bara Cinta' },
  },
  {
    id: 'throne',
    depth: 5,
    name: { en: 'Hollow Throne', id: 'Takhta Hampa' },
    subtitle: { en: 'Where the dawn was murdered', id: 'Tempat fajar dibunuh' },
    music: 'm_throne',
    theme: {
      floor: [[M(45, 23), 8], [M(45, 26), 3], [M(45, 27), 3], [M(45, 33), 3], [M(44, 34), 2]],
      floorAlt: [[M(4, 37), 3], [M(45, 24), 2]],
      decals: [[M(50, 34), 1], [M(50, 35), 1]],
      wall: greyWall,
      hazard: 'lava',
      hazardTile: M(5, 33),
      obstacles: ['p/column_04', 'p/statue_01', 'p/rock_20', 'p/rock_27', 'p/column_08'],
      breakables: ['p/pot_20', 'p/pot_21', 'p/crate_05', 'p/barrel_05'],
      torch: 'torch_torch_13',
      ambient: 0xff8a6a,
      darkness: 0.66,
      lightTint: 0xff9a5a,
      particles: 'embers',
      bg: 'bg_DungeonD',
    },
    enemies: ['fire_slime', 'ember_ghost', 'dread_knight', 'void_mage', 'hell_imp', 'magma_scorpion'],
    elites: ['hollow_minotaur', 'fallen_keeper', 'dread_knight'],
    minibosses: ['fallen_keeper'],
    boss: 'malachar',
    ember: { en: 'Ember of Dawn', id: 'Bara Fajar' },
  },
];

/**
 * Alternate regions: a run may take one of these instead of the main biome at the same depth. They keep that depth's
 * story boss (so the main quest line is unchanged) but bring their own terrain, monsters, hazards and music.
 */
export const ALT_BIOMES: BiomeDef[] = [
  {
    id: 'drowned',
    depth: 2,
    name: { en: 'Drowned Catacombs', id: 'Katakomba Tenggelam' },
    subtitle: { en: 'Where the river came to bury its dead', id: 'Tempat sungai datang mengubur orang matinya' },
    music: 'm_drowned',
    theme: {
      floor: [[M(40, 34), 10], [M(41, 34), 3], [M(40, 35), 3], [M(41, 35), 2], [M(42, 34), 1]],
      floorAlt: [[M(3, 36), 3], [M(3, 33), 1], [M(4, 34), 1]],
      decals: [[M(49, 34), 2], [M(50, 35), 1]],
      wall: lavenderWall,
      hazard: 'water',
      hazardTile: M(13, 34),
      obstacles: ['p/column_03', 'p/column_04', 'p/column_08', 'p/column_09', 'p/statue_02', 'p/rock_25'],
      breakables: ['p/pot_10', 'p/pot_12', 'p/crate_02', 'p/barrel_02'],
      torch: 'torch_torch_09',
      ambient: 0x7fc8d0,
      darkness: 0.6,
      lightTint: 0x9fe0ff,
      particles: 'spores',
      bg: 'bg_DungeonB',
    },
    enemies: ['bog_slime', 'drowned_one', 'tide_caster', 'eel_wraith', 'skeleton', 'crypt_bat'],
    elites: ['drowned_one', 'eel_wraith', 'skeleton_warrior'],
    minibosses: ['bone_captain'],
    boss: 'twin_lamias',
    ember: { en: 'Ember of Memory', id: 'Bara Ingatan' },
  },
  {
    id: 'forge',
    depth: 3,
    name: { en: 'Emberforge Caverns', id: 'Gua Tempa Bara' },
    subtitle: { en: 'The old smiths never let the fires die', id: 'Para pandai besi kuno tak pernah membiarkan api padam' },
    music: 'm_forge',
    theme: {
      floor: [[M(1, 36), 12], [M(1, 33), 2], [M(2, 34), 2]],
      floorAlt: [[M(4, 37), 4]],
      decals: [[M(49, 34), 1], [M(51, 34), 1]],
      wall: orangeWall,
      hazard: 'lava',
      hazardTile: M(4, 36),
      obstacles: ['p/rock_42', 'p/rock_43', 'p/rock_44', 'p/rock_45', 'p/rock_46', 'crystal/cristal_0/0', 'crystal/cristal_2/0'],
      breakables: ['p/barrel_03', 'p/crate_03', 'p/pot_4', 'p/pot_5'],
      torch: 'torch_torch_05',
      ambient: 0xff9a60,
      darkness: 0.52,
      lightTint: 0xffa060,
      particles: 'embers',
      bg: 'bg_DesertB',
    },
    enemies: ['cinder_imp', 'ember_slime', 'magma_crawler', 'forge_golem', 'scorpion_red', 'dust_wisp'],
    elites: ['forge_golem', 'magma_crawler', 'scorpion_black'],
    minibosses: ['scorpion_king'],
    boss: 'azhar',
    ember: { en: 'Ember of Will', id: 'Bara Tekad' },
  },
  {
    id: 'crystal',
    depth: 4,
    name: { en: 'Crystal Hollows', id: 'Lembah Kristal' },
    subtitle: { en: 'Every wall remembers a star', id: 'Setiap dinding mengingat sebuah bintang' },
    music: 'm_crystal',
    theme: {
      floor: [[M(3, 37), 12]],
      floorAlt: [[M(5, 36), 3]],
      decals: [[M(52, 36), 1]],
      wall: lavenderWall,
      hazard: 'water',
      hazardTile: M(13, 34),
      obstacles: ['p/rock_15', 'p/rock_16', 'p/rock_17', 'crystal/cristal_4/0', 'crystal/cristal_5/0', 'crystal/cristal_9/0', 'p/rock_40'],
      breakables: ['p/pot_13', 'p/pot_14', 'p/crate_04', 'p/barrel_04'],
      torch: 'torch_torch_09',
      ambient: 0xb0c8ff,
      darkness: 0.58,
      lightTint: 0xc0d8ff,
      particles: 'dust',
      bg: 'bg_DungeonC',
    },
    enemies: ['crystal_bat', 'shard_slime', 'prism_caster', 'geode_golem', 'frost_imp', 'banshee'],
    elites: ['geode_golem', 'prism_caster', 'frost_minotaur'],
    minibosses: ['frost_banshee'],
    boss: 'vesper',
    ember: { en: 'Ember of Love', id: 'Bara Cinta' },
  },
];

/** Every region (main and alternate), for lookups by id. */
export const ALL_BIOMES: BiomeDef[] = [...BIOMES, ...ALT_BIOMES];

/**
 * The biome of a depth for a given run: the region rolled at run start (see RunManager), else the main biome.
 * `regions` maps depth → biome id.
 */
export function biomeForDepth(depth: number, regions?: Record<string, string>): BiomeDef {
  const id = regions?.[String(depth)];
  // Endless depths (beyond the last main biome) may revisit any region; normal depths only accept their own.
  const endless = depth > BIOMES.length;
  const alt = id ? ALL_BIOMES.find((b) => b.id === id && (endless || b.depth === depth)) : undefined;
  return alt ?? BIOMES[Math.max(0, Math.min(BIOMES.length - 1, depth - 1))];
}
