import { beforeEach, describe, expect, it } from 'vitest';
import { services } from '@/core/services';
import { SaveManager } from '@/core/save';
import { Rng } from '@/core/rng';
import { generateItem } from '@/systems/loot';
import { bestLoadout, loadoutGain } from '@/game/equipBest';
import type { Slot } from '@/data/types';

const SLOTS: Slot[] = ['weapon', 'helm', 'armor', 'boots', 'ring', 'amulet', 'charm'];

beforeEach(() => {
  services.save = new SaveManager(null);
});

describe('equip best', () => {
  it('prefers much stronger gear in every slot and reports the gain', () => {
    const s = services.save!.data;
    const rng = new Rng(3);
    for (const slot of SLOTS) {
      const weak = generateItem(rng, { ilvl: 2, depth: 1, source: 'enemy', rarity: 0, slot, uid: `w_${slot}` });
      const strong = generateItem(rng, { ilvl: 48, depth: 5, source: 'boss', rarity: 3, slot, uid: `s_${slot}` });
      s.inventory.push(weak, strong);
      s.equipped[slot] = weak.uid;
    }
    const next = bestLoadout(s);
    for (const slot of SLOTS) expect(next[slot]).toBe(`s_${slot}`);
    expect(loadoutGain(s, next)).toBeGreaterThan(0.5);
    // Pure: the save itself is only changed by the caller.
    expect(s.equipped.weapon).toBe('w_weapon');
    s.equipped = next;
    expect(loadoutGain(s, bestLoadout(s))).toBeLessThan(0.001);
  });

  it('fills empty slots and handles an empty stash', () => {
    const s = services.save!.data;
    expect(bestLoadout(s)).toEqual({});
    const ring = generateItem(new Rng(1), { ilvl: 10, depth: 1, source: 'enemy', rarity: 1, slot: 'ring', uid: 'r1' });
    s.inventory.push(ring);
    expect(bestLoadout(s).ring).toBe('r1');
  });
});
