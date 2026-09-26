import type { L10n } from '@/core/i18n';
import type { Element } from './types';

export type BossAttack =
  | 'charge' | 'charge3' | 'slam' | 'ring' | 'spiral' | 'fan' | 'summon' | 'rain' | 'sweep' | 'teleport'
  | 'homing' | 'nova' | 'cross' | 'burst';

export interface BossPhase {
  /** Phase is active while hp ratio is at or below this value. */
  below: number;
  attacks: [BossAttack, number][];
  speed: number;
  /** Seconds of idle between attacks. */
  pause: number;
  line?: L10n;
}

export interface BossDef {
  id: string;
  name: L10n;
  title: L10n;
  frame: string;
  /** Alternate frame used in the final phase (Malachar). */
  frame2?: string;
  scale: number;
  hp: number;
  atk: number;
  def: number;
  radius: number;
  element: Element;
  tint: number;
  summon?: string;
  partner?: string;
  phases: BossPhase[];
  intro: L10n;
  defeat: L10n;
  trophy: string;
  relic?: string;
}

export const BOSSES: Record<string, BossDef> = {
  gorehorn: {
    id: 'gorehorn', name: { en: 'Gorehorn', id: 'Gorehorn' }, title: { en: 'Warden of Whisperwood', id: 'Penjaga Hutan Bisikan' },
    frame: 'b/MinotaurA', scale: 0.52, hp: 1100, atk: 16, def: 8, radius: 15, element: 'physical', tint: 0xffb080, summon: 'slime_green',
    phases: [
      { below: 1, attacks: [['charge', 4], ['slam', 3], ['fan', 2]], speed: 34, pause: 1.1 },
      { below: 0.5, attacks: [['charge3', 4], ['slam', 3], ['ring', 2], ['summon', 1]], speed: 44, pause: 0.7, line: { en: 'THE WOOD... WILL NOT... YIELD!', id: 'HUTAN... TAK AKAN... TUNDUK!' } },
    ],
    intro: { en: 'Turn back, little flame. The roots have eaten braver than you.', id: 'Kembalilah, api kecil. Akar-akar ini telah melahap yang lebih berani darimu.' },
    defeat: { en: 'The Ember... was never mine to keep...', id: 'Bara itu... memang bukan milikku...' },
    trophy: 'trophy_gorehorn', relic: 'gorehorn_horn',
  },
  sseth: {
    id: 'sseth', name: { en: 'Sseth', id: 'Sseth' }, title: { en: 'Elder Sister of the Crypt', id: 'Kakak Sulung Kripta' },
    frame: 'b/LamiaA', scale: 0.62, hp: 800, atk: 18, def: 6, radius: 12, element: 'poison', tint: 0xa8e05f,
    phases: [
      { below: 1, attacks: [['fan', 3], ['charge', 3], ['burst', 2]], speed: 40, pause: 1.1 },
      { below: 0.45, attacks: [['fan', 3], ['charge3', 3], ['cross', 2]], speed: 50, pause: 0.7, line: { en: 'Ivra! Sing louder!', id: 'Ivra! Bernyanyilah lebih keras!' } },
    ],
    intro: { en: 'Another keeper, sister. Shall we keep this one?', id: 'Penjaga lagi, adikku. Bolehkah kita menyimpannya?' },
    defeat: { en: 'Ivra... I am sorry...', id: 'Ivra... maafkan aku...' },
    trophy: 'trophy_lamia', relic: 'twin_scales',
  },
  ivra: {
    id: 'ivra', name: { en: 'Ivra', id: 'Ivra' }, title: { en: 'Younger Sister of the Crypt', id: 'Adik Bungsu Kripta' },
    frame: 'b/LamiaC', scale: 0.62, hp: 700, atk: 16, def: 4, radius: 12, element: 'shadow', tint: 0xc8a0ff, summon: 'skeleton',
    phases: [
      { below: 1, attacks: [['spiral', 3], ['summon', 2], ['homing', 2], ['teleport', 1]], speed: 30, pause: 1.3 },
      { below: 0.45, attacks: [['spiral', 3], ['ring', 2], ['homing', 2], ['summon', 1]], speed: 38, pause: 0.8 },
    ],
    intro: { en: 'Yes, Sseth. This one has such a pretty light.', id: 'Ya, Sseth. Yang ini punya cahaya yang cantik.' },
    defeat: { en: 'The water is so cold, sister...', id: 'Airnya dingin sekali, kakak...' },
    trophy: 'trophy_lamia', partner: 'sseth',
  },
  azhar: {
    id: 'azhar', name: { en: 'Azhar', id: 'Azhar' }, title: { en: 'The Bound Djinn', id: 'Jin yang Terikat' },
    frame: 'b/GeniusA', scale: 0.5, hp: 2400, atk: 26, def: 10, radius: 16, element: 'fire', tint: 0xff9a5a, summon: 'dust_wisp',
    phases: [
      { below: 1, attacks: [['rain', 3], ['spiral', 2], ['homing', 2], ['teleport', 1]], speed: 30, pause: 1.1 },
      { below: 0.5, attacks: [['sweep', 3], ['rain', 3], ['ring', 2], ['summon', 1], ['teleport', 1]], speed: 38, pause: 0.7, line: { en: 'You would free me? Then EARN it!', id: 'Kau ingin membebaskanku? Maka BUKTIKAN!' } },
    ],
    intro: { en: 'Three wishes, keeper. First: that you burn.', id: 'Tiga permintaan, penjaga. Pertama: agar kau terbakar.' },
    defeat: { en: 'Free... after a thousand years... thank you.', id: 'Bebas... setelah seribu tahun... terima kasih.' },
    trophy: 'trophy_azhar', relic: 'djinn_lamp',
  },
  vesper: {
    id: 'vesper', name: { en: 'Vesper', id: 'Vesper' }, title: { en: 'Queen of the Frozen Heart', id: 'Ratu Hati Beku' },
    frame: 'b/SuccubusB', scale: 0.45, hp: 3600, atk: 34, def: 10, radius: 14, element: 'ice', tint: 0x9ee8ff, summon: 'banshee',
    phases: [
      { below: 1, attacks: [['spiral', 3], ['homing', 2], ['teleport', 2], ['nova', 2]], speed: 34, pause: 1 },
      { below: 0.55, attacks: [['cross', 3], ['rain', 2], ['nova', 2], ['summon', 1], ['teleport', 2]], speed: 42, pause: 0.7, line: { en: 'I loved him too, you know. The Hollow King.', id: 'Aku juga mencintainya, tahukah kau. Sang Raja Hampa.' } },
      { below: 0.2, attacks: [['spiral', 3], ['cross', 3], ['nova', 2]], speed: 50, pause: 0.45 },
    ],
    intro: { en: 'Stay a while. Stay forever. It is warmer in the ice than out there.', id: 'Tinggallah sebentar. Tinggallah selamanya. Di dalam es lebih hangat daripada di luar.' },
    defeat: { en: 'Tell Malachar... I kept the light... he gave me.', id: 'Katakan pada Malachar... aku menjaga cahaya... yang ia berikan.' },
    trophy: 'trophy_vesper', relic: 'frozen_heart',
  },
  malachar: {
    id: 'malachar', name: { en: 'Malachar', id: 'Malachar' }, title: { en: 'The Hollow King', id: 'Raja Hampa' },
    frame: 'b/BlackMagusA', frame2: 'b/BlackMagusB', scale: 0.5, hp: 6000, atk: 46, def: 14, radius: 16, element: 'shadow', tint: 0xc8a0ff, summon: 'dread_knight',
    phases: [
      { below: 1, attacks: [['spiral', 3], ['homing', 2], ['rain', 2], ['teleport', 2], ['fan', 2]], speed: 30, pause: 1 },
      { below: 0.6, attacks: [['sweep', 3], ['cross', 2], ['summon', 1], ['rain', 2], ['teleport', 2]], speed: 36, pause: 0.75, line: { en: 'Maren taught you well. She taught me first.', id: 'Maren mengajarimu dengan baik. Dia mengajariku lebih dulu.' } },
      { below: 0.25, attacks: [['spiral', 2], ['sweep', 2], ['nova', 2], ['rain', 2], ['cross', 2]], speed: 44, pause: 0.45, line: { en: 'If I cannot keep the dawn, NO ONE WILL!', id: 'Jika aku tak bisa memiliki fajar, TAK SEORANG PUN BISA!' } },
    ],
    intro: { en: 'So the Lantern sends a child. Come then, apprentice. Let us see what she left you.', id: 'Jadi Lentera mengirim seorang anak. Kemarilah, murid. Mari kita lihat apa yang ia wariskan padamu.' },
    defeat: { en: 'The sun... I only wanted... to keep it from setting...', id: 'Matahari... aku hanya ingin... mencegahnya terbenam...' },
    trophy: 'trophy_malachar', relic: 'hollow_crown',
  },
};

/** Mapping from biome boss key (biomes.ts) to the boss that spawns. */
export const BIOME_BOSS: Record<string, string> = {
  gorehorn: 'gorehorn',
  twin_lamias: 'ivra',
  azhar: 'azhar',
  vesper: 'vesper',
  malachar: 'malachar',
};

/** Guardians grow with depth like their monsters do (base stats already differ per guardian). */
export function bossScaling(depth: number): { hp: number; atk: number } {
  const d = Math.max(0, Math.min(depth, 5) - 1);
  return { hp: BOSS_TOUGHNESS * (1 + 0.12 * d), atk: 1 + 0.08 * d };
}

/** Guardian fights are long, readable duels (roughly 80-120 hits with a build of that depth). */
export const BOSS_TOUGHNESS = 2.5;
