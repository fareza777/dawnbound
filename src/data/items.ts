import type { L10n } from '@/core/i18n';
import type { Mod, StatKey } from './stats';
import type { EffectRef, Slot } from './types';

export type WeaponType = 'sword' | 'axe' | 'dagger' | 'spear' | 'staff' | 'hammer';

export interface ItemBase {
  id: string;
  slot: Slot;
  tier: number;
  name: L10n;
  weaponType?: WeaponType;
  implicit: Mod[];
  icon: string;
}

const TIER_WORDS: L10n[] = [
  { en: 'Rusty', id: 'Karatan' },
  { en: 'Iron', id: 'Besi' },
  { en: 'Steel', id: 'Baja' },
  { en: 'Knight\'s', id: 'Ksatria' },
  { en: 'Moonsteel', id: 'Baja Bulan' },
  { en: 'Runic', id: 'Rune' },
  { en: 'Dawnforged', id: 'Tempaan Fajar' },
  { en: 'Starfall', id: 'Bintang Jatuh' },
];

interface BaseLine {
  slot: Slot;
  weaponType?: WeaponType;
  names: [string, string][];
  implicit: (tier: number) => Mod[];
}

const m = (stat: StatKey, type: Mod['type'], value: number): Mod => ({ stat, type, value: Math.round(value * 10) / 10 });

/** atk grows ~ geometric so late tiers matter. */
const atkAt = (t: number, mul: number) => Math.round((4 + t * 3.2 + t * t * 0.55) * mul);
const defAt = (t: number, mul: number) => Math.round((3 + t * 3 + t * t * 0.45) * mul);
const hpAt = (t: number, mul: number) => Math.round((12 + t * 10 + t * t * 1.6) * mul);

const LINES: BaseLine[] = [
  {
    slot: 'weapon', weaponType: 'sword',
    names: [['Rusty Blade', 'Pedang Karatan'], ['Iron Sword', 'Pedang Besi'], ['Steel Longsword', 'Pedang Panjang Baja'], ['Knight\'s Falchion', 'Falchion Ksatria'], ['Moonsteel Saber', 'Sabel Baja Bulan'], ['Runeblade', 'Pedang Rune'], ['Dawnforged Sword', 'Pedang Tempaan Fajar'], ['Starfall Edge', 'Mata Bintang Jatuh']],
    implicit: (t) => [m('atk', 'flat', atkAt(t, 1)), m('critChance', 'pct', 3)],
  },
  {
    slot: 'weapon', weaponType: 'axe',
    names: [['Hatchet', 'Kapak Kecil'], ['Iron Axe', 'Kapak Besi'], ['Bearded Axe', 'Kapak Janggut'], ['War Axe', 'Kapak Perang'], ['Moonsteel Cleaver', 'Golok Baja Bulan'], ['Runic Greataxe', 'Kapak Besar Rune'], ['Dawnforged Axe', 'Kapak Tempaan Fajar'], ['Worldsplitter', 'Pembelah Dunia']],
    implicit: (t) => [m('atk', 'flat', atkAt(t, 1.2)), m('critDmg', 'pct', 20), m('atkSpeed', 'pct', -6)],
  },
  {
    slot: 'weapon', weaponType: 'dagger',
    names: [['Shiv', 'Pisau Kecil'], ['Iron Dagger', 'Belati Besi'], ['Stiletto', 'Stiletto'], ['Assassin\'s Kris', 'Keris Pembunuh'], ['Moonsteel Fang', 'Taring Baja Bulan'], ['Rune Dirk', 'Belati Rune'], ['Dawnforged Kris', 'Keris Tempaan Fajar'], ['Nightwhisper', 'Bisikan Malam']],
    implicit: (t) => [m('atk', 'flat', atkAt(t, 0.8)), m('atkSpeed', 'pct', 12), m('critChance', 'pct', 5)],
  },
  {
    slot: 'weapon', weaponType: 'spear',
    names: [['Wooden Spear', 'Tombak Kayu'], ['Iron Spear', 'Tombak Besi'], ['Pike', 'Pike'], ['Halberd', 'Halberd'], ['Moonsteel Glaive', 'Glaive Baja Bulan'], ['Rune Lance', 'Lembing Rune'], ['Dawnforged Spear', 'Tombak Tempaan Fajar'], ['Skypiercer', 'Penembus Langit']],
    implicit: (t) => [m('atk', 'flat', atkAt(t, 1.05)), m('range', 'pct', 10)],
  },
  {
    slot: 'weapon', weaponType: 'staff',
    names: [['Walking Stick', 'Tongkat Jalan'], ['Oak Staff', 'Tongkat Ek'], ['Crystal Rod', 'Batang Kristal'], ['Sage\'s Staff', 'Tongkat Resi'], ['Moonsteel Scepter', 'Tongkat Kerajaan Baja Bulan'], ['Rune Staff', 'Tongkat Rune'], ['Dawnforged Staff', 'Tongkat Tempaan Fajar'], ['Starcaller', 'Pemanggil Bintang']],
    implicit: (t) => [m('atk', 'flat', atkAt(t, 0.95)), m('skillDmg', 'pct', 15), m('cdr', 'pct', 5)],
  },
  {
    slot: 'weapon', weaponType: 'hammer',
    names: [['Mallet', 'Palu Kayu'], ['Iron Mace', 'Gada Besi'], ['Warhammer', 'Palu Perang'], ['Morning Star', 'Bintang Pagi'], ['Moonsteel Maul', 'Godam Baja Bulan'], ['Rune Hammer', 'Palu Rune'], ['Dawnforged Maul', 'Godam Tempaan Fajar'], ['Earthshaker', 'Pengguncang Bumi']],
    implicit: (t) => [m('atk', 'flat', atkAt(t, 1.3)), m('knockback', 'pct', 40), m('areaSize', 'pct', 10), m('atkSpeed', 'pct', -10)],
  },
  {
    slot: 'helm',
    names: [['Leather Cap', 'Topi Kulit'], ['Iron Helm', 'Helm Besi'], ['Chain Coif', 'Tudung Rantai'], ['Knight Helm', 'Helm Ksatria'], ['Moonsteel Visor', 'Visor Baja Bulan'], ['Rune Crown', 'Mahkota Rune'], ['Dawnforged Helm', 'Helm Tempaan Fajar'], ['Halo of Stars', 'Lingkar Bintang']],
    implicit: (t) => [m('def', 'flat', defAt(t, 0.6)), m('maxHp', 'flat', hpAt(t, 0.5))],
  },
  {
    slot: 'armor',
    names: [['Padded Tunic', 'Tunik Berlapis'], ['Leather Armor', 'Zirah Kulit'], ['Chainmail', 'Zirah Rantai'], ['Plate Armor', 'Zirah Pelat'], ['Moonsteel Cuirass', 'Kuiras Baja Bulan'], ['Rune Mail', 'Zirah Rune'], ['Dawnforged Plate', 'Pelat Tempaan Fajar'], ['Aegis of Dawn', 'Aegis Fajar']],
    implicit: (t) => [m('def', 'flat', defAt(t, 1)), m('maxHp', 'flat', hpAt(t, 1))],
  },
  {
    slot: 'boots',
    names: [['Sandals', 'Sandal'], ['Leather Boots', 'Sepatu Kulit'], ['Iron Greaves', 'Pelindung Kaki Besi'], ['Ranger Boots', 'Sepatu Penjelajah'], ['Moonsteel Sabatons', 'Sabaton Baja Bulan'], ['Rune Striders', 'Langkah Rune'], ['Dawnforged Boots', 'Sepatu Tempaan Fajar'], ['Windwalkers', 'Penjejak Angin']],
    implicit: (t) => [m('moveSpeed', 'pct', 3 + t), m('def', 'flat', defAt(t, 0.4))],
  },
  {
    slot: 'ring',
    names: [['Copper Band', 'Cincin Tembaga'], ['Silver Ring', 'Cincin Perak'], ['Gold Ring', 'Cincin Emas'], ['Sapphire Ring', 'Cincin Safir'], ['Moonstone Ring', 'Cincin Batu Bulan'], ['Rune Signet', 'Cincin Segel Rune'], ['Dawn Ring', 'Cincin Fajar'], ['Band of Eternity', 'Cincin Keabadian']],
    implicit: (t) => [m('critChance', 'pct', 2 + t * 0.6), m('atk', 'flat', Math.round(atkAt(t, 0.25)))],
  },
  {
    slot: 'amulet',
    names: [['Wooden Pendant', 'Liontin Kayu'], ['Silver Locket', 'Loket Perak'], ['Amber Amulet', 'Jimat Ambar'], ['Jade Talisman', 'Jimat Giok'], ['Moonstone Amulet', 'Jimat Batu Bulan'], ['Rune Pendant', 'Liontin Rune'], ['Dawn Locket', 'Loket Fajar'], ['Heart of Aurelle', 'Jantung Aurelle']],
    implicit: (t) => [m('maxHp', 'flat', hpAt(t, 0.45)), m('luck', 'flat', 2 + t)],
  },
  {
    slot: 'charm',
    names: [['Lucky Coin', 'Koin Keberuntungan'], ['Rabbit Foot', 'Kaki Kelinci'], ['Glass Eye', 'Mata Kaca'], ['Spirit Bell', 'Lonceng Roh'], ['Moon Totem', 'Totem Bulan'], ['Rune Stone', 'Batu Rune'], ['Ember Idol', 'Berhala Bara'], ['Sunshard', 'Serpih Surya']],
    implicit: (t) => [m('goldFind', 'pct', 5 + t * 3), m('magicFind', 'pct', 5 + t * 3), m('xpGain', 'pct', 3 + t * 2)],
  },
];

export const ITEM_BASES: ItemBase[] = LINES.flatMap((line) =>
  line.names.map(([en, idn], i) => {
    const tier = i + 1;
    const key = line.weaponType ?? line.slot;
    return {
      id: `${key}_${tier}`,
      slot: line.slot,
      tier,
      name: { en, id: idn },
      weaponType: line.weaponType,
      implicit: line.implicit(tier),
      icon: `icons_item_${key}_${tier}`,
    };
  }),
);

export const TIER_NAMES = TIER_WORDS;

// ------------------------------------------------------------------------- affixes
export interface AffixDef {
  id: string;
  kind: 'prefix' | 'suffix';
  stat: StatKey;
  type: Mod['type'];
  /** Value range at tier 1 and tier 8, interpolated by item level. */
  min: [number, number];
  max: [number, number];
  slots: Slot[] | 'all';
  weight: number;
  name: L10n;
}

const ALL: 'all' = 'all';
const ARMORS: Slot[] = ['helm', 'armor', 'boots'];
const JEWEL: Slot[] = ['ring', 'amulet', 'charm'];

export const AFFIXES: AffixDef[] = [
  { id: 'a_atk_flat', kind: 'prefix', stat: 'atk', type: 'flat', min: [1, 10], max: [4, 26], slots: ['weapon', 'ring', 'amulet'], weight: 10, name: { en: 'Sharp', id: 'Tajam' } },
  { id: 'a_atk_pct', kind: 'prefix', stat: 'atk', type: 'pct', min: [3, 10], max: [7, 22], slots: ALL, weight: 8, name: { en: 'Vicious', id: 'Ganas' } },
  { id: 'a_hp_flat', kind: 'prefix', stat: 'maxHp', type: 'flat', min: [6, 40], max: [15, 90], slots: ALL, weight: 10, name: { en: 'Stalwart', id: 'Teguh' } },
  { id: 'a_hp_pct', kind: 'prefix', stat: 'maxHp', type: 'pct', min: [3, 8], max: [6, 16], slots: [...ARMORS, 'amulet'], weight: 6, name: { en: 'Hale', id: 'Bugar' } },
  { id: 'a_def', kind: 'prefix', stat: 'def', type: 'flat', min: [2, 14], max: [6, 34], slots: [...ARMORS, 'ring'], weight: 9, name: { en: 'Warded', id: 'Terlindung' } },
  { id: 'a_crit', kind: 'suffix', stat: 'critChance', type: 'pct', min: [1, 4], max: [3, 9], slots: ['weapon', 'ring', 'amulet', 'helm'], weight: 8, name: { en: 'of Precision', id: 'Ketepatan' } },
  { id: 'a_critdmg', kind: 'suffix', stat: 'critDmg', type: 'pct', min: [6, 20], max: [14, 45], slots: ['weapon', 'amulet', 'ring'], weight: 7, name: { en: 'of Ruin', id: 'Kehancuran' } },
  { id: 'a_aspd', kind: 'suffix', stat: 'atkSpeed', type: 'pct', min: [3, 8], max: [6, 16], slots: ['weapon', 'ring', 'armor'], weight: 7, name: { en: 'of Haste', id: 'Ketergesaan' } },
  { id: 'a_mspd', kind: 'suffix', stat: 'moveSpeed', type: 'pct', min: [2, 6], max: [5, 12], slots: ['boots', 'charm', 'amulet'], weight: 7, name: { en: 'of the Wind', id: 'Angin' } },
  { id: 'a_life', kind: 'suffix', stat: 'lifesteal', type: 'pct', min: [0.5, 2], max: [1.5, 4], slots: ['weapon', 'ring', 'amulet'], weight: 4, name: { en: 'of the Leech', id: 'Lintah' } },
  { id: 'a_regen', kind: 'suffix', stat: 'regen', type: 'flat', min: [0.2, 1], max: [0.5, 2.5], slots: [...ARMORS, 'amulet'], weight: 5, name: { en: 'of Renewal', id: 'Pembaruan' } },
  { id: 'a_cdr', kind: 'suffix', stat: 'cdr', type: 'pct', min: [2, 6], max: [5, 12], slots: ['helm', 'amulet', 'charm', 'weapon'], weight: 5, name: { en: 'of Focus', id: 'Fokus' } },
  { id: 'a_dodge', kind: 'suffix', stat: 'dodge', type: 'pct', min: [1, 3], max: [3, 7], slots: ['boots', 'armor', 'charm'], weight: 4, name: { en: 'of Evasion', id: 'Kelit' } },
  { id: 'a_dr', kind: 'suffix', stat: 'dmgReduction', type: 'pct', min: [1, 3], max: [3, 7], slots: ['armor', 'helm'], weight: 4, name: { en: 'of the Bulwark', id: 'Benteng' } },
  { id: 'a_luck', kind: 'suffix', stat: 'luck', type: 'flat', min: [2, 8], max: [5, 18], slots: JEWEL, weight: 5, name: { en: 'of Fortune', id: 'Keberuntungan' } },
  { id: 'a_gold', kind: 'suffix', stat: 'goldFind', type: 'pct', min: [5, 15], max: [12, 35], slots: [...JEWEL, 'helm'], weight: 5, name: { en: 'of Greed', id: 'Keserakahan' } },
  { id: 'a_mf', kind: 'suffix', stat: 'magicFind', type: 'pct', min: [5, 15], max: [12, 35], slots: [...JEWEL, 'helm'], weight: 5, name: { en: 'of Discovery', id: 'Penemuan' } },
  { id: 'a_skill', kind: 'prefix', stat: 'skillDmg', type: 'pct', min: [5, 15], max: [12, 35], slots: ['weapon', 'helm', 'amulet'], weight: 5, name: { en: 'Mystic', id: 'Mistis' } },
  { id: 'a_fire', kind: 'prefix', stat: 'fireDmg', type: 'pct', min: [5, 15], max: [12, 35], slots: ['weapon', 'ring', 'amulet', 'charm'], weight: 4, name: { en: 'Blazing', id: 'Membara' } },
  { id: 'a_ice', kind: 'prefix', stat: 'iceDmg', type: 'pct', min: [5, 15], max: [12, 35], slots: ['weapon', 'ring', 'amulet', 'charm'], weight: 4, name: { en: 'Frozen', id: 'Membeku' } },
  { id: 'a_shock', kind: 'prefix', stat: 'shockDmg', type: 'pct', min: [5, 15], max: [12, 35], slots: ['weapon', 'ring', 'amulet', 'charm'], weight: 4, name: { en: 'Charged', id: 'Bermuatan' } },
  { id: 'a_poison', kind: 'prefix', stat: 'poisonDmg', type: 'pct', min: [5, 15], max: [12, 35], slots: ['weapon', 'ring', 'amulet', 'charm'], weight: 4, name: { en: 'Venomous', id: 'Berbisa' } },
  { id: 'a_holy', kind: 'prefix', stat: 'holyDmg', type: 'pct', min: [5, 15], max: [12, 35], slots: ['weapon', 'ring', 'amulet', 'charm'], weight: 4, name: { en: 'Hallowed', id: 'Suci' } },
  { id: 'a_shadow', kind: 'prefix', stat: 'shadowDmg', type: 'pct', min: [5, 15], max: [12, 35], slots: ['weapon', 'ring', 'amulet', 'charm'], weight: 4, name: { en: 'Umbral', id: 'Kelam' } },
  { id: 'a_burn', kind: 'suffix', stat: 'burnChance', type: 'pct', min: [3, 8], max: [7, 18], slots: ['weapon', 'ring'], weight: 3, name: { en: 'of Cinders', id: 'Arang' } },
  { id: 'a_chill', kind: 'suffix', stat: 'chillChance', type: 'pct', min: [3, 8], max: [7, 18], slots: ['weapon', 'ring'], weight: 3, name: { en: 'of Frost', id: 'Embun Beku' } },
  { id: 'a_shockc', kind: 'suffix', stat: 'shockChance', type: 'pct', min: [3, 8], max: [7, 18], slots: ['weapon', 'ring'], weight: 3, name: { en: 'of Storms', id: 'Badai' } },
  { id: 'a_poisonc', kind: 'suffix', stat: 'poisonChance', type: 'pct', min: [3, 8], max: [7, 18], slots: ['weapon', 'ring'], weight: 3, name: { en: 'of Blight', id: 'Hawar' } },
  { id: 'a_bleed', kind: 'suffix', stat: 'bleedChance', type: 'pct', min: [3, 8], max: [7, 18], slots: ['weapon', 'ring'], weight: 3, name: { en: 'of Wounding', id: 'Melukai' } },
  { id: 'a_thorns', kind: 'suffix', stat: 'thorns', type: 'flat', min: [3, 15], max: [8, 35], slots: ['armor', 'helm'], weight: 3, name: { en: 'of Thorns', id: 'Duri' } },
  { id: 'a_boss', kind: 'suffix', stat: 'bossDmg', type: 'pct', min: [4, 10], max: [8, 22], slots: ['weapon', 'amulet'], weight: 3, name: { en: 'of Giantslaying', id: 'Pembunuh Raksasa' } },
  { id: 'a_potion', kind: 'suffix', stat: 'potionPower', type: 'pct', min: [8, 20], max: [15, 40], slots: ['amulet', 'charm', 'armor'], weight: 3, name: { en: 'of the Apothecary', id: 'Apoteker' } },
  { id: 'a_xp', kind: 'suffix', stat: 'xpGain', type: 'pct', min: [5, 10], max: [10, 25], slots: ['helm', 'charm'], weight: 3, name: { en: 'of Learning', id: 'Pembelajaran' } },
  { id: 'a_area', kind: 'suffix', stat: 'areaSize', type: 'pct', min: [4, 10], max: [8, 20], slots: ['weapon', 'amulet'], weight: 3, name: { en: 'of Reach', id: 'Jangkauan' } },
  { id: 'a_heal_kill', kind: 'suffix', stat: 'healOnKill', type: 'flat', min: [1, 2], max: [1, 4], slots: ['weapon', 'ring'], weight: 3, name: { en: 'of Feasting', id: 'Pesta' } },
  { id: 'a_shield', kind: 'suffix', stat: 'shieldOnRoom', type: 'flat', min: [5, 20], max: [10, 45], slots: ['armor', 'helm', 'amulet'], weight: 3, name: { en: 'of Warding', id: 'Penangkal' } },
  { id: 'a_flare', kind: 'suffix', stat: 'flareGain', type: 'pct', min: [6, 15], max: [12, 30], slots: ['charm', 'amulet', 'helm'], weight: 3, name: { en: 'of the Lantern', id: 'Lentera' } },
  { id: 'a_status', kind: 'prefix', stat: 'statusPower', type: 'flat', min: [5, 15], max: [12, 35], slots: ['weapon', 'amulet', 'charm'], weight: 3, name: { en: 'Pestilent', id: 'Pembawa Wabah' } },
];

// ------------------------------------------------------------------------- uniques & sets
export interface UniqueDef {
  id: string;
  baseId: string;
  name: L10n;
  flavor: L10n;
  power: L10n;
  mods: Mod[];
  effects: EffectRef[];
  /** Minimum depth to drop. */
  minDepth: number;
  mythic?: boolean;
  bossOnly?: string;
}

const um = (...list: [StatKey, Mod['type'], number][]): Mod[] => list.map(([s, t, v]) => m(s, t, v));
const e = (id: string, ...p: number[]): EffectRef => ({ id, p });
function u(id: string, baseId: string, en: string, idn: string, fEn: string, fId: string, pEn: string, pId: string, mods: Mod[], effects: EffectRef[], minDepth = 1, extra: Partial<UniqueDef> = {}): UniqueDef {
  return { id, baseId, name: { en, id: idn }, flavor: { en: fEn, id: fId }, power: { en: pEn, id: pId }, mods, effects, minDepth, ...extra };
}

export const UNIQUES: UniqueDef[] = [
  u('u_maren_blade', 'sword_2', 'Maren\'s Last Light', 'Cahaya Terakhir Maren', 'She held the dark back with this. Now so do you.', 'Dengan ini dia menahan kegelapan. Kini giliranmu.', 'Attacks release a small light wave (40% ATK).', 'Serangan melepaskan gelombang cahaya kecil (40% ATK).', um(['atk', 'pct', 15], ['holyDmg', 'pct', 20]), [e('light_wave', 40)], 1),
  u('u_thornfang', 'dagger_2', 'Thornfang', 'Taring Duri', 'Carved from Whisperwood\'s oldest bramble.', 'Diukir dari semak tertua Hutan Bisikan.', 'Poison stacks twice per hit.', 'Racun menumpuk dua kali per pukulan.', um(['poisonChance', 'pct', 25], ['atkSpeed', 'pct', 10]), [e('double_poison', 1)], 1),
  u('u_gorehorn_axe', 'axe_3', 'Gorehorn\'s Cleaver', 'Golok Gorehorn', 'Still smells of the Warden\'s rage.', 'Masih berbau amarah sang Penjaga.', 'Dash through enemies to gore them (150% ATK).', 'Dash menembus musuh untuk menanduk mereka (150% ATK).', um(['atk', 'pct', 20], ['critDmg', 'pct', 25]), [e('dash_hit', 150)], 1, { bossOnly: 'gorehorn' }),
  u('u_mossheart', 'amulet_2', 'Mossheart', 'Hati Lumut', 'It beats. Slowly.', 'Ia berdetak. Perlahan.', 'Regenerate 2% Max HP per second out of combat... and 0.5% in it.', 'Regenerasi 2% HP Maks per detik di luar pertarungan... dan 0,5% di dalamnya.', um(['maxHp', 'pct', 12]), [e('moss_regen', 0.5)], 1),
  u('u_wasp_ring', 'ring_2', 'Queen\'s Sting', 'Sengat Ratu', 'The hive remembers its queen.', 'Sarang mengingat ratunya.', 'Crits summon a wasp that fights for 6s.', 'Kritis memanggil tawon yang bertarung selama 6 dtk.', um(['critChance', 'pct', 6]), [e('crit_wasp', 1)], 1),
  u('u_boots_hare', 'boots_2', 'Boots of the Hare', 'Sepatu Kelinci', 'Somewhere a hare is very cold.', 'Di suatu tempat seekor kelinci kedinginan.', '+1 Dash charge, dash recharges 25% faster.', '+1 muatan Dash, dash terisi 25% lebih cepat.', um(['dashCharges', 'flat', 1], ['moveSpeed', 'pct', 8]), [e('dash_recharge', 25)], 1),
  u('u_lucky_coin', 'charm_1', 'Pip\'s Lucky Penny', 'Koin Keberuntungan Pip', 'Pip swears he didn\'t lose it on purpose.', 'Pip bersumpah tidak sengaja menghilangkannya.', 'Enemies have a 3% chance to drop an extra item.', 'Musuh berpeluang 3% menjatuhkan item tambahan.', um(['luck', 'flat', 20], ['goldFind', 'pct', 40]), [e('bonus_drop', 3)], 1),
  u('u_bone_crown', 'helm_3', 'Crown of the Bone King', 'Mahkota Raja Tulang', 'The dead bow to whoever wears it.', 'Orang mati tunduk pada pemakainya.', 'Killed enemies have 15% chance to rise as your skeleton ally.', 'Musuh yang terbunuh berpeluang 15% bangkit sebagai sekutu tengkorakmu.', um(['def', 'flat', 15], ['maxHp', 'flat', 40]), [e('raise_dead', 15)], 2),
  u('u_ghost_veil', 'armor_3', 'Veil of the Drowned', 'Selubung Si Tenggelam', 'Damp. Always damp.', 'Lembap. Selalu lembap.', '20% chance to phase through attacks.', '20% peluang menembus serangan.', um(['dodge', 'pct', 20], ['maxHp', 'pct', 10]), [], 2),
  u('u_lamia_fang', 'spear_3', 'Sisters\' Fang', 'Taring Para Saudari', 'Twin venom, twin sorrow.', 'Racun kembar, duka kembar.', 'Thrusts hit twice. Poison chance +30%.', 'Tusukan mengenai dua kali. Peluang racun +30%.', um(['poisonChance', 'pct', 30], ['atk', 'pct', 15]), [e('double_hit', 50)], 2, { bossOnly: 'twin_lamias' }),
  u('u_lantern_charm', 'charm_3', 'Lantern of the First Keeper', 'Lentera Penjaga Pertama', 'The flame inside has never gone out.', 'Api di dalamnya tak pernah padam.', 'Revive once per run with 50% HP.', 'Bangkit sekali per run dengan 50% HP.', um(['flareGain', 'pct', 30]), [e('second_wind', 50)], 2),
  u('u_chanter_staff', 'staff_3', 'Grave Chanter\'s Rod', 'Tongkat Pelantun Kubur', 'Hum it, and the dead hum back.', 'Senandungkan, dan orang mati ikut bersenandung.', 'Skill summons 2 spectral skulls that seek enemies.', 'Skill memanggil 2 tengkorak roh yang mengejar musuh.', um(['skillDmg', 'pct', 30], ['shadowDmg', 'pct', 20]), [e('skill_skulls', 2)], 2),
  u('u_vamp_ring', 'ring_3', 'Blood Signet', 'Segel Darah', 'Warm to the touch. Warmer after battle.', 'Hangat saat disentuh. Lebih hangat setelah bertempur.', '+6% Lifesteal. Kills heal 2.', '+6% Curi Nyawa. Membunuh memulihkan 2.', um(['lifesteal', 'pct', 6], ['healOnKill', 'flat', 2]), [], 2),
  u('u_sunspear', 'spear_4', 'Sunspear of Azhar', 'Tombak Surya Azhar', 'The djinn\'s prison key, bent into a weapon.', 'Kunci penjara sang jin, dibengkokkan menjadi senjata.', 'Attacks burn. Burning enemies take +25% damage.', 'Serangan membakar. Musuh terbakar menerima +25% damage.', um(['burnChance', 'pct', 100], ['fireDmg', 'pct', 30]), [e('burn_vuln', 25)], 3, { bossOnly: 'azhar' }),
  u('u_desert_wind', 'boots_4', 'Sirocco Striders', 'Langkah Angin Gurun', 'They leave no footprints.', 'Tak meninggalkan jejak.', 'Dashing grants 50% evasion for 1s.', 'Dash memberi 50% menghindar selama 1 dtk.', um(['moveSpeed', 'pct', 14], ['dodge', 'pct', 6]), [e('dash_evasion', 50)], 3),
  u('u_scorpion_tail', 'dagger_4', 'Sethar\'s Stinger', 'Sengat Sethar', 'The Scorpion King\'s last gift.', 'Hadiah terakhir Raja Kalajengking.', 'Crits apply 3 Poison stacks.', 'Kritis memberi 3 tumpukan Racun.', um(['critChance', 'pct', 10], ['poisonDmg', 'pct', 35]), [e('crit_poison', 3)], 3),
  u('u_mirage', 'amulet_4', 'Mirage Pendant', 'Liontin Fatamorgana', 'Is it even there?', 'Apakah ia benar-benar ada?', 'When hit, 30% chance to leave a decoy and teleport.', 'Saat terkena, 30% peluang meninggalkan umpan dan berteleportasi.', um(['dodge', 'pct', 10], ['maxHp', 'flat', 50]), [e('mirage', 30)], 3),
  u('u_golden_hammer', 'hammer_4', 'The Gilded Ruin', 'Kehancuran Berlapis Emas', 'Every blow scatters coins.', 'Setiap pukulan menghamburkan koin.', 'Hits have 10% chance to drop gold. +1% dmg per 30 gold.', 'Pukulan berpeluang 10% menjatuhkan emas. +1% damage per 30 emas.', um(['atk', 'pct', 25], ['goldFind', 'pct', 50]), [e('hit_gold', 10), e('gold_dmg', 30, 50)], 3),
  u('u_frost_crown', 'helm_5', 'Vesper\'s Diadem', 'Diadem Vesper', 'She loved once. It froze.', 'Dia pernah mencinta. Cinta itu membeku.', 'Enemies near you are Chilled. Frozen enemies take +40% damage.', 'Musuh di dekatmu Membeku. Musuh beku menerima +40% damage.', um(['iceDmg', 'pct', 40], ['cdr', 'pct', 10]), [e('frost_aura', 50), e('shatter', 40)], 4, { bossOnly: 'vesper' }),
  u('u_glacier_plate', 'armor_5', 'Glacier Plate', 'Pelat Gletser', 'Colder than the mountain it came from.', 'Lebih dingin dari gunung asalnya.', 'Immune to Chill. Attackers are Frozen.', 'Kebal Beku. Penyerang menjadi Beku.', um(['def', 'flat', 40], ['dmgReduction', 'pct', 10]), [e('immune_chill', 1), e('freeze_attackers', 1)], 4),
  u('u_choir_bell', 'charm_5', 'Choir Bell', 'Lonceng Paduan Suara', 'Ring it and something sings back.', 'Bunyikan dan sesuatu bernyanyi membalas.', 'Every 8s, emit a hymn that stuns nearby enemies.', 'Tiap 8 dtk, keluarkan kidung yang membuat musuh sekitar pingsan.', um(['cdr', 'pct', 12], ['holyDmg', 'pct', 25]), [e('hymn', 8)], 4),
  u('u_starcaller', 'staff_5', 'Elio\'s First Star', 'Bintang Pertama Elio', 'The book said stars could be caught. It was right.', 'Buku itu bilang bintang bisa ditangkap. Buku itu benar.', '+2 projectiles. Projectiles home.', '+2 proyektil. Proyektil mengejar.', um(['extraProjectiles', 'flat', 2], ['skillDmg', 'pct', 20]), [e('homing', 3)], 4),
  u('u_stormbreaker', 'hammer_5', 'Stormbreaker', 'Pemecah Badai', 'Forged in a thunderbolt. Allegedly.', 'Ditempa dalam sambaran petir. Katanya.', 'Every 3rd hit calls lightning (120% ATK).', 'Setiap pukulan ke-3 memanggil petir (120% ATK).', um(['shockDmg', 'pct', 40], ['atk', 'pct', 20]), [e('chain_lightning', 120, 3, 4)], 4),
  u('u_hollow_crown', 'helm_6', 'Crown of the Hollow King', 'Mahkota Raja Hampa', 'It whispers your name. Your real name.', 'Ia membisikkan namamu. Nama aslimu.', '+60% ATK. -30% Max HP. Kills heal 4.', '+60% ATK. -30% HP Maks. Membunuh memulihkan 4.', um(['atk', 'more', 60], ['maxHp', 'more', -30], ['healOnKill', 'flat', 4]), [], 5, { bossOnly: 'malachar', mythic: true }),
  u('u_dawnblade', 'sword_7', 'Dawnbreaker', 'Pemecah Fajar', 'The sun, sharpened.', 'Matahari, diasah.', 'Attacks release light waves (70% ATK). Flare charges twice as fast.', 'Serangan melepaskan gelombang cahaya (70% ATK). Flare terisi dua kali lebih cepat.', um(['atk', 'pct', 30], ['flareGain', 'pct', 100]), [e('light_wave', 70)], 5, { mythic: true }),
  u('u_void_dagger', 'dagger_6', 'Voidfang', 'Taring Hampa', 'Cuts the space between moments.', 'Memotong ruang antar momen.', 'Crits deal +100% damage to enemies below 50% HP.', 'Kritis +100% damage ke musuh di bawah 50% HP.', um(['critChance', 'pct', 15], ['critDmg', 'pct', 50]), [e('crit_low_hp', 100)], 5),
  u('u_magma_boots', 'boots_6', 'Magma Treads', 'Tapak Magma', 'Leave a trail. Of fire.', 'Tinggalkan jejak. Dari api.', 'Moving leaves burning footprints (40% ATK/s).', 'Bergerak meninggalkan jejak api (40% ATK/dtk).', um(['moveSpeed', 'pct', 15], ['fireDmg', 'pct', 30]), [e('ember_trail_walk', 40)], 5),
  u('u_worldheart', 'amulet_7', 'Worldheart', 'Jantung Dunia', 'Aurelle itself, beating in your hand.', 'Aurelle itu sendiri, berdetak di tanganmu.', '+25% all stats.', '+25% semua statistik.', um(['maxHp', 'pct', 25], ['atk', 'pct', 25], ['def', 'pct', 25], ['critChance', 'pct', 5]), [], 5, { mythic: true }),
  u('u_eternity', 'ring_7', 'Band of Endless Dawn', 'Cincin Fajar Abadi', 'Time forgets whoever wears it.', 'Waktu melupakan pemakainya.', 'Skill cooldown resets on kill 10% of the time.', 'Cooldown skill direset saat membunuh (10%).', um(['cdr', 'pct', 20], ['skillDmg', 'pct', 40]), [e('kill_skill_reset', 10)], 5),
  u('u_earthshaker', 'hammer_7', 'Heart of the Mountain', 'Jantung Gunung', 'The ground remembers every blow.', 'Tanah mengingat setiap pukulan.', 'Every 4th attack creates a shockwave (150% ATK).', 'Setiap serangan ke-4 menciptakan gelombang kejut (150% ATK).', um(['atk', 'pct', 35], ['areaSize', 'pct', 25]), [e('quake', 150, 4)], 5),
];

export interface SetDef {
  id: string;
  name: L10n;
  pieces: { baseId: string; name: L10n }[];
  bonus2: { desc: L10n; mods: Mod[]; effects: EffectRef[] };
  bonus4: { desc: L10n; mods: Mod[]; effects: EffectRef[] };
  minDepth: number;
}

function set(id: string, en: string, idn: string, minDepth: number, pieces: [string, string, string][], b2: [string, string, Mod[], EffectRef[]], b4: [string, string, Mod[], EffectRef[]]): SetDef {
  return {
    id, name: { en, id: idn }, minDepth,
    pieces: pieces.map(([baseId, pen, pid]) => ({ baseId, name: { en: pen, id: pid } })),
    bonus2: { desc: { en: b2[0], id: b2[1] }, mods: b2[2], effects: b2[3] },
    bonus4: { desc: { en: b4[0], id: b4[1] }, mods: b4[2], effects: b4[3] },
  };
}

export const SETS: SetDef[] = [
  set('set_warden', 'Warden\'s Oath', 'Sumpah Penjaga', 1,
    [['helm_2', 'Warden\'s Helm', 'Helm Penjaga'], ['armor_2', 'Warden\'s Hauberk', 'Zirah Penjaga'], ['boots_2', 'Warden\'s Greaves', 'Pelindung Kaki Penjaga'], ['amulet_2', 'Warden\'s Seal', 'Segel Penjaga']],
    ['+20% Max HP.', '+20% HP Maks.', um(['maxHp', 'pct', 20]), []],
    ['Taking damage releases a shockwave (150% ATK).', 'Menerima damage melepaskan gelombang kejut (150% ATK).', [], [e('retaliate', 150)]]),
  set('set_nightstalker', 'Nightstalker', 'Pengintai Malam', 2,
    [['dagger_3', 'Nightstalker Fang', 'Taring Pengintai'], ['helm_3', 'Nightstalker Hood', 'Tudung Pengintai'], ['boots_3', 'Nightstalker Treads', 'Tapak Pengintai'], ['ring_3', 'Nightstalker Loop', 'Cincin Pengintai']],
    ['+10% Crit Chance.', '+10% Peluang Kritis.', um(['critChance', 'pct', 10]), []],
    ['After dashing, your next attack crits for +100%.', 'Setelah dash, serangan berikutnya kritis +100%.', [], [e('dash_empower', 100)]]),
  set('set_pyromancer', 'Pyromancer\'s Regalia', 'Kebesaran Ahli Api', 2,
    [['staff_3', 'Pyromancer\'s Rod', 'Tongkat Ahli Api'], ['helm_3', 'Pyromancer\'s Hood', 'Tudung Ahli Api'], ['armor_3', 'Pyromancer\'s Robe', 'Jubah Ahli Api'], ['charm_3', 'Pyromancer\'s Ember', 'Bara Ahli Api']],
    ['+30% Fire damage, +20% Burn chance.', '+30% damage Api, +20% peluang Bakar.', um(['fireDmg', 'pct', 30], ['burnChance', 'pct', 20]), []],
    ['Burning enemies explode on death (160% ATK).', 'Musuh terbakar meledak saat mati (160% ATK).', [], [e('burn_explode', 160)]]),
  set('set_glacier', 'Glacial Vigil', 'Penjagaan Gletser', 3,
    [['spear_4', 'Glacial Pike', 'Pike Gletser'], ['helm_4', 'Glacial Crown', 'Mahkota Gletser'], ['armor_4', 'Glacial Mail', 'Zirah Gletser'], ['boots_4', 'Glacial Striders', 'Langkah Gletser']],
    ['+30% Frost damage, +20% Chill chance.', '+30% damage Es, +20% peluang Beku.', um(['iceDmg', 'pct', 30], ['chillChance', 'pct', 20]), []],
    ['Frozen enemies take +50% damage and shatter.', 'Musuh beku menerima +50% damage dan pecah.', [], [e('shatter', 50)]]),
  set('set_tempest', 'Stormrider', 'Penunggang Badai', 3,
    [['sword_4', 'Stormrider Blade', 'Pedang Penunggang Badai'], ['boots_4', 'Stormrider Boots', 'Sepatu Penunggang Badai'], ['ring_4', 'Stormrider Band', 'Cincin Penunggang Badai'], ['amulet_4', 'Stormrider Charm', 'Jimat Penunggang Badai']],
    ['+15% Attack and Move speed.', '+15% Kecepatan Serang dan Gerak.', um(['atkSpeed', 'pct', 15], ['moveSpeed', 'pct', 15]), []],
    ['Lightning strikes a foe every 2.5s (180% ATK).', 'Petir menyambar musuh tiap 2,5 dtk (180% ATK).', [], [e('thunder_strike', 180, 2.5)]]),
  set('set_plague', 'Plaguebearer', 'Pembawa Wabah', 3,
    [['axe_4', 'Plague Axe', 'Kapak Wabah'], ['helm_4', 'Plague Mask', 'Topeng Wabah'], ['armor_4', 'Plague Coat', 'Mantel Wabah'], ['charm_4', 'Plague Censer', 'Pedupaan Wabah']],
    ['+35% Venom damage, +25% Poison chance.', '+35% damage Racun, +25% peluang Racun.', um(['poisonDmg', 'pct', 35], ['poisonChance', 'pct', 25]), []],
    ['A toxic cloud surrounds you (80% ATK every 2s).', 'Awan racun mengelilingimu (80% ATK tiap 2 dtk).', [], [e('venom_cloud', 80, 2)]]),
  set('set_saint', 'Saint\'s Devotion', 'Pengabdian Santo', 4,
    [['hammer_5', 'Saint\'s Mace', 'Gada Santo'], ['helm_5', 'Saint\'s Halo', 'Halo Santo'], ['armor_5', 'Saint\'s Vestments', 'Jubah Santo'], ['amulet_5', 'Saint\'s Reliquary', 'Relikuari Santo']],
    ['+3 HP/s regen, +20% Radiant damage.', '+3 regen HP/dtk, +20% damage Cahaya.', um(['regen', 'flat', 3], ['holyDmg', 'pct', 20]), []],
    ['Revive once per run at full HP.', 'Bangkit sekali per run dengan HP penuh.', [], [e('second_wind', 100)]]),
  set('set_hollow', 'Hollow Regalia', 'Kebesaran Hampa', 5,
    [['sword_6', 'Hollow Blade', 'Pedang Hampa'], ['helm_6', 'Hollow Visage', 'Wajah Hampa'], ['armor_6', 'Hollow Carapace', 'Karapas Hampa'], ['ring_6', 'Hollow Signet', 'Segel Hampa']],
    ['+30% ATK, +20% Crit Damage.', '+30% ATK, +20% Damage Kritis.', um(['atk', 'pct', 30], ['critDmg', 'pct', 20]), []],
    ['Execute enemies below 20% HP. Kills grant 3 shield.', 'Eksekusi musuh di bawah 20% HP. Membunuh memberi perisai 3.', um(['executeBelow', 'pct', 20]), [e('kill_shield', 3)]]),
];

export function baseById(id: string): ItemBase | undefined {
  return ITEM_BASES.find((b) => b.id === id);
}

export function uniqueById(id: string): UniqueDef | undefined {
  return UNIQUES.find((x) => x.id === id);
}

export function setById(id: string): SetDef | undefined {
  return SETS.find((x) => x.id === id);
}

export function affixById(id: string): AffixDef | undefined {
  return AFFIXES.find((x) => x.id === id);
}

export const RARITY_NAMES: L10n[] = [
  { en: 'Common', id: 'Biasa' },
  { en: 'Magic', id: 'Sihir' },
  { en: 'Rare', id: 'Langka' },
  { en: 'Epic', id: 'Epik' },
  { en: 'Legendary', id: 'Legendaris' },
  { en: 'Mythic', id: 'Mitos' },
];

export const SLOT_NAMES: Record<Slot, L10n> = {
  weapon: { en: 'Weapon', id: 'Senjata' },
  helm: { en: 'Helm', id: 'Helm' },
  armor: { en: 'Armor', id: 'Zirah' },
  boots: { en: 'Boots', id: 'Sepatu' },
  ring: { en: 'Ring', id: 'Cincin' },
  amulet: { en: 'Amulet', id: 'Jimat' },
  charm: { en: 'Charm', id: 'Pesona' },
};
