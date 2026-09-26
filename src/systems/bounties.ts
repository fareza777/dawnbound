import { Rng } from '@/core/rng';
import { BIOMES } from '@/data/biomes';
import { ENEMIES } from '@/data/enemies';
import type { Bounty, SaveData } from '@/data/types';

export function today(now = Date.now()): number {
  return Math.floor(now / 86400000);
}

/** Three rotating daily bounties scaled to how deep the player has been. */
export function generateBounties(day: number, maxDepth: number): Bounty[] {
  const rng = new Rng(`bounty:${day}`);
  const depth = Math.max(1, Math.min(5, maxDepth || 1));
  const out: Bounty[] = [];
  const biome = BIOMES[rng.int(0, depth - 1)];
  const enemy = rng.pick(biome.enemies.filter((id) => (ENEMIES[id].weight ?? 0) > 0));
  const kinds: Bounty['kind'][] = rng.shuffle(['kill', 'killElite', 'clearRooms', 'shrines', 'collectGold', 'reachDepth']);
  for (const kind of kinds.slice(0, 3)) {
    const scale = 1 + (depth - 1) * 0.5;
    let need = 1;
    let target = '';
    switch (kind) {
      case 'kill': need = rng.int(12, 25); target = enemy; break;
      case 'killElite': need = rng.int(2, 4); break;
      case 'clearRooms': need = rng.int(6, 12); break;
      case 'shrines': need = rng.int(1, 2); break;
      case 'collectGold': need = rng.int(150, 300) * Math.round(scale); break;
      case 'reachDepth': need = Math.min(5, depth + (rng.chance(0.5) ? 1 : 0)); break;
      default: break;
    }
    out.push({
      id: `b${day}_${out.length}`, kind, target, need, have: 0,
      reward: { embers: Math.round(rng.int(25, 45) * scale), gold: Math.round(rng.int(40, 90) * scale) },
      done: false, claimed: false,
    });
  }
  return out;
}

export function ensureBounties(s: SaveData, now = Date.now()): void {
  const d = today(now);
  if (s.bounties.day !== d || s.bounties.list.length === 0) {
    s.bounties = { day: d, list: generateBounties(d, s.unlocks.maxDepthReached) };
  }
}

export function progressBounty(s: SaveData, kind: Bounty['kind'], amount: number, target = ''): Bounty[] {
  const finished: Bounty[] = [];
  for (const b of s.bounties.list) {
    if (b.done || b.kind !== kind) continue;
    if (b.target && b.target !== target) continue;
    b.have = kind === 'reachDepth' ? Math.max(b.have, amount) : b.have + amount;
    if (b.have >= b.need) {
      b.have = b.need;
      b.done = true;
      finished.push(b);
    }
  }
  return finished;
}

export function claimBounty(s: SaveData, id: string): Bounty | null {
  const b = s.bounties.list.find((x) => x.id === id);
  if (!b || !b.done || b.claimed) return null;
  b.claimed = true;
  s.currency.embers += b.reward.embers;
  s.currency.gold += b.reward.gold;
  return b;
}
