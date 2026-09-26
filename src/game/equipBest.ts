/** "Equip Best": picks the loadout with the highest real power for the current hero (set bonuses included). */
import type { SaveData, Slot } from '@/data/types';
import { baseById } from '@/data/items';
import { powerScore } from '@/systems/power';
import { itemPower } from '@/systems/loot';
import { buildContext } from './RunManager';

const SLOTS: Slot[] = ['weapon', 'helm', 'armor', 'boots', 'ring', 'amulet', 'charm'];

function scoreOf(s: SaveData, equipped: SaveData['equipped']): number {
  const trial = { ...s, equipped };
  return powerScore(buildContext(trial, null).stats);
}

/**
 * Best loadout from the stash. Greedy per slot, repeated until nothing improves, so set pieces that only pay off
 * together still get picked. Returns the new equipped map (the save is not changed).
 */
export function bestLoadout(s: SaveData): SaveData['equipped'] {
  let current: SaveData['equipped'] = { ...s.equipped };
  let score = scoreOf(s, current);
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (const slot of SLOTS) {
      const candidates = s.inventory.filter((it) => baseById(it.baseId)?.slot === slot);
      for (const it of candidates) {
        if (current[slot] === it.uid) continue;
        const next = { ...current, [slot]: it.uid };
        const sc = scoreOf(s, next);
        // Utility-only pieces (gold find, luck...) don't change combat power: then the higher item power wins.
        const worn = s.inventory.find((q) => q.uid === current[slot]);
        const tie = Math.abs(sc - score) <= score * 0.0001 && itemPower(it) > (worn ? itemPower(worn) : 0);
        if (sc > score * 1.0001 || tie) {
          score = Math.max(score, sc);
          current = next;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return current;
}

/** Power of the current loadout vs the best one (to report the gain to the player). */
export function loadoutGain(s: SaveData, next: SaveData['equipped']): number {
  const before = scoreOf(s, s.equipped);
  return before > 0 ? scoreOf(s, next) / before - 1 : 0;
}
