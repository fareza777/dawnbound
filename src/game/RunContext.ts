import type { Mod, StatBlock } from '@/data/stats';
import type { EffectRef } from '@/data/types';
import { computeStats } from '@/systems/stats';

/**
 * Aggregated modifiers and effect flags for the current run. Combat code queries effects by id
 * (e.g. has('burn_explode'), p('burn_explode', 0)) instead of registering callbacks, which keeps
 * boons, relics and legendary items purely data-driven.
 */
export class RunContext {
  stats: StatBlock;
  private effects = new Map<string, number[]>();
  private counts = new Map<string, number>();
  private sources: { mods: Mod[]; effects: EffectRef[] }[] = [];

  constructor(private baseOverrides: Partial<StatBlock>) {
    this.stats = computeStats([], baseOverrides);
  }

  setSources(sources: { mods: Mod[]; effects: EffectRef[] }[]): void {
    this.sources = sources;
    this.recompute();
  }

  recompute(): void {
    const mods: Mod[] = [];
    this.effects.clear();
    this.counts.clear();
    for (const s of this.sources) {
      mods.push(...s.mods);
      for (const e of s.effects) {
        const prev = this.effects.get(e.id);
        const p = e.p ?? [];
        // Repeated sources of the same effect stack their first parameter (magnitude) and keep other params.
        if (prev) {
          const merged = prev.slice();
          merged[0] = (merged[0] ?? 0) + (p[0] ?? 0);
          for (let i = 1; i < p.length; i++) if (merged[i] === undefined) merged[i] = p[i];
          this.effects.set(e.id, merged);
        } else this.effects.set(e.id, p.slice());
        this.counts.set(e.id, (this.counts.get(e.id) ?? 0) + 1);
      }
    }
    this.stats = computeStats(mods, this.baseOverrides);
  }

  has(id: string): boolean {
    return this.effects.has(id);
  }

  p(id: string, i = 0, fallback = 0): number {
    return this.effects.get(id)?.[i] ?? fallback;
  }

  count(id: string): number {
    return this.counts.get(id) ?? 0;
  }

  effectIds(): string[] {
    return [...this.effects.keys()];
  }
}
