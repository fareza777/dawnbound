/** Global service locator, filled during boot. Kept tiny so pure systems (tests) never depend on it. */
import type { AudioManager } from './audio';
import type { Platform } from './platform';
import type { SaveManager } from './save';
import type { Ads } from './ads';
import type { Store } from './store';
import type { CloudSave } from './cloudSave';

export interface Services {
  audio?: AudioManager;
  platform?: Platform;
  save?: SaveManager;
  ads?: Ads;
  store?: Store;
  cloud?: CloudSave;
  notify?: (text: string, color?: number, sfx?: string) => void;
}

export const services: Services = {};
