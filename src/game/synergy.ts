import { BOONS, boonDef, type BoonDef, type SpiritId } from '@/data/boons';
import type { RunState } from '@/data/types';

/** The spirit a Duo would pair with if the player took this first boon of `def.spirit` now (none if already owned). */
export function duoUnlockedBy(run: RunState, def: BoonDef): SpiritId | undefined {
  const owned = new Set(run.boons.map((b) => boonDef(b.id)?.spirit).filter((x): x is SpiritId => !!x));
  if (owned.has(def.spirit)) return undefined;
  for (const d of BOONS) {
    if (!d.duo) continue;
    if (d.spirit === def.spirit && owned.has(d.duo)) return d.duo;
    if (d.duo === def.spirit && owned.has(d.spirit)) return d.spirit;
  }
  return undefined;
}
