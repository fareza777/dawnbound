import type { L10n } from '@/core/i18n';
import type { Mod } from './stats';

/** Vows of Night: optional difficulty modifiers (heat). Each rank adds heat, which multiplies Ember rewards. */
export interface VowDef {
  id: string;
  name: L10n;
  desc: L10n;
  maxRank: number;
  /** Enemy-side multipliers per rank, applied by the room spawner. */
  enemyHp?: number;
  enemyAtk?: number;
  enemySpeed?: number;
  extraEnemies?: number;
  eliteChance?: number;
  playerMods?: (rank: number) => Mod[];
  flag?: string;
}

export const VOWS: VowDef[] = [
  { id: 'v_hp', name: { en: 'Vow of Endurance', id: 'Sumpah Ketahanan' }, desc: { en: 'Enemies have +20% HP per rank.', id: 'Musuh +20% HP per peringkat.' }, maxRank: 3, enemyHp: 0.2 },
  { id: 'v_atk', name: { en: 'Vow of Pain', id: 'Sumpah Kesakitan' }, desc: { en: 'Enemies deal +15% damage per rank.', id: 'Musuh memberi +15% damage per peringkat.' }, maxRank: 3, enemyAtk: 0.15 },
  { id: 'v_speed', name: { en: 'Vow of Haste', id: 'Sumpah Ketergesaan' }, desc: { en: 'Enemies move 10% faster per rank.', id: 'Musuh bergerak 10% lebih cepat per peringkat.' }, maxRank: 2, enemySpeed: 0.1 },
  { id: 'v_horde', name: { en: 'Vow of the Horde', id: 'Sumpah Gerombolan' }, desc: { en: '+1 enemy per wave per rank.', id: '+1 musuh per gelombang per peringkat.' }, maxRank: 3, extraEnemies: 1 },
  { id: 'v_elite', name: { en: 'Vow of Champions', id: 'Sumpah Juara' }, desc: { en: '+15% chance for enemies to be elite per rank.', id: '+15% peluang musuh menjadi elit per peringkat.' }, maxRank: 2, eliteChance: 0.15 },
  { id: 'v_frail', name: { en: 'Vow of Frailty', id: 'Sumpah Kerapuhan' }, desc: { en: '-15% Max HP per rank.', id: '-15% HP Maks per peringkat.' }, maxRank: 2, playerMods: (r) => [{ stat: 'maxHp', type: 'more', value: -15 * r }] },
  { id: 'v_dark', name: { en: 'Vow of Darkness', id: 'Sumpah Kegelapan' }, desc: { en: 'The darkness is deeper.', id: 'Kegelapan lebih pekat.' }, maxRank: 1, flag: 'darker' },
  { id: 'v_noheal', name: { en: 'Vow of Thirst', id: 'Sumpah Dahaga' }, desc: { en: 'Flask heals 50% less.', id: 'Ramuan memulihkan 50% lebih sedikit.' }, maxRank: 1, playerMods: () => [{ stat: 'potionPower', type: 'flat', value: -50 }] },
  { id: 'v_poor', name: { en: 'Vow of Poverty', id: 'Sumpah Kemiskinan' }, desc: { en: 'Shops cost 25% more per rank.', id: 'Harga toko 25% lebih mahal per peringkat.' }, maxRank: 2, flag: 'poverty' },
  { id: 'v_boss', name: { en: 'Vow of the Tyrant', id: 'Sumpah Tiran' }, desc: { en: 'Bosses gain new attacks and +30% HP.', id: 'Bos mendapat serangan baru dan +30% HP.' }, maxRank: 1, flag: 'tyrant' },
];

export function vowHeat(vows: Record<string, number>): number {
  return Object.values(vows).reduce((a, b) => a + b, 0);
}

export function vowEmberMult(vows: Record<string, number>): number {
  return 1 + vowHeat(vows) * 0.1;
}
