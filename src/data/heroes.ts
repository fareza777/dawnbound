import type { L10n } from '@/core/i18n';
import type { StatBlock } from './stats';

export type AttackStyle = 'swordbow' | 'spear' | 'staff' | 'twinblade';

export interface HeroDef {
  id: string;
  name: L10n;
  title: L10n;
  lore: L10n;
  /** 'hero' uses the hero atlas (hero{skin}), 'arpg' uses arpg{index} attack + walk sheets. */
  rig: 'hero' | 'arpg';
  arpgIndex?: number;
  /** ARPG attack sheet used for the basic attack. */
  attackSheet?: string;
  style: AttackStyle;
  stats: Partial<StatBlock>;
  skill: { name: L10n; desc: L10n; cooldown: number };
  passive: { name: L10n; desc: L10n };
  unlock: L10n;
  skins: number;
  portrait: string;
  /** Signature colour: the hero's lantern light, attack trails and skill effects. */
  color: number;
  /** Weapon style shown on the hero screen. */
  weapon: L10n;
  /** 1-5 ratings for the hero screen: how the hero plays at a glance. */
  ratings: { power: number; toughness: number; speed: number; range: number; difficulty: number };
}

export const HEROES: HeroDef[] = [
  {
    id: 'rowan',
    name: { en: 'Rowan', id: 'Rowan' },
    title: { en: 'Lanternkeeper Apprentice', id: 'Murid Penjaga Lentera' },
    lore: {
      en: 'Raised by Elder Maren after the Long Night took everything else. Stubborn, kind, and bound to the Lantern.',
      id: 'Dibesarkan Tetua Maren setelah Malam Panjang merenggut segalanya. Keras kepala, baik hati, dan terikat pada Lentera.',
    },
    rig: 'hero',
    style: 'swordbow',
    stats: { maxHp: 110, atk: 10 },
    skill: {
      name: { en: 'Lantern Spin', id: 'Putaran Lentera' },
      desc: { en: 'Whirl your blade, striking all nearby foes and knocking them back.', id: 'Putar pedangmu, menyerang semua musuh di sekitar dan menghempaskan mereka.' },
      cooldown: 6,
    },
    passive: {
      name: { en: 'Keeper\'s Aim', id: 'Bidikan Penjaga' },
      desc: { en: 'Attacks switch to the bow against distant enemies.', id: 'Serangan beralih ke busur untuk musuh yang jauh.' },
    },
    unlock: { en: 'Available from the start.', id: 'Tersedia sejak awal.' },
    skins: 5,
    portrait: 'portraits_rowan',
    color: 0xffb85c,
    weapon: { en: 'Sword & Bow', id: 'Pedang & Busur' },
    ratings: { power: 3, toughness: 3, speed: 3, range: 4, difficulty: 1 },
  },
  {
    id: 'sera',
    name: { en: 'Sera', id: 'Sera' },
    title: { en: 'Spearmaiden of the North Gate', id: 'Dara Tombak Gerbang Utara' },
    lore: {
      en: 'The last of the village guard\'s spear line. She held the North Gate alone for three nights.',
      id: 'Anggota terakhir barisan tombak penjaga desa. Ia menahan Gerbang Utara sendirian selama tiga malam.',
    },
    rig: 'arpg',
    arpgIndex: 1,
    attackSheet: 'spear01',
    style: 'spear',
    stats: { maxHp: 120, atk: 11, range: 125 },
    skill: {
      name: { en: 'Skewer Rush', id: 'Terjangan Tusuk' },
      desc: { en: 'Charge forward, piercing every enemy in your path.', id: 'Menerjang maju, menembus setiap musuh di jalurmu.' },
      cooldown: 5,
    },
    passive: {
      name: { en: 'Long Reach', id: 'Jangkauan Panjang' },
      desc: { en: 'Thrusts pierce through all enemies in a line.', id: 'Tusukan menembus semua musuh dalam satu garis.' },
    },
    unlock: { en: 'Defeat Gorehorn, the Warden.', id: 'Kalahkan Gorehorn, sang Penjaga.' },
    skins: 1,
    portrait: 'portraits_sera',
    color: 0x9fd8ff,
    weapon: { en: 'Spear', id: 'Tombak' },
    ratings: { power: 3, toughness: 5, speed: 2, range: 3, difficulty: 2 },
  },
  {
    id: 'elio',
    name: { en: 'Elio', id: 'Elio' },
    title: { en: 'Starcaller', id: 'Pemanggil Bintang' },
    lore: {
      en: 'A scholar\'s son who read one forbidden book too many. The stars answer him — for now.',
      id: 'Anak seorang cendekiawan yang membaca satu buku terlarang terlalu banyak. Bintang menjawabnya — untuk saat ini.',
    },
    rig: 'arpg',
    arpgIndex: 17,
    attackSheet: 'staff02',
    style: 'staff',
    stats: { maxHp: 90, atk: 12, cdr: 10 },
    skill: {
      name: { en: 'Starfall Nova', id: 'Nova Bintang Jatuh' },
      desc: { en: 'Release a burst of starlight that damages and chills all nearby enemies.', id: 'Lepaskan ledakan cahaya bintang yang melukai dan membekukan musuh di sekitar.' },
      cooldown: 7,
    },
    passive: {
      name: { en: 'Arcane Orbs', id: 'Bola Arkana' },
      desc: { en: 'Attacks fire homing star orbs.', id: 'Serangan menembakkan bola bintang yang mengejar.' },
    },
    unlock: { en: 'Defeat the Twin Sisters of the Crypt.', id: 'Kalahkan Saudari Kembar Kripta.' },
    skins: 1,
    portrait: 'portraits_elio',
    color: 0xc59bff,
    weapon: { en: 'Star Staff', id: 'Tongkat Bintang' },
    ratings: { power: 4, toughness: 1, speed: 3, range: 5, difficulty: 3 },
  },
  {
    id: 'kaito',
    name: { en: 'Kaito', id: 'Kaito' },
    title: { en: 'Wandering Blademaster', id: 'Pendekar Pengembara' },
    lore: {
      en: 'A swordsman from beyond the mountains who came looking for a worthy death and found a village worth living for.',
      id: 'Pendekar dari balik gunung yang mencari kematian terhormat dan menemukan desa yang layak untuk hidup.',
    },
    rig: 'arpg',
    arpgIndex: 6,
    attackSheet: 'slash01',
    style: 'twinblade',
    stats: { maxHp: 100, atk: 9, critChance: 12, atkSpeed: 125 },
    skill: {
      name: { en: 'Crescent Wave', id: 'Gelombang Sabit' },
      desc: { en: 'Launch three blade waves that slice through enemies.', id: 'Luncurkan tiga gelombang pedang yang membelah musuh.' },
      cooldown: 5,
    },
    passive: {
      name: { en: 'Flowing Steel', id: 'Baja Mengalir' },
      desc: { en: 'Critical hits reduce skill cooldown by 0.3s.', id: 'Serangan kritis mengurangi cooldown skill 0,3 d.' },
    },
    unlock: { en: 'Complete Captain Dorran\'s Trial.', id: 'Selesaikan Ujian Kapten Dorran.' },
    skins: 1,
    portrait: 'portraits_kaito',
    color: 0xff6a5c,
    weapon: { en: 'Twin Blades', id: 'Pedang Kembar' },
    ratings: { power: 5, toughness: 2, speed: 5, range: 1, difficulty: 4 },
  },
];

export function heroDef(id: string): HeroDef {
  return HEROES.find((h) => h.id === id) ?? HEROES[0];
}
