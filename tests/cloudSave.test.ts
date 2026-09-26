import { describe, expect, it } from 'vitest';
import { chooseSave, isFreshSave } from '@/core/cloudSave';

const at = (playTimeSec: number, updatedAt: number) => ({ playTimeSec, updatedAt });

describe('chooseSave', () => {
  it('uploads when the account has no cloud save yet', () => {
    expect(chooseSave(at(500, 1000), null)).toBe('upload');
  });

  it('treats matching play time and write time as the same save', () => {
    expect(chooseSave(at(500, 10_000), at(503, 12_000))).toBe('same');
  });

  it('prefers the copy with clearly more play time, whatever the clocks say', () => {
    // Cloud played much longer, even though this device claims a later write time (wrong clock).
    expect(chooseSave(at(600, 9_000_000), at(4_000, 1_000))).toBe('cloud');
    // This device played much longer: never pull an older cloud copy over it.
    expect(chooseSave(at(4_000, 1_000), at(600, 9_000_000))).toBe('upload');
  });

  it('breaks near-ties on play time with the newer write', () => {
    expect(chooseSave(at(1_000, 1_000), at(1_020, 50_000))).toBe('cloud');
    expect(chooseSave(at(1_020, 50_000), at(1_000, 1_000))).toBe('upload');
  });
});

describe('isFreshSave', () => {
  it('only counts nearly unplayed saves as fresh', () => {
    expect(isFreshSave(at(30, 0))).toBe(true);
    expect(isFreshSave(at(600, 0))).toBe(false);
  });
});
