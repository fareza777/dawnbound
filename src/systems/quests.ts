import { QUESTS, questById, type Objective, type QuestDef } from '@/data/quests';
import type { QuestState, SaveData } from '@/data/types';
import { vowHeat } from '@/data/vows';

/** Objective progress as (have, need). Counter objectives read save.stats / quest progress; state objectives read the save. */
export function objectiveProgress(s: SaveData, q: QuestDef, o: Objective, index: number): { have: number; need: number } {
  const st = s.quests[q.id];
  const counter = st?.progress[`o${index}`] ?? 0;
  switch (o.kind) {
    case 'talk': return { have: counter, need: 1 };
    case 'flag': return { have: s.flags[o.flag] ? 1 : 0, need: 1 };
    case 'kill': return { have: counter, need: o.count };
    case 'killElite': return { have: counter, need: o.count };
    case 'boss': return { have: s.unlocks.bossesDefeated.includes(o.boss) ? 1 : 0, need: 1 };
    case 'depth': return { have: Math.min(o.depth, s.unlocks.maxDepthReached), need: o.depth };
    case 'item': return { have: Math.min(o.count, s.materials[o.material] ?? 0), need: o.count };
    case 'runs': return { have: counter, need: o.count };
    case 'stat': return { have: Math.min(o.count, counter), need: o.count };
    case 'events': return { have: Math.min(o.count, s.codex.events.length), need: o.count };
    case 'upgrade': return { have: s.inventory.some((i) => i.plus >= o.level) ? 1 : 0, need: 1 };
    case 'rarity': return { have: s.inventory.some((i) => i.rarity >= o.rarity) ? 1 : 0, need: 1 };
    case 'gold': return { have: Math.min(o.count, s.currency.gold), need: o.count };
    case 'shards': return { have: Math.min(o.count, s.currency.shards), need: o.count };
    case 'heatDepth': return { have: s.flags[`heat${o.heat}_depth${o.depth}`] ? 1 : 0, need: 1 };
  }
}

export function isComplete(s: SaveData, q: QuestDef): boolean {
  return q.objectives.every((o, i) => {
    const p = objectiveProgress(s, q, o, i);
    return p.have >= p.need;
  });
}

function ensure(s: SaveData, id: string): QuestState {
  if (!s.quests[id]) s.quests[id] = { status: 'locked', stage: 0, progress: {} };
  return s.quests[id];
}

export interface QuestChange {
  id: string;
  kind: 'new' | 'complete';
}

/**
 * Unlock quests whose prerequisites are claimed and mark active quests complete when their objectives are met.
 * Returns the list of changes so the UI can notify the player.
 */
export function refreshQuests(s: SaveData): QuestChange[] {
  const changes: QuestChange[] = [];
  migrateOffers(s);
  for (const q of QUESTS) {
    const st = ensure(s, q.id);
    if (st.status === 'locked') {
      const ok = (q.requires ?? []).every((r) => s.quests[r]?.status === 'claimed');
      if (ok && q.type === 'side') {
        // Side quests wait for the player to talk to their giver (see acceptQuest).
        st.status = 'available';
      } else if (ok) {
        st.status = 'active';
        changes.push({ id: q.id, kind: 'new' });
        if (!s.trackedQuest || s.quests[s.trackedQuest]?.status === 'claimed') s.trackedQuest = q.id;
      }
    }
    if (st.status === 'active' && isComplete(s, q)) {
      st.status = 'complete';
      changes.push({ id: q.id, kind: 'complete' });
    }
  }
  if (s.trackedQuest && s.quests[s.trackedQuest]?.status === 'claimed') s.trackedQuest = nextTracked(s);
  return changes;
}

/** The giver offers the quest in conversation: it becomes active (and tracked if nothing else is). */
export function acceptQuest(s: SaveData, id: string): boolean {
  const st = s.quests[id];
  if (!st || st.status !== 'available') return false;
  st.status = 'active';
  if (!s.trackedQuest || s.quests[s.trackedQuest]?.status === 'claimed') s.trackedQuest = id;
  return true;
}

/**
 * Older saves started every unlocked side quest automatically. Ones the player never heard about (no offer
 * conversation, no progress) go back to "available" so their giver can offer them properly.
 */
function migrateOffers(s: SaveData): void {
  if (s.flags.questOffers) return;
  s.flags.questOffers = 1;
  for (const q of QUESTS) {
    const st = s.quests[q.id];
    if (q.type !== 'side' || st?.status !== 'active') continue;
    const touched = Object.values(st.progress).some((v) => v > 0) || s.seenDialogues.includes(`offer_${q.id}`);
    if (!touched) st.status = 'available';
  }
  if (s.trackedQuest && s.quests[s.trackedQuest]?.status === 'available') s.trackedQuest = null;
}

export function nextTracked(s: SaveData): string | null {
  const main = QUESTS.find((q) => q.type === 'main' && (s.quests[q.id]?.status === 'active' || s.quests[q.id]?.status === 'complete'));
  if (main) return main.id;
  const side = QUESTS.find((q) => s.quests[q.id]?.status === 'active' || s.quests[q.id]?.status === 'complete');
  return side?.id ?? null;
}

/** Add to counter-style objectives of every active quest matching the predicate. */
export function bumpObjectives(s: SaveData, match: (o: Objective) => boolean, amount = 1): void {
  for (const q of QUESTS) {
    const st = s.quests[q.id];
    if (!st || st.status !== 'active') continue;
    q.objectives.forEach((o, i) => {
      if (!match(o)) return;
      const key = `o${i}`;
      st.progress[key] = (st.progress[key] ?? 0) + amount;
    });
  }
}

/** Hand in a completed quest: consumes items/gold if required and applies rewards. Returns the def or null. */
export function claimQuest(s: SaveData, id: string): QuestDef | null {
  const q = questById(id);
  const st = s.quests[id];
  if (!q || !st || st.status !== 'complete') return null;
  if (!isComplete(s, q)) {
    st.status = 'active';
    return null;
  }
  if (q.consume) {
    for (const o of q.objectives) {
      if (o.kind === 'item') s.materials[o.material] = Math.max(0, (s.materials[o.material] ?? 0) - o.count);
      if (o.kind === 'gold') s.currency.gold -= o.count;
    }
  }
  const r = q.rewards;
  if (r.embers) s.currency.embers += r.embers;
  if (r.gold) s.currency.gold += r.gold;
  if (r.shards) s.currency.shards += r.shards;
  if (r.hero && !s.unlocks.heroes.includes(r.hero)) s.unlocks.heroes.push(r.hero);
  if (r.feature && !s.unlocks.features.includes(r.feature)) s.unlocks.features.push(r.feature);
  if (r.flag) s.flags[r.flag] = 1;
  if (r.material) s.materials[r.material[0]] = (s.materials[r.material[0]] ?? 0) + r.material[1];
  st.status = 'claimed';
  return q;
}

/** Record reaching a depth with the run's heat for heatDepth objectives. */
export function recordHeatDepth(s: SaveData, vows: Record<string, number>, depth: number): void {
  const heat = vowHeat(vows);
  for (let h = 1; h <= heat; h++) for (let d = 1; d <= depth; d++) s.flags[`heat${h}_depth${d}`] = 1;
}
