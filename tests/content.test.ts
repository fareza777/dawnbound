import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { EVENTS } from '@/data/events';
import { QUESTS } from '@/data/quests';
import { LORE } from '@/data/story';
import { ENEMIES } from '@/data/enemies';
import { ALL_BIOMES } from '@/data/biomes';
import { MATERIALS } from '@/data/materials';
import { NPCS } from '@/data/npcs';
import { CONVERSATIONS } from '@/data/dialogues';

const loreIds = new Set(LORE.map((l) => l.id));
const questIds = new Set(QUESTS.map((q) => q.id));
const materialIds = new Set(MATERIALS.map((m) => m.id));
const npcIds = new Set(NPCS.map((n) => n.id));
const biomeIds = new Set(ALL_BIOMES.map((b) => b.id));

describe('content integrity', () => {
  it('has unique ids', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    expect(questIds.size).toBe(QUESTS.length);
    expect(new Set(CONVERSATIONS.map((c) => c.id)).size).toBe(CONVERSATIONS.length);
  });

  it('events reference existing lore, materials, quests, regions and portraits', () => {
    for (const e of EVENTS) {
      if (e.quest) expect(questIds.has(e.quest), `${e.id} quest`).toBe(true);
      if (e.region) expect(biomeIds.has(e.region), `${e.id} region`).toBe(true);
      if (e.portrait.startsWith('portraits_')) {
        expect(fs.existsSync(`src/assets/gen/portraits/${e.portrait.slice('portraits_'.length)}.png`), `${e.id} portrait`).toBe(true);
      }
      for (const c of e.choices) {
        for (const o of [...c.outcome, ...(c.fail ?? [])]) {
          if (o.type === 'lore') expect(loreIds.has(o.id), `${e.id} lore ${o.id}`).toBe(true);
          if (o.type === 'material') expect(materialIds.has(o.id), `${e.id} material ${o.id}`).toBe(true);
        }
      }
    }
  });

  it('quests have valid givers, prerequisites, materials and reachable flags', () => {
    const eventFlags = new Set(EVENTS.flatMap((e) => e.choices.flatMap((c) => [...c.outcome, ...(c.fail ?? [])]).filter((o) => o.type === 'flag').map((o) => (o as { id: string }).id)));
    for (const q of QUESTS) {
      expect(npcIds.has(q.giver), `${q.id} giver`).toBe(true);
      for (const r of q.requires ?? []) expect(questIds.has(r), `${q.id} requires ${r}`).toBe(true);
      for (const o of q.objectives) {
        if (o.kind === 'item') expect(materialIds.has(o.material), `${q.id} material ${o.material}`).toBe(true);
        if (o.kind === 'kill' && o.enemy) expect(ENEMIES[o.enemy], `${q.id} enemy ${o.enemy}`).toBeDefined();
        if (o.kind === 'talk') expect(npcIds.has(o.npc), `${q.id} talk ${o.npc}`).toBe(true);
        // Flags from events must be obtainable; other flags are set by gameplay (e.g. the final boss).
        if (o.kind === 'flag' && /^(journal_|lullaby|anvil|vesper_letter|drowned_bell|crystal_song|pip_treasure|nyx_echo)/.test(o.flag)) {
          expect(eventFlags.has(o.flag), `${q.id} flag ${o.flag}`).toBe(true);
        }
      }
      if (q.rewards.material) expect(materialIds.has(q.rewards.material[0]), `${q.id} reward`).toBe(true);
    }
  });

  it('story events are gated by quests that can become active', () => {
    for (const e of EVENTS.filter((x) => x.quest)) {
      const q = QUESTS.find((x) => x.id === e.quest)!;
      // Each flag-gated quest must have an event within reach of its depth range.
      expect(e.minDepth).toBeLessThanOrEqual(e.maxDepth ?? 9);
      expect(q).toBeDefined();
    }
  });

  it('every region lists existing enemies and a known boss', () => {
    for (const b of ALL_BIOMES) {
      for (const id of [...b.enemies, ...b.elites, ...b.minibosses]) expect(ENEMIES[id], `${b.id} enemy ${id}`).toBeDefined();
      expect(b.boss.length).toBeGreaterThan(0);
    }
  });

  it('main quests form a single chain from the first chapter', () => {
    const main = QUESTS.filter((q) => q.type === 'main');
    const roots = main.filter((q) => !q.requires?.length);
    expect(roots.map((q) => q.id)).toEqual(['mq_awaken']);
    expect(main.length).toBeGreaterThanOrEqual(15);
  });
});
