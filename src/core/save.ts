import { Preferences } from '@capacitor/preferences';
import type { SaveData, Settings } from '@/data/types';

export const SAVE_VERSION = 1;
const KEY = 'dawnbound.save.v1';
const BACKUP_KEY = 'dawnbound.save.backup';

export function defaultSettings(): Settings {
  return {
    musicVol: 0.6,
    sfxVol: 0.8,
    vibration: true,
    screenShake: 1,
    damageNumbers: true,
    autoAttack: false,
    joystick: 'floating',
    lang: 'en',
    quality: 'high',
    showFps: false,
  };
}

export function newSave(): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    playTimeSec: 0,
    settings: defaultSettings(),
    profile: { heroId: 'rowan', skins: {}, onboardingDone: false, introSeen: false, tutorialDone: false, name: 'Rowan' },
    unlocks: { heroes: ['rowan'], bossesDefeated: [], maxDepthReached: 0, features: [], skinsOwned: [], tracks: [] },
    currency: { gold: 0, embers: 0, shards: 0 },
    shop: { noAds: false, adBreaks: 0, lastInterstitialAt: 0, giftDay: 0 },
    inventory: [],
    equipped: {},
    materials: {},
    elixirs: {},
    activeElixir: null,
    talents: {},
    flaskLevel: 0,
    quests: {},
    trackedQuest: null,
    bounties: { day: 0, list: [] },
    codex: { enemies: {}, items: [], relics: [], boons: [], lore: [], events: [] },
    stats: {},
    achievements: {},
    garden: [
      { seedId: null, plantedAtRun: 0 },
      { seedId: null, plantedAtRun: 0 },
      { seedId: null, plantedAtRun: 0 },
    ],
    flags: {},
    vows: {},
    run: null,
    daily: { lastDay: 0, best: 0 },
    seenDialogues: [],
    itemCounter: 0,
  };
}

/** Fill any fields missing from older saves with defaults (forward-compatible migration). */
export function migrate(raw: unknown): SaveData {
  const base = newSave();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<SaveData>;
  const merged = { ...base, ...data } as SaveData;
  merged.settings = { ...base.settings, ...(data.settings ?? {}) };
  merged.profile = { ...base.profile, ...(data.profile ?? {}) };
  merged.unlocks = { ...base.unlocks, ...(data.unlocks ?? {}) };
  merged.currency = { ...base.currency, ...(data.currency ?? {}) };
  merged.shop = { ...base.shop, ...(data.shop ?? {}) };
  merged.codex = { ...base.codex, ...(data.codex ?? {}) };
  merged.daily = { ...base.daily, ...(data.daily ?? {}) };
  merged.bounties = { ...base.bounties, ...(data.bounties ?? {}) };
  if (!Array.isArray(merged.inventory)) merged.inventory = [];
  if (!Array.isArray(merged.garden) || merged.garden.length === 0) merged.garden = base.garden;
  merged.version = SAVE_VERSION;
  return merged;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveManager {
  data: SaveData;
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private storage: StorageLike | null = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.data = this.loadSync();
  }

  private loadSync(): SaveData {
    if (!this.storage) return newSave();
    for (const key of [KEY, BACKUP_KEY]) {
      try {
        const txt = this.storage.getItem(key);
        if (txt) return migrate(JSON.parse(txt));
      } catch (err) {
        console.error(`[save] corrupt ${key}, trying backup`, err);
      }
    }
    return newSave();
  }

  /** On native, localStorage can be wiped by the OS under storage pressure; Preferences is the durable copy. */
  async restoreFromNative(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return false;
      const native = migrate(JSON.parse(value));
      if (native.updatedAt > this.data.updatedAt) {
        this.data = native;
        return true;
      }
    } catch (err) {
      console.warn('[save] native restore failed', err);
    }
    return false;
  }

  markDirty(): void {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 400);
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.data.updatedAt = Date.now();
    const txt = JSON.stringify(this.data);
    try {
      const prev = this.storage?.getItem(KEY);
      if (prev) this.storage?.setItem(BACKUP_KEY, prev);
      this.storage?.setItem(KEY, txt);
    } catch (err) {
      console.error('[save] write failed', err);
    }
    Preferences.set({ key: KEY, value: txt }).catch((err) => console.warn('[save] native write failed', err));
  }

  /** Replace the whole save (e.g. with a cloud copy) and write it through immediately. */
  replace(data: SaveData): void {
    this.data = migrate(data);
    this.dirty = true;
    this.flush();
  }

  reset(): void {
    const settings = this.data.settings;
    this.data = newSave();
    this.data.settings = settings;
    this.dirty = true;
    this.flush();
  }

  nextUid(): string {
    this.data.itemCounter += 1;
    return `i${this.data.itemCounter.toString(36)}`;
  }

  stat(key: string, add = 1): void {
    this.data.stats[key] = (this.data.stats[key] ?? 0) + add;
    this.markDirty();
  }

  flag(key: string): number {
    return this.data.flags[key] ?? 0;
  }

  setFlag(key: string, v = 1): void {
    this.data.flags[key] = v;
    this.markDirty();
  }
}
