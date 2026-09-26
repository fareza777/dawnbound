import type { L10n, Lang } from '@/core/i18n';
import type { Mod } from './stats';

export type Slot = 'weapon' | 'helm' | 'armor' | 'boots' | 'ring' | 'amulet' | 'charm';
export const SLOTS: Slot[] = ['weapon', 'helm', 'armor', 'boots', 'ring', 'amulet', 'charm'];
export type Rarity = 0 | 1 | 2 | 3 | 4 | 5;
export type Element = 'physical' | 'fire' | 'ice' | 'shock' | 'poison' | 'holy' | 'shadow';

export interface RolledAffix {
  id: string;
  value: number;
}

export interface ItemInstance {
  uid: string;
  baseId: string;
  rarity: Rarity;
  ilvl: number;
  plus: number;
  affixes: RolledAffix[];
  uniqueId?: string;
  setId?: string;
  locked?: boolean;
  isNew?: boolean;
}

export interface EffectRef {
  id: string;
  /** Free-form numeric params interpreted by the effect implementation. */
  p?: number[];
}

export interface Settings {
  musicVol: number;
  sfxVol: number;
  vibration: boolean;
  screenShake: number;
  damageNumbers: boolean;
  autoAttack: boolean;
  joystick: 'floating' | 'fixed';
  lang: Lang;
  quality: 'low' | 'high';
  /** Set once the player picks a quality; until then it is chosen automatically per device. */
  qualityUser?: boolean;
  showFps: boolean;
  /** Body and small text size multiplier (1, 1.15 or 1.3); applied at startup. */
  textScale?: number;
  /** Accessibility: no screen shake, softer flashes and fewer trails. */
  reduceMotion?: boolean;
  /** Accessibility: status colours that stay distinct with red-green colour blindness. */
  colorblind?: boolean;
}

export type NodeKind =
  | 'start' | 'combat' | 'elite' | 'treasure' | 'shop' | 'shrine' | 'event' | 'rest' | 'challenge' | 'mystery' | 'boss';

export interface MapNode {
  id: string;
  row: number;
  lane: number;
  kind: NodeKind;
  next: string[];
  /** Pre-rolled content key (spirit for shrines, event id, room template) so a reload shows the same thing. */
  content?: string;
  modifier?: string;
}

export interface FloorMap {
  depth: number;
  floor: number;
  rows: number;
  lanes: number;
  nodes: MapNode[];
}

export interface OwnedBoon {
  id: string;
  rank: number;
}

export interface RunState {
  seed: number;
  heroId: string;
  skin: number;
  daily: boolean;
  vows: Record<string, number>;
  depth: number;
  floor: number;
  map: FloorMap;
  nodeId: string;
  visited: string[];
  hp: number;
  shield: number;
  level: number;
  xp: number;
  gold: number;
  boons: OwnedBoon[];
  relics: string[];
  flaskCharges: number;
  keys: number;
  kills: number;
  eliteKills: number;
  timeSec: number;
  roomsCleared: number;
  rerolls: number;
  itemsFound: string[];
  materialsFound: Record<string, number>;
  embersFound: number;
  loreFound: string[];
  curses: string[];
  /** Counter used to derive a unique RNG stream per room. */
  roomCounter: number;
  bossesKilled: string[];
  deathSaves: number;
  /** Rewarded-ad revive already used this run. */
  adRevived?: boolean;
  /** Extra boon reroll from a rewarded ad already used this run. */
  adReroll?: boolean;
  /** Region rolled for each depth (depth → biome id); missing = the main biome. */
  regions?: Record<string, string>;
  /** Endless Depths run: continues past the fifth depth instead of ending in victory. */
  endless?: boolean;
  /** Weekly mutator active when the run started (see data/mutators). */
  mutator?: string;
  damageTaken?: number;
  potionsUsed?: number;
  bonusMaxHp?: number;
}

/** 'available' = offered by its NPC (gold !) but not taken yet: side quests start when you talk to the giver. */
export type QuestStatus = 'locked' | 'available' | 'active' | 'complete' | 'claimed';

export interface QuestState {
  status: QuestStatus;
  stage: number;
  progress: Record<string, number>;
}

export interface GardenPlot {
  seedId: string | null;
  plantedAtRun: number;
}

export interface Bounty {
  id: string;
  kind: 'kill' | 'killElite' | 'clearRooms' | 'reachDepth' | 'collectGold' | 'noPotion' | 'shrines';
  target: string;
  need: number;
  have: number;
  reward: { embers: number; gold: number; material?: string; amount?: number };
  done: boolean;
  claimed: boolean;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  playTimeSec: number;
  settings: Settings;
  profile: {
    heroId: string;
    skins: Record<string, number>;
    onboardingDone: boolean;
    introSeen: boolean;
    tutorialDone: boolean;
    name: string;
  };
  unlocks: {
    heroes: string[];
    bossesDefeated: string[];
    maxDepthReached: number;
    features: string[];
    skinsOwned: string[];
    tracks: string[];
  };
  currency: { gold: number; embers: number; shards: number };
  /** Monetization state: the Remove Ads entitlement (cached from the Play Store) and ad pacing. */
  shop: {
    noAds: boolean;
    /** Natural breaks (run ends, depth changes) seen, for "every Nth break" interstitial pacing. */
    adBreaks: number;
    lastInterstitialAt: number;
    /** Day number of the last claimed daily gift. */
    giftDay: number;
  };
  inventory: ItemInstance[];
  equipped: Partial<Record<Slot, string>>;
  materials: Record<string, number>;
  elixirs: Record<string, number>;
  activeElixir: string | null;
  talents: Record<string, number>;
  flaskLevel: number;
  quests: Record<string, QuestState>;
  trackedQuest: string | null;
  bounties: { day: number; list: Bounty[] };
  codex: {
    enemies: Record<string, number>;
    items: string[];
    relics: string[];
    boons: string[];
    lore: string[];
    events: string[];
  };
  stats: Record<string, number>;
  achievements: Record<string, number>;
  garden: GardenPlot[];
  flags: Record<string, number>;
  vows: Record<string, number>;
  run: RunState | null;
  daily: { lastDay: number; best: number };
  seenDialogues: string[];
  itemCounter: number;
}

export interface Localized {
  name: L10n;
  desc?: L10n;
}

export interface ModSource {
  mods: Mod[];
}
