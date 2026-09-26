import { beforeEach, describe, expect, it } from 'vitest';
import { services } from '@/core/services';
import { SaveManager } from '@/core/save';
import { Rng } from '@/core/rng';
import { generateItem } from '@/systems/loot';
import { adaptiveToughness, gearProgress } from '@/game/progression';
import type { Slot } from '@/data/types';

const SLOTS: Slot[] = ['weapon', 'helm', 'armor', 'boots', 'ring', 'amulet', 'charm'];

beforeEach(() => {
  services.save = new SaveManager(null);
});

describe('adaptive toughness', () => {
  it('softens monsters for a brand-new hero and is full strength for gear that fits the depth', () => {
    expect(adaptiveToughness(0)).toEqual({ hp: 0.45, atk: 0.55 });
    expect(adaptiveToughness(1)).toEqual({ hp: 1, atk: 1 });
  });

  it('lets over-geared heroes keep an edge (monsters grow far less than the gear)', () => {
    const over = adaptiveToughness(5);
    expect(over.hp).toBeCloseTo(1.2);
    expect(over.hp).toBeLessThan(1.25);
  });

  it('measures gear against the depth: the same gear is plenty early and weak later', () => {
    const s = services.save!.data;
    expect(gearProgress(s, 1)).toBe(0);
    const rng = new Rng(2);
    for (const slot of SLOTS) {
      const it = generateItem(rng, { ilvl: 12, depth: 1, source: 'enemy', slot, uid: slot });
      s.inventory.push(it);
      s.equipped[slot] = it.uid;
    }
    expect(gearProgress(s, 1)).toBeCloseTo(1, 1);
    expect(gearProgress(s, 4)).toBeLessThan(0.4);
  });
});
