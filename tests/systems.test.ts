import { describe, expect, it } from 'vitest';
import { computeHit, mitigate, StatusSet, STATUS, xpForLevel } from '@/systems/combat';
import { claimBounty, ensureBounties, generateBounties, progressBounty, today } from '@/systems/bounties';
import { ACHIEVEMENTS } from '@/data/achievements';
import { newSave } from '@/core/save';
import { getLang, setLang, t, tr } from '@/core/i18n';
import { computeViewport, snapWorld } from '@/core/viewport';

describe('combat maths', () => {
  it('mitigates damage with diminishing returns on defense', () => {
    expect(mitigate(100, 0)).toBe(100);
    expect(mitigate(100, 80)).toBeCloseTo(50);
    expect(mitigate(100, 160)).toBeGreaterThan(30);
  });

  it('applies crits, element bonus and resistances', () => {
    const always = () => 0; // crit roll passes, lowest variance
    const hit = computeHit({ base: 100, element: 'fire', critChance: 50, critDmg: 200, elementBonus: 50, targetDef: 0, targetResist: 0.5, roll: always });
    expect(hit.crit).toBe(true);
    // 100 * 1.5 (element) * 2 (crit) * 0.5 (resist) * 0.92 (min variance)
    expect(hit.amount).toBe(138);
    const never = () => 0.999;
    expect(computeHit({ base: 10, element: 'physical', critChance: 0, critDmg: 200, targetDef: 0, roll: never }).crit).toBe(false);
  });

  it('never deals less than 1', () => {
    expect(computeHit({ base: 0.1, element: 'physical', critChance: 0, critDmg: 150, targetDef: 999, roll: () => 0.5 }).amount).toBe(1);
  });

  it('needs more XP for every level', () => {
    for (let l = 1; l < 30; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
  });
});

describe('status effects', () => {
  it('stacks up to the maximum and expires', () => {
    const st = new StatusSet();
    for (let i = 0; i < 10; i++) st.apply('poison', 10);
    expect(st.get('poison')!.stacks).toBe(STATUS.poison.maxStacks);
    st.tick(STATUS.poison.duration + 0.1);
    expect(st.has('poison')).toBe(false);
  });

  it('deals damage over time from burning', () => {
    const st = new StatusSet();
    st.apply('burn', 20);
    expect(st.tick(1)).toBeCloseTo(STATUS.burn.dps! * 20);
  });

  it('freezes and slows movement, and changes damage taken and dealt', () => {
    const st = new StatusSet();
    st.apply('chill', 1);
    expect(st.speedMult()).toBeLessThan(1);
    expect(st.canAct()).toBe(true);
    st.apply('freeze', 1);
    expect(st.speedMult()).toBe(0);
    expect(st.canAct()).toBe(false);
    st.apply('vulnerable', 1);
    expect(st.takenMult()).toBeGreaterThan(1.25);
    st.apply('weaken', 1);
    expect(st.dealtMult()).toBe(0.75);
    st.clear();
    expect(st.kinds()).toEqual([]);
  });
});

describe('bounties', () => {
  it('are the same for everyone on a day and refresh the next day', () => {
    const d = today(Date.UTC(2026, 8, 24, 10));
    expect(generateBounties(d, 3)).toEqual(generateBounties(d, 3));
    expect(generateBounties(d + 1, 3)).not.toEqual(generateBounties(d, 3));
  });

  it('progress, complete once, and pay out only once', () => {
    const s = newSave();
    ensureBounties(s, Date.UTC(2026, 8, 24, 10));
    const b = s.bounties.list[0];
    const done = progressBounty(s, b.kind, b.need * 2, b.target ?? '');
    expect(done.map((x) => x.id)).toContain(b.id);
    const embers = s.currency.embers;
    expect(claimBounty(s, b.id)).not.toBeNull();
    expect(s.currency.embers).toBe(embers + b.reward.embers);
    expect(claimBounty(s, b.id)).toBeNull();
  });
});

describe('achievements', () => {
  it('start locked on a new save', () => {
    const s = newSave();
    expect(ACHIEVEMENTS.filter((a) => a.check(s)).map((a) => a.id)).toEqual([]);
  });

  it('unlock from progress (first run, 100 kills)', () => {
    const s = newSave();
    s.stats.runs = 1;
    s.stats.playRuns = 1;
    s.stats.kills = 150;
    const got = ACHIEVEMENTS.filter((a) => a.check(s)).map((a) => a.id);
    expect(got).toContain('a_kills_100');
  });
});

describe('localization', () => {
  it('translates, fills variables and falls back to English', () => {
    setLang('id');
    expect(tr({ en: 'Hello {n}', id: 'Halo {n}' }, { n: 3 })).toBe('Halo 3');
    expect(tr({ en: 'Only English', id: '' })).toBe('Only English');
    expect(t('no_such_key')).toBe('no_such_key');
    setLang('en');
    expect(getLang()).toBe('en');
  });
});

describe('viewport', () => {
  it('renders phones at device resolution with a ~360 px wide virtual screen', () => {
    const vp = computeViewport(393, 852, 2.75);
    expect(vp.res).toBe(3);
    expect(vp.width).toBeGreaterThanOrEqual(340);
    expect(vp.width).toBeLessThanOrEqual(420);
  });

  it('uses half resolution on 1440p (4x) screens and 1x in low quality', () => {
    expect(computeViewport(412, 915, 3.5).res).toBeLessThanOrEqual(3);
    expect(computeViewport(393, 852, 2.75, false).res).toBe(1);
  });

  it('snaps world positions to the device pixel grid', () => {
    expect(snapWorld(10.37, 2) * 2 * 1).toBeCloseTo(Math.round(10.37 * 2));
  });
});
