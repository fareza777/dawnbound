import { bus } from '@/core/events';
import { services } from '@/core/services';
import { t, tr } from '@/core/i18n';
import { questById } from '@/data/quests';
import { ACHIEVEMENTS } from '@/data/achievements';
import { bumpObjectives, recordHeatDepth, refreshQuests } from '@/systems/quests';
import { ensureBounties, progressBounty } from '@/systems/bounties';
import { COLORS } from '@/ui/theme';

export type Notify = (text: string, color?: number, sfx?: string) => void;

function notify(text: string, color: number = COLORS.gold, sfx?: string): void {
  services.notify?.(text, color, sfx);
}

/** Re-evaluate quests and achievements, emitting notifications for any change. */
export function checkProgress(): void {
  const s = services.save?.data;
  if (!s) return;
  for (const c of refreshQuests(s)) {
    const q = questById(c.id);
    if (!q) continue;
    if (c.kind === 'new') notify(t('questNew', { q: tr(q.title) }), COLORS.cyan, 'quest_new');
    else notify(t('questComplete', { q: tr(q.title) }), COLORS.gold, 'quest_complete');
  }
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    if (a.check(s)) {
      s.achievements[a.id] = Date.now();
      s.currency.embers += a.embers;
      services.cloud?.unlock(a.id);
      notify(t('achievementUnlocked', { a: tr(a.name) }), COLORS.orange, 'achievement');
    }
  }
  services.save?.markDirty();
}

let installed = false;

/** Wire gameplay events to quest counters, bounties, stats and achievements. Call once at boot. */
export function installProgressTracking(): void {
  if (installed) return;
  installed = true;
  const save = () => services.save!.data;
  const bountyDone = (list: { reward: { embers: number } }[]) => {
    for (const _b of list) notify(t('bountyDone'), COLORS.green, 'quest_complete');
  };

  bus.on('enemyKilled', (e) => {
    const s = save();
    bumpObjectives(s, (o) => o.kind === 'kill' && (!o.enemy || o.enemy === e.enemyId));
    if (e.elite) bumpObjectives(s, (o) => o.kind === 'killElite');
    ensureBounties(s);
    bountyDone(progressBounty(s, 'kill', 1, e.enemyId));
    if (e.elite) bountyDone(progressBounty(s, 'killElite', 1));
  });
  bus.on('roomCleared', (r) => {
    const s = save();
    bountyDone(progressBounty(s, 'clearRooms', 1));
    if (r.kind === 'challenge') {
      s.stats.challenges = (s.stats.challenges ?? 0) + 1;
      bumpObjectives(s, (o) => o.kind === 'stat' && o.stat === 'challenges');
    }
  });
  bus.on('shrineVisited', () => {
    const s = save();
    s.stats.shrines = (s.stats.shrines ?? 0) + 1;
    bumpObjectives(s, (o) => o.kind === 'stat' && o.stat === 'shrines');
    bountyDone(progressBounty(s, 'shrines', 1));
  });
  bus.on('goldGained', (g) => bountyDone(progressBounty(save(), 'collectGold', g.amount)));
  bus.on('depthReached', (d) => {
    const s = save();
    const run = s.run;
    if (run) recordHeatDepth(s, run.vows, d.depth);
    bountyDone(progressBounty(s, 'reachDepth', d.depth));
  });
  bus.on('bossDefeated', (b) => {
    const s = save();
    if (b.bossId === 'malachar' && s.flags.true_path) s.flags.malachar_after_truth = 1;
    checkProgress();
  });
  bus.on('runEnded', () => {
    const s = save();
    bumpObjectives(s, (o) => o.kind === 'runs');
    checkProgress();
  });
  bus.on('npcTalked', (n) => {
    const s = save();
    bumpObjectives(s, (o) => o.kind === 'talk' && o.npc === n.npcId);
    checkProgress();
  });
}
