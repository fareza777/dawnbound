/** Tiny typed event bus used by game systems (quests, achievements, codex) to observe gameplay without coupling. */

export interface GameEvents {
  enemyKilled: { enemyId: string; elite: boolean; boss: boolean; biome: string };
  bossDefeated: { bossId: string; depth: number };
  roomCleared: { kind: string; depth: number; floor: number };
  itemFound: { itemId: string; rarity: number };
  relicFound: { relicId: string };
  boonTaken: { boonId: string; spirit: string };
  goldGained: { amount: number };
  materialGained: { materialId: string; amount: number };
  runStarted: { seed: number; heroId: string; daily: boolean };
  runEnded: { victory: boolean; depth: number; floor: number; kills: number; timeSec: number };
  depthReached: { depth: number };
  npcTalked: { npcId: string };
  eventChoice: { eventId: string; choice: string };
  shrineVisited: { spirit: string };
  itemCrafted: { itemId: string };
  itemUpgraded: { level: number };
  cropHarvested: { seedId: string };
  loreFound: { loreId: string };
  secretFound: { secretId: string };
  potionUsed: Record<string, never>;
  dashUsed: Record<string, never>;
  damageTaken: { amount: number };
  questCompleted: { questId: string };
  purchase: { shop: string; cost: number };
  petFound: { petId: string };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        (fn as Handler<GameEvents[K]>)(payload);
      } catch (err) {
        console.error(`[events] handler for ${String(type)} failed`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const bus = new EventBus();
