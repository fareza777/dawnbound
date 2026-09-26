import type { L10n } from '@/core/i18n';
import type { Mod, StatKey } from './stats';
import type { EffectRef } from './types';

/** Permanent upgrades bought with Embers at the Lantern shrine. Arranged in 4 branches of increasing cost. */
export interface TalentDef {
  id: string;
  branch: 'might' | 'guard' | 'grace' | 'fortune';
  name: L10n;
  desc: L10n;
  maxRank: number;
  costs: number[];
  /** Per-rank value. */
  value: number;
  mod?: { stat: StatKey; type: Mod['type'] };
  effect?: string;
  requires?: string;
  /** Minimum boss kills (depth cleared) to unlock. */
  gate?: number;
  icon: string;
}

function tal(id: string, branch: TalentDef['branch'], en: string, idn: string, dEn: string, dId: string, maxRank: number, base: number, value: number, stat?: StatKey, type: Mod['type'] = 'flat', extra: Partial<TalentDef> = {}): TalentDef {
  const costs = Array.from({ length: maxRank }, (_, i) => Math.round(base * Math.pow(1.6, i)));
  return { id, branch, name: { en, id: idn }, desc: { en: dEn, id: dId }, maxRank, costs, value, mod: stat ? { stat, type } : undefined, icon: `icons_talent_${branch}`, ...extra };
}

export const TALENTS: TalentDef[] = [
  // Might
  tal('t_atk', 'might', 'Keeper\'s Strength', 'Kekuatan Penjaga', '+{v}% ATK per rank.', '+{v}% ATK per peringkat.', 5, 30, 4, 'atk', 'pct'),
  tal('t_crit', 'might', 'Keen Eye', 'Mata Tajam', '+{v}% Crit Chance per rank.', '+{v}% Peluang Kritis per peringkat.', 5, 45, 2, 'critChance', 'pct', { requires: 't_atk' }),
  tal('t_critdmg', 'might', 'Lethal Edge', 'Mata Mematikan', '+{v}% Crit Damage per rank.', '+{v}% Damage Kritis per peringkat.', 5, 60, 10, 'critDmg', 'pct', { requires: 't_crit', gate: 1 }),
  tal('t_skill', 'might', 'Lantern Rite', 'Ritual Lentera', '+{v}% Skill damage per rank.', '+{v}% damage Skill per peringkat.', 5, 55, 8, 'skillDmg', 'pct', { requires: 't_atk' }),
  tal('t_boss', 'might', 'Kingslayer', 'Pembunuh Raja', '+{v}% Boss damage per rank.', '+{v}% damage Bos per peringkat.', 3, 120, 8, 'bossDmg', 'pct', { requires: 't_critdmg', gate: 2 }),
  tal('t_flare', 'might', 'Bright Flare', 'Flare Terang', '+{v}% Flare charge per rank.', '+{v}% isi Flare per peringkat.', 3, 90, 12, 'flareGain', 'pct', { requires: 't_skill', gate: 1 }),
  // Guard
  tal('t_hp', 'guard', 'Hearthblood', 'Darah Perapian', '+{v} Max HP per rank.', '+{v} HP Maks per peringkat.', 5, 30, 12, 'maxHp', 'flat'),
  tal('t_def', 'guard', 'Iron Will', 'Tekad Besi', '+{v} Defense per rank.', '+{v} Pertahanan per peringkat.', 5, 40, 4, 'def', 'flat', { requires: 't_hp' }),
  tal('t_flask', 'guard', 'Deep Flask', 'Ramuan Dalam', '+1 Flask charge per rank.', '+1 muatan Ramuan per peringkat.', 2, 150, 1, undefined, 'flat', { requires: 't_hp', effect: 'extra_flask', gate: 1 }),
  tal('t_regen', 'guard', 'Ember Blood', 'Darah Bara', '+{v} HP/s regen per rank.', '+{v} regen HP/dtk per peringkat.', 3, 80, 0.4, 'regen', 'flat', { requires: 't_def', gate: 1 }),
  tal('t_shield', 'guard', 'Warding Light', 'Cahaya Penangkal', '+{v} shield each room per rank.', '+{v} perisai tiap ruangan per peringkat.', 3, 100, 8, 'shieldOnRoom', 'flat', { requires: 't_def', gate: 2 }),
  tal('t_revive', 'guard', 'Second Dawn', 'Fajar Kedua', 'Revive once per run with 30% HP.', 'Bangkit sekali per run dengan 30% HP.', 1, 600, 30, undefined, 'flat', { requires: 't_shield', effect: 'second_wind', gate: 3 }),
  // Grace
  tal('t_speed', 'grace', 'Light Feet', 'Kaki Ringan', '+{v}% Move Speed per rank.', '+{v}% Kecepatan Gerak per peringkat.', 3, 35, 3, 'moveSpeed', 'pct'),
  tal('t_aspd', 'grace', 'Quick Hands', 'Tangan Cepat', '+{v}% Attack Speed per rank.', '+{v}% Kecepatan Serang per peringkat.', 5, 45, 3, 'atkSpeed', 'pct', { requires: 't_speed' }),
  tal('t_dash', 'grace', 'Shadow Stride', 'Langkah Bayang', '+1 Dash charge.', '+1 muatan Dash.', 1, 250, 1, 'dashCharges', 'flat', { requires: 't_speed', gate: 1 }),
  tal('t_cdr', 'grace', 'Clear Mind', 'Pikiran Jernih', '+{v}% Cooldown Reduction per rank.', '+{v}% Pengurangan Cooldown per peringkat.', 4, 70, 3, 'cdr', 'pct', { requires: 't_aspd' }),
  tal('t_dodge', 'grace', 'Wisp Step', 'Langkah Arwah', '+{v}% Evasion per rank.', '+{v}% Menghindar per peringkat.', 3, 90, 2, 'dodge', 'pct', { requires: 't_dash', gate: 2 }),
  tal('t_range', 'grace', 'Long Reach', 'Jangkauan Jauh', '+{v}% Range and Area per rank.', '+{v}% Jangkauan dan Area per peringkat.', 3, 80, 5, 'range', 'pct', { requires: 't_aspd', gate: 1 }),
  // Fortune
  tal('t_gold', 'fortune', 'Pip\'s Blessing', 'Berkat Pip', '+{v}% Gold Find per rank.', '+{v}% Temuan Emas per peringkat.', 5, 25, 10, 'goldFind', 'pct'),
  tal('t_mf', 'fortune', 'Treasure Sense', 'Indra Harta', '+{v}% Magic Find per rank.', '+{v}% Temuan Sihir per peringkat.', 5, 40, 8, 'magicFind', 'pct', { requires: 't_gold' }),
  tal('t_luck', 'fortune', 'Fortune\'s Favor', 'Restu Keberuntungan', '+{v} Luck per rank.', '+{v} Keberuntungan per peringkat.', 5, 50, 4, 'luck', 'flat', { requires: 't_gold' }),
  tal('t_xp', 'fortune', 'Quick Study', 'Cepat Belajar', '+{v}% Ember XP per rank.', '+{v}% XP Bara per peringkat.', 3, 60, 8, 'xpGain', 'pct', { requires: 't_luck', gate: 1 }),
  tal('t_reroll', 'fortune', 'Fate Weaver', 'Penenun Takdir', '+1 Boon reroll per run per rank.', '+1 acak ulang Anugerah per run per peringkat.', 3, 120, 1, undefined, 'flat', { requires: 't_mf', effect: 'rerolls', gate: 1 }),
  tal('t_start', 'fortune', 'Gift of the Spirits', 'Hadiah Para Roh', 'Begin each run with a random Boon.', 'Mulai setiap run dengan satu Anugerah acak.', 1, 400, 1, undefined, 'flat', { requires: 't_reroll', effect: 'start_boon', gate: 2 }),
];

export function talentById(id: string): TalentDef | undefined {
  return TALENTS.find((t) => t.id === id);
}

export function talentSources(ranks: Record<string, number>): { mods: Mod[]; effects: EffectRef[] }[] {
  const mods: Mod[] = [];
  const effects: EffectRef[] = [];
  for (const t of TALENTS) {
    const r = ranks[t.id] ?? 0;
    if (r <= 0) continue;
    if (t.mod) mods.push({ stat: t.mod.stat, type: t.mod.type, value: t.value * r });
    if (t.id === 't_range') mods.push({ stat: 'areaSize', type: 'pct', value: t.value * r });
    if (t.effect) effects.push({ id: t.effect, p: [t.value * r] });
  }
  return [{ mods, effects }];
}
