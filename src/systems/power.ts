/** One number for how strong a build is: expected damage per second x effective health. */
import { mitigate } from './combat';
import type { StatBlock } from '@/data/stats';

/** Base swing interval (Player.attack) at 100% attack speed. */
export const SWING = 0.42;

export function dpsOf(atk: number, atkSpeed: number, critChance: number, critDmg: number, targetDef: number): number {
  const critAvg = 1 + (Math.min(100, critChance) / 100) * (critDmg / 100 - 1);
  return mitigate(atk * critAvg, targetDef) / (SWING / (atkSpeed / 100));
}

export function powerScore(st: StatBlock): number {
  const off = dpsOf(st.atk, st.atkSpeed, st.critChance, st.critDmg, 5) * (1 + st.lifesteal / 200);
  const taken = (1 - Math.min(0.5, st.dodge / 100)) * (1 - Math.min(0.75, st.dmgReduction / 100));
  const ehp = st.maxHp / (mitigate(100, st.def) / 100) / taken;
  return off * ehp;
}
