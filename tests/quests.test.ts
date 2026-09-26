import { describe, expect, it } from 'vitest';
import { newSave } from '@/core/save';
import { acceptQuest, bumpObjectives, claimQuest, refreshQuests, objectiveProgress, recordHeatDepth } from '@/systems/quests';
import { QUESTS, questById } from '@/data/quests';

describe('quest chain', () => {
  it('starts with only the first main quest active', () => {
    const s = newSave();
    const changes = refreshQuests(s);
    expect(changes.map((c) => c.id)).toEqual(['mq_awaken']);
    expect(s.trackedQuest).toBe('mq_awaken');
  });

  it('progresses talk -> training -> descend in order', () => {
    const s = newSave();
    refreshQuests(s);
    bumpObjectives(s, (o) => o.kind === 'talk' && o.npc === 'maren');
    refreshQuests(s);
    expect(s.quests.mq_awaken.status).toBe('complete');
    expect(claimQuest(s, 'mq_awaken')).toBeTruthy();
    expect(s.currency.embers).toBe(20);
    refreshQuests(s);
    expect(s.quests.mq_training.status).toBe('active');
    expect(s.quests.mq_descend.status).toBe('locked');
    bumpObjectives(s, (o) => o.kind === 'stat' && o.stat === 'dummyHits', 10);
    refreshQuests(s);
    claimQuest(s, 'mq_training');
    expect(s.flags.rift_open).toBe(1);
    refreshQuests(s);
    expect(s.quests.mq_descend.status).toBe('active');
    // Side quests wait for their giver: offered (available) until the player talks to them.
    expect(s.quests.sq_cat.status).toBe('available');
    expect(acceptQuest(s, 'sq_cat')).toBe(true);
    expect(s.quests.sq_cat.status).toBe('active');
  });

  it('boss objectives read defeated bosses', () => {
    const s = newSave();
    const q = questById('mq_gorehorn')!;
    expect(objectiveProgress(s, q, q.objectives[0], 0).have).toBe(0);
    s.unlocks.bossesDefeated.push('gorehorn');
    expect(objectiveProgress(s, q, q.objectives[0], 0).have).toBe(1);
  });

  it('consumes items on claim and unlocks rewards', () => {
    const s = newSave();
    for (const id of ['mq_awaken', 'mq_training']) s.quests[id] = { status: 'claimed', stage: 0, progress: {} };
    refreshQuests(s);
    acceptQuest(s, 'sq_cat');
    s.materials.q_cat_bell = 1;
    refreshQuests(s);
    expect(s.quests.sq_cat.status).toBe('complete');
    claimQuest(s, 'sq_cat');
    expect(s.materials.q_cat_bell).toBe(0);
    expect(s.flags.cat_home).toBe(1);
  });

  it('cannot claim if items were spent after completion', () => {
    const s = newSave();
    for (const id of ['mq_awaken', 'mq_training', 'mq_descend']) s.quests[id] = { status: 'claimed', stage: 0, progress: {} };
    refreshQuests(s);
    acceptQuest(s, 'sq_debt');
    s.currency.gold = 600;
    refreshQuests(s);
    expect(s.quests.sq_debt.status).toBe('complete');
    s.currency.gold = 100;
    expect(claimQuest(s, 'sq_debt')).toBeNull();
    expect(s.quests.sq_debt.status).toBe('active');
  });

  it('heat depth records every lower combination', () => {
    const s = newSave();
    recordHeatDepth(s, { v_hp: 2, v_atk: 1 }, 3);
    expect(s.flags.heat3_depth3).toBe(1);
    expect(s.flags.heat1_depth2).toBe(1);
  });

  it('every quest giver and requirement exists', () => {
    const ids = new Set(QUESTS.map((q) => q.id));
    for (const q of QUESTS) for (const r of q.requires ?? []) expect(ids.has(r), `${q.id} requires ${r}`).toBe(true);
  });

  it('side quests only progress after being accepted, and old saves are migrated', () => {
    const s = newSave();
    for (const id of ['mq_awaken', 'mq_training']) s.quests[id] = { status: 'claimed', stage: 0, progress: {} };
    refreshQuests(s);
    s.materials.q_cat_bell = 1;
    refreshQuests(s);
    expect(s.quests.sq_cat.status).toBe('available');
    expect(acceptQuest(s, 'sq_cat')).toBe(true);
    expect(acceptQuest(s, 'sq_cat')).toBe(false);

    const old = newSave();
    old.quests.sq_cat = { status: 'active', stage: 0, progress: {} };
    old.quests.sq_debt = { status: 'active', stage: 0, progress: { o0: 2 } };
    old.trackedQuest = 'sq_cat';
    refreshQuests(old);
    expect(old.quests.sq_cat.status).toBe('available');
    expect(old.quests.sq_debt.status).toBe('active');
    expect(old.trackedQuest).not.toBe('sq_cat');
  });
});
