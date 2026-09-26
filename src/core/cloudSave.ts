/**
 * Cloud save through Google Play Games (Saved Games) plus achievements/leaderboards sync.
 * The device save stays the source of truth while playing; the cloud copy is refreshed at natural breaks
 * (run end, app pause) and offered back on a new or older device.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PLAY_GAMES, type LeaderboardKey } from '@/config/playGames';
import type { SaveData } from '@/data/types';
import type { SaveManager } from './save';

interface PlayGamesNative {
  status(): Promise<{ available: boolean; signedIn: boolean }>;
  signIn(): Promise<{ signedIn: boolean }>;
  saveGame(o: { name: string; data: string; description: string; playedMs: number }): Promise<void>;
  loadGame(o: { name: string }): Promise<{ data: string | null }>;
  unlockAchievement(o: { id: string }): Promise<void>;
  showAchievements(): Promise<void>;
  submitScore(o: { id: string; score: number }): Promise<void>;
  showLeaderboard(o: { id?: string }): Promise<void>;
}

const PlayGamesNative = registerPlugin<PlayGamesNative>('PlayGames');

export type SaveChoice = 'same' | 'upload' | 'cloud';

interface SaveStamp {
  playTimeSec: number;
  updatedAt: number;
}

/**
 * Which copy wins. Play time only ever grows, so it is the main signal (clocks can be wrong across devices);
 * the last-write time only breaks near-ties.
 */
export function chooseSave(local: SaveStamp, cloud: SaveStamp | null): SaveChoice {
  if (!cloud) return 'upload';
  const dp = cloud.playTimeSec - local.playTimeSec;
  if (Math.abs(dp) <= 5 && Math.abs(cloud.updatedAt - local.updatedAt) < 5000) return 'same';
  if (dp > 30) return 'cloud';
  if (dp < -30) return 'upload';
  return cloud.updatedAt > local.updatedAt ? 'cloud' : 'upload';
}

/** A fresh install (almost no play time) can take the cloud save without asking. */
export function isFreshSave(s: SaveStamp): boolean {
  return s.playTimeSec < 120;
}

export interface CloudOffer {
  cloud: SaveData;
  localPlaySec: number;
  cloudPlaySec: number;
}

export class CloudSave {
  available = false;
  signedIn = false;
  private lastUpload = 0;
  private uploading = false;
  private offer: CloudOffer | null = null;
  private offerListener: ((o: CloudOffer) => void) | null = null;

  constructor(private save: SaveManager, private migrate: (raw: unknown) => SaveData) {}

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const st = await PlayGamesNative.status();
      this.available = st.available;
      this.signedIn = st.signedIn;
      if (this.signedIn) await this.onSignedIn();
    } catch (err) {
      console.warn('[cloud] init', err);
    }
  }

  async signIn(): Promise<boolean> {
    if (!this.available) return false;
    try {
      this.signedIn = (await PlayGamesNative.signIn()).signedIn;
      if (this.signedIn) await this.onSignedIn();
    } catch (err) {
      console.warn('[cloud] sign-in', err);
    }
    return this.signedIn;
  }

  /** Menu asks to be told when a newer cloud save is waiting for the player's decision. */
  onOffer(fn: (o: CloudOffer) => void): () => void {
    this.offerListener = fn;
    if (this.offer) fn(this.offer);
    return () => {
      if (this.offerListener === fn) this.offerListener = null;
    };
  }

  /** Player chose the cloud copy: replace the device save and restart the game on it. */
  acceptOffer(): void {
    if (!this.offer) return;
    this.save.replace(this.offer.cloud);
    this.offer = null;
    window.location.reload();
  }

  /** Player kept this device's progress: it becomes the cloud copy. */
  declineOffer(): void {
    this.offer = null;
    void this.upload(true);
  }

  private async onSignedIn(): Promise<void> {
    this.syncAchievements();
    const cloud = await this.download();
    const local = this.save.data;
    const choice = chooseSave(local, cloud);
    if (choice === 'upload') void this.upload(true);
    else if (choice === 'cloud' && cloud) {
      if (isFreshSave(local)) {
        this.save.replace(cloud);
        window.location.reload();
        return;
      }
      this.offer = { cloud, localPlaySec: local.playTimeSec, cloudPlaySec: cloud.playTimeSec };
      this.offerListener?.(this.offer);
    }
  }

  private async download(): Promise<SaveData | null> {
    try {
      const { data } = await PlayGamesNative.loadGame({ name: PLAY_GAMES.saveSlot });
      return data ? this.migrate(JSON.parse(data)) : null;
    } catch (err) {
      console.warn('[cloud] download', err);
      return null;
    }
  }

  /** Upload the device save; throttled unless `force` (app pause, explicit sync). */
  async upload(force = false): Promise<boolean> {
    if (!this.signedIn || this.uploading || this.offer) return false;
    const now = Date.now();
    if (!force && now - this.lastUpload < PLAY_GAMES.uploadEverySec * 1000) return false;
    this.uploading = true;
    try {
      this.save.flush();
      const d = this.save.data;
      await PlayGamesNative.saveGame({
        name: PLAY_GAMES.saveSlot,
        data: JSON.stringify(d),
        description: `Dawnbound · ${Math.floor(d.playTimeSec / 3600)}h ${Math.floor((d.playTimeSec % 3600) / 60)}m`,
        playedMs: Math.round(d.playTimeSec * 1000),
      });
      this.lastUpload = now;
      return true;
    } catch (err) {
      console.warn('[cloud] upload', err);
      return false;
    } finally {
      this.uploading = false;
    }
  }

  /** Push every unlocked achievement that has a Play Games id (unlock is idempotent on Google's side). */
  syncAchievements(): void {
    if (!this.signedIn) return;
    for (const [local, at] of Object.entries(this.save.data.achievements)) {
      if (at) this.unlock(local);
    }
  }

  unlock(localId: string): void {
    const id = PLAY_GAMES.achievements[localId];
    if (!this.signedIn || !id) return;
    PlayGamesNative.unlockAchievement({ id }).catch((err) => console.warn('[cloud] achievement', err));
  }

  submit(board: LeaderboardKey, score: number): void {
    const id = PLAY_GAMES.leaderboards[board];
    if (!this.signedIn || !id || score <= 0) return;
    PlayGamesNative.submitScore({ id, score: Math.round(score) }).catch((err) => console.warn('[cloud] score', err));
  }

  showAchievements(): void {
    if (this.signedIn) PlayGamesNative.showAchievements().catch((err) => console.warn('[cloud] ui', err));
  }

  showLeaderboards(): void {
    if (this.signedIn) PlayGamesNative.showLeaderboard({}).catch((err) => console.warn('[cloud] ui', err));
  }
}
