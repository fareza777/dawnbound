import { describe, expect, it } from 'vitest';
import { isLowTierDevice } from '@/core/viewport';
import { initialRoomState } from '@/scenes/room/roomState';

describe('isLowTierDevice', () => {
  it('flags Oppo A3s / Android 8.1 even when deviceMemory is unavailable', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 8.1.0; CPH1803) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36';
    expect(isLowTierDevice({ userAgent: ua })).toBe(true);
  });

  it('flags devices reporting <= 3 GB RAM', () => {
    expect(isLowTierDevice({ deviceMemory: 2, userAgent: 'Mozilla/5.0 (Linux; Android 13)' })).toBe(true);
    expect(isLowTierDevice({ deviceMemory: 3, userAgent: 'Mozilla/5.0 (Linux; Android 13)' })).toBe(true);
  });

  it('keeps modern >= 4 GB Android devices on high quality', () => {
    expect(isLowTierDevice({ deviceMemory: 6, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' })).toBe(false);
  });
});

describe('initialRoomState', () => {
  it('resets all transient room counters and stacked modifiers cleanly', () => {
    const dirty = {
      wavesLeft: 3,
      waveTimer: -12,
      spawning: 4,
      bossBarDirty: true,
      hitStopMs: 80,
      lastHitStopAt: 5000,
      gateOpen: true,
      leaving: true,
      pendingLevelUps: 2,
      pendingEventBoons: 1,
      dead: true,
      cleared: true,
      darknessBeforeDeath: 0.9,
      flareReadyNotified: true,
      eliteChance: 0.4,
      heatHp: 2.5,
      heatAtk: 1.8,
      heatSpeed: 1.5,
      extraPerWave: 3,
      roomTime: 42,
    };
    Object.assign(dirty, initialRoomState());
    expect(dirty.spawning).toBe(0);
    expect(dirty.wavesLeft).toBe(0);
    expect(dirty.waveTimer).toBe(0);
    expect(dirty.heatHp).toBe(1);
    expect(dirty.heatAtk).toBe(1);
    expect(dirty.heatSpeed).toBe(1);
    expect(dirty.extraPerWave).toBe(0);
    expect(dirty.eliteChance).toBe(0);
    expect(dirty.dead).toBe(false);
    expect(dirty.leaving).toBe(false);
    expect(dirty.gateOpen).toBe(false);
    expect(dirty.cleared).toBe(false);
  });
});
