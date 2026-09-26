import type { Element } from '@/data/types';

export const DEF_K = 80;

/** Defence mitigation: def 80 halves damage. */
export function mitigate(amount: number, def: number): number {
  return amount * (DEF_K / (DEF_K + Math.max(0, def)));
}

/** How much harder deeper monsters punch through armour (+35% per depth on the defence constant). */
export const ARMOR_PEN_PER_DEPTH = 0.35;

/**
 * Hits on the hero: armour works less against deeper monsters, so gear keeps mattering without trivialising
 * later depths (the same 138 defence blocks 63% at depth 1 but about 40% at depth 5). Depth 1 is unchanged.
 */
export function mitigateOnHero(amount: number, def: number, depth: number): number {
  const k = DEF_K * (1 + ARMOR_PEN_PER_DEPTH * Math.max(0, depth - 1));
  return amount * (k / (k + Math.max(0, def)));
}

export interface HitInput {
  base: number;
  mult?: number;
  element: Element;
  critChance: number;
  critDmg: number;
  /** Bonus % for the element from the attacker's stats. */
  elementBonus?: number;
  targetDef: number;
  targetResist?: number;
  /** Extra multiplier on the target (vulnerable, shocked, boss bonus). */
  targetTakenMult?: number;
  roll: () => number;
}

export interface HitResult {
  amount: number;
  crit: boolean;
}

export function computeHit(h: HitInput): HitResult {
  const crit = h.roll() * 100 < h.critChance;
  let dmg = h.base * (h.mult ?? 1);
  dmg *= 1 + (h.elementBonus ?? 0) / 100;
  if (crit) dmg *= h.critDmg / 100;
  dmg = mitigate(dmg, h.targetDef);
  dmg *= 1 - Math.min(0.9, h.targetResist ?? 0);
  dmg *= h.targetTakenMult ?? 1;
  const variance = 0.92 + h.roll() * 0.16;
  return { amount: Math.max(1, Math.round(dmg * variance)), crit };
}

export type StatusKind = 'burn' | 'poison' | 'chill' | 'freeze' | 'shock' | 'bleed' | 'weaken' | 'slow' | 'stun' | 'vulnerable' | 'mark';

export interface StatusDef {
  duration: number;
  maxStacks: number;
  /** Damage per second as a fraction of the applier's attack, per stack. */
  dps?: number;
  color: number;
}

export const STATUS: Record<StatusKind, StatusDef> = {
  burn: { duration: 3, maxStacks: 1, dps: 0.35, color: 0xff7a2f },
  poison: { duration: 4, maxStacks: 6, dps: 0.12, color: 0x8fdc4a },
  chill: { duration: 2.5, maxStacks: 3, color: 0x9ee8ff },
  freeze: { duration: 1.3, maxStacks: 1, color: 0xc8f4ff },
  shock: { duration: 3, maxStacks: 1, color: 0xfff27a },
  bleed: { duration: 3, maxStacks: 3, dps: 0.2, color: 0xe0304a },
  weaken: { duration: 3, maxStacks: 1, color: 0x9a8ab0 },
  slow: { duration: 2, maxStacks: 1, color: 0x7a8ab0 },
  stun: { duration: 0.8, maxStacks: 1, color: 0xffffff },
  vulnerable: { duration: 3, maxStacks: 1, color: 0xff9ad0 },
  mark: { duration: 5, maxStacks: 1, color: 0xff4f6d },
};

export interface StatusState {
  kind: StatusKind;
  time: number;
  stacks: number;
  /** Attack value of whoever applied it (for DoT). */
  power: number;
}

export class StatusSet {
  private map = new Map<StatusKind, StatusState>();

  apply(kind: StatusKind, power: number, durationMul = 1, maxStacks?: number): StatusState {
    const def = STATUS[kind];
    const cur = this.map.get(kind);
    if (cur) {
      cur.time = Math.max(cur.time, def.duration * durationMul);
      cur.stacks = Math.min(maxStacks ?? def.maxStacks, cur.stacks + 1);
      cur.power = Math.max(cur.power, power);
      return cur;
    }
    const s: StatusState = { kind, time: def.duration * durationMul, stacks: 1, power };
    this.map.set(kind, s);
    return s;
  }

  has(kind: StatusKind): boolean {
    return this.map.has(kind);
  }

  get(kind: StatusKind): StatusState | undefined {
    return this.map.get(kind);
  }

  remove(kind: StatusKind): void {
    this.map.delete(kind);
  }

  clear(): void {
    this.map.clear();
  }

  /** Advance timers; returns DoT damage dealt this tick. */
  tick(dt: number): number {
    let dot = 0;
    for (const [k, s] of this.map) {
      const def = STATUS[k];
      if (def.dps) dot += def.dps * s.power * s.stacks * dt;
      s.time -= dt;
      if (s.time <= 0) this.map.delete(k);
    }
    return dot;
  }

  /** Movement multiplier from chill / slow / freeze / stun. */
  speedMult(): number {
    if (this.map.has('freeze') || this.map.has('stun')) return 0;
    let m = 1;
    const chill = this.map.get('chill');
    if (chill) m *= 1 - 0.18 * chill.stacks;
    if (this.map.has('slow')) m *= 0.6;
    return Math.max(0.15, m);
  }

  canAct(): boolean {
    return !this.map.has('freeze') && !this.map.has('stun');
  }

  /** Damage taken multiplier. */
  takenMult(): number {
    let m = 1;
    if (this.map.has('vulnerable')) m *= 1.25;
    if (this.map.has('shock')) m *= 1.15;
    if (this.map.has('mark')) m *= 1.2;
    if (this.map.has('freeze')) m *= 1.1;
    return m;
  }

  dealtMult(): number {
    return this.map.has('weaken') ? 0.75 : 1;
  }

  kinds(): StatusKind[] {
    return [...this.map.keys()];
  }
}

export function elementOfStatus(kind: StatusKind): Element {
  switch (kind) {
    case 'burn': return 'fire';
    case 'chill':
    case 'freeze': return 'ice';
    case 'shock': return 'shock';
    case 'poison': return 'poison';
    default: return 'physical';
  }
}

/** XP needed to go from level n to n+1 during a run. */
export function xpForLevel(level: number): number {
  return Math.round(12 + level * 9 + level * level * 1.6);
}
