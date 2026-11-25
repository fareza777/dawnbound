export interface RoomTransientState {
  wavesLeft: number;
  waveTimer: number;
  spawning: number;
  bossBarDirty: boolean;
  hitStopMs: number;
  lastHitStopAt: number;
  gateOpen: boolean;
  leaving: boolean;
  pendingLevelUps: number;
  pendingEventBoons: number;
  dead: boolean;
  cleared: boolean;
  darknessBeforeDeath: number;
  flareReadyNotified: boolean;
  eliteChance: number;
  heatHp: number;
  heatAtk: number;
  heatSpeed: number;
  extraPerWave: number;
  roomTime: number;
}

/** Pure default values for every per-room counter/modifier on the reused RoomScene singleton. */
export function initialRoomState(): RoomTransientState {
  return {
    wavesLeft: 0,
    waveTimer: 0,
    spawning: 0,
    bossBarDirty: false,
    hitStopMs: 0,
    lastHitStopAt: -1000,
    gateOpen: false,
    leaving: false,
    pendingLevelUps: 0,
    pendingEventBoons: 0,
    dead: false,
    cleared: false,
    darknessBeforeDeath: 0.5,
    flareReadyNotified: false,
    eliteChance: 0,
    heatHp: 1,
    heatAtk: 1,
    heatSpeed: 1,
    extraPerWave: 0,
    roomTime: 0,
  };
}
