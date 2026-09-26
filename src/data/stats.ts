import type { L10n } from '@/core/i18n';

export type StatKey =
  | 'maxHp' | 'atk' | 'def' | 'critChance' | 'critDmg' | 'atkSpeed' | 'moveSpeed' | 'dashCharges'
  | 'luck' | 'lifesteal' | 'cdr' | 'regen' | 'thorns' | 'dodge' | 'dmgReduction'
  | 'fireDmg' | 'iceDmg' | 'shockDmg' | 'poisonDmg' | 'holyDmg' | 'shadowDmg'
  | 'burnChance' | 'chillChance' | 'shockChance' | 'poisonChance' | 'bleedChance'
  | 'statusPower' | 'goldFind' | 'magicFind' | 'xpGain' | 'pickupRadius'
  | 'skillDmg' | 'flareGain' | 'potionPower' | 'bossDmg' | 'eliteDmg' | 'areaSize' | 'projSpeed'
  | 'extraProjectiles' | 'knockback' | 'healOnKill' | 'shieldOnRoom' | 'executeBelow' | 'range';

export type ModType = 'flat' | 'pct' | 'more';

export interface Mod {
  stat: StatKey;
  type: ModType;
  value: number;
}

export interface StatDef {
  name: L10n;
  /** How to display: 'int' plain number, 'pct' percent, 'dec' one decimal. */
  fmt: 'int' | 'pct' | 'dec';
  base: number;
  min?: number;
  max?: number;
}

export const STATS: Record<StatKey, StatDef> = {
  maxHp: { name: { en: 'Max HP', id: 'HP Maks' }, fmt: 'int', base: 100, min: 1 },
  atk: { name: { en: 'Attack', id: 'Serangan' }, fmt: 'int', base: 10, min: 1 },
  def: { name: { en: 'Defense', id: 'Pertahanan' }, fmt: 'int', base: 0, min: 0 },
  critChance: { name: { en: 'Crit Chance', id: 'Peluang Kritis' }, fmt: 'pct', base: 5, min: 0, max: 100 },
  critDmg: { name: { en: 'Crit Damage', id: 'Damage Kritis' }, fmt: 'pct', base: 150, min: 100 },
  atkSpeed: { name: { en: 'Attack Speed', id: 'Kecepatan Serang' }, fmt: 'pct', base: 100, min: 30, max: 300 },
  moveSpeed: { name: { en: 'Move Speed', id: 'Kecepatan Gerak' }, fmt: 'pct', base: 100, min: 40, max: 200 },
  dashCharges: { name: { en: 'Dash Charges', id: 'Muatan Dash' }, fmt: 'int', base: 2, min: 1, max: 5 },
  luck: { name: { en: 'Luck', id: 'Keberuntungan' }, fmt: 'int', base: 0, min: 0 },
  lifesteal: { name: { en: 'Lifesteal', id: 'Curi Nyawa' }, fmt: 'pct', base: 0, min: 0, max: 30 },
  cdr: { name: { en: 'Cooldown Reduction', id: 'Pengurangan Cooldown' }, fmt: 'pct', base: 0, min: 0, max: 40 },
  regen: { name: { en: 'HP Regen /s', id: 'Regen HP /d' }, fmt: 'dec', base: 0, min: 0 },
  thorns: { name: { en: 'Thorns', id: 'Duri' }, fmt: 'int', base: 0, min: 0 },
  dodge: { name: { en: 'Evasion', id: 'Menghindar' }, fmt: 'pct', base: 0, min: 0, max: 50 },
  dmgReduction: { name: { en: 'Damage Reduction', id: 'Reduksi Damage' }, fmt: 'pct', base: 0, min: 0, max: 70 },
  fireDmg: { name: { en: 'Fire Damage', id: 'Damage Api' }, fmt: 'pct', base: 0 },
  iceDmg: { name: { en: 'Frost Damage', id: 'Damage Es' }, fmt: 'pct', base: 0 },
  shockDmg: { name: { en: 'Storm Damage', id: 'Damage Petir' }, fmt: 'pct', base: 0 },
  poisonDmg: { name: { en: 'Venom Damage', id: 'Damage Racun' }, fmt: 'pct', base: 0 },
  holyDmg: { name: { en: 'Radiant Damage', id: 'Damage Cahaya' }, fmt: 'pct', base: 0 },
  shadowDmg: { name: { en: 'Shadow Damage', id: 'Damage Bayangan' }, fmt: 'pct', base: 0 },
  burnChance: { name: { en: 'Burn Chance', id: 'Peluang Membakar' }, fmt: 'pct', base: 0, min: 0, max: 100 },
  chillChance: { name: { en: 'Chill Chance', id: 'Peluang Membekukan' }, fmt: 'pct', base: 0, min: 0, max: 100 },
  shockChance: { name: { en: 'Shock Chance', id: 'Peluang Setrum' }, fmt: 'pct', base: 0, min: 0, max: 100 },
  poisonChance: { name: { en: 'Poison Chance', id: 'Peluang Meracun' }, fmt: 'pct', base: 0, min: 0, max: 100 },
  bleedChance: { name: { en: 'Bleed Chance', id: 'Peluang Pendarahan' }, fmt: 'pct', base: 0, min: 0, max: 100 },
  statusPower: { name: { en: 'Status Power', id: 'Kekuatan Status' }, fmt: 'pct', base: 100, min: 0 },
  goldFind: { name: { en: 'Gold Find', id: 'Temuan Emas' }, fmt: 'pct', base: 0 },
  magicFind: { name: { en: 'Magic Find', id: 'Temuan Sihir' }, fmt: 'pct', base: 0 },
  xpGain: { name: { en: 'Ember XP', id: 'XP Bara' }, fmt: 'pct', base: 0 },
  pickupRadius: { name: { en: 'Pickup Radius', id: 'Radius Ambil' }, fmt: 'int', base: 28, min: 8 },
  skillDmg: { name: { en: 'Skill Damage', id: 'Damage Skill' }, fmt: 'pct', base: 0 },
  flareGain: { name: { en: 'Flare Charge', id: 'Isi Flare' }, fmt: 'pct', base: 0 },
  potionPower: { name: { en: 'Potion Power', id: 'Kekuatan Ramuan' }, fmt: 'pct', base: 0 },
  bossDmg: { name: { en: 'Boss Damage', id: 'Damage Bos' }, fmt: 'pct', base: 0 },
  eliteDmg: { name: { en: 'Elite Damage', id: 'Damage Elit' }, fmt: 'pct', base: 0 },
  areaSize: { name: { en: 'Area Size', id: 'Luas Area' }, fmt: 'pct', base: 100, min: 50, max: 250 },
  projSpeed: { name: { en: 'Projectile Speed', id: 'Laju Proyektil' }, fmt: 'pct', base: 100, min: 50 },
  extraProjectiles: { name: { en: 'Extra Projectiles', id: 'Proyektil Tambahan' }, fmt: 'int', base: 0, min: 0, max: 6 },
  knockback: { name: { en: 'Knockback', id: 'Hentakan' }, fmt: 'pct', base: 100, min: 0 },
  healOnKill: { name: { en: 'Heal on Kill', id: 'Pulih saat Membunuh' }, fmt: 'int', base: 0, min: 0 },
  shieldOnRoom: { name: { en: 'Shield per Room', id: 'Perisai per Ruang' }, fmt: 'int', base: 0, min: 0 },
  executeBelow: { name: { en: 'Execute Threshold', id: 'Ambang Eksekusi' }, fmt: 'pct', base: 0, min: 0, max: 30 },
  range: { name: { en: 'Range', id: 'Jangkauan' }, fmt: 'pct', base: 100, min: 50, max: 200 },
};

export const STAT_KEYS = Object.keys(STATS) as StatKey[];

export type StatBlock = Record<StatKey, number>;

export function baseStats(): StatBlock {
  const out = {} as StatBlock;
  for (const k of STAT_KEYS) out[k] = STATS[k].base;
  return out;
}
