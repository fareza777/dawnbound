import type { L10n } from '@/core/i18n';
import type { Mod } from './stats';
import type { SpiritId } from './boons';

/**
 * Weekly mutators: one world rule that changes every Monday for every run (not the Daily Run), in exchange for
 * bonus Embers. Enemy fields work like Vows (one rank).
 */
export interface MutatorDef {
  id: string;
  name: L10n;
  desc: L10n;
  enemyHp?: number;
  enemyAtk?: number;
  enemySpeed?: number;
  extraEnemies?: number;
  eliteChance?: number;
  playerMods?: Mod[];
  /** This spirit's boons are offered twice as often. */
  spiritBias?: SpiritId;
}

export const MUTATOR_EMBER_BONUS = 0.25;

const L = (en: string, id: string): L10n => ({ en, id });

export const MUTATORS: MutatorDef[] = [
  { id: 'm_horde', name: L('Horde Week', 'Pekan Gerombolan'), desc: L('+1 monster in every wave.', '+1 monster di setiap gelombang.'), extraEnemies: 1 },
  { id: 'm_glass', name: L('Glass Cannon', 'Meriam Kaca'), desc: L('You deal +30% damage but have 25% less Max HP.', 'Damage-mu +30% tapi HP Maks 25% lebih sedikit.'), playerMods: [{ stat: 'atk', type: 'more', value: 30 }, { stat: 'maxHp', type: 'more', value: -25 }] },
  { id: 'm_frenzy', name: L('Frenzy', 'Amukan'), desc: L('Monsters move 20% faster; you move 10% faster.', 'Monster bergerak 20% lebih cepat; kamu 10% lebih cepat.'), enemySpeed: 0.2, playerMods: [{ stat: 'moveSpeed', type: 'pct', value: 10 }] },
  { id: 'm_champions', name: L("Champions' Week", 'Pekan Juara'), desc: L('Elite monsters appear far more often.', 'Monster elit jauh lebih sering muncul.'), eliteChance: 0.15 },
  { id: 'm_ember_tide', name: L('Ember Tide', 'Pasang Bara'), desc: L('Ignis offers boons twice as often; +20% fire damage.', 'Ignis menawarkan anugerah dua kali lebih sering; +20% damage api.'), spiritBias: 'ember', playerMods: [{ stat: 'fireDmg', type: 'flat', value: 20 }] },
  { id: 'm_long_winter', name: L('Long Winter', 'Musim Dingin Panjang'), desc: L('Nivalis offers boons twice as often; +20% ice damage.', 'Nivalis menawarkan anugerah dua kali lebih sering; +20% damage es.'), spiritBias: 'rime', playerMods: [{ stat: 'iceDmg', type: 'flat', value: 20 }] },
  { id: 'm_iron_hide', name: L('Iron Hide', 'Kulit Besi'), desc: L('Monsters have +25% HP; you gain +10% attack.', 'Monster +25% HP; seranganmu +10%.'), enemyHp: 0.25, playerMods: [{ stat: 'atk', type: 'pct', value: 10 }] },
  { id: 'm_golden', name: L('Golden Week', 'Pekan Emas'), desc: L('+50% gold found, but monsters hit 10% harder.', '+50% emas ditemukan, tapi monster memukul 10% lebih keras.'), enemyAtk: 0.1, playerMods: [{ stat: 'goldFind', type: 'flat', value: 50 }] },
];

/** Mondays (UTC) since this date start a new mutator week. */
const EPOCH = Date.UTC(2026, 0, 5);
const WEEK_MS = 7 * 24 * 3600 * 1000;

export function weekIndex(now: number): number {
  return Math.floor((now - EPOCH) / WEEK_MS);
}

export function weeklyMutator(now: number): MutatorDef {
  const i = weekIndex(now) % MUTATORS.length;
  return MUTATORS[(i + MUTATORS.length) % MUTATORS.length];
}

export function mutatorById(id: string | undefined): MutatorDef | undefined {
  return id ? MUTATORS.find((m) => m.id === id) : undefined;
}
