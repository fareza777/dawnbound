/** Plain-language text for quest objectives and rewards (shown in the quest log). */
import { t, tr } from '@/core/i18n';
import type { Objective, QuestReward } from '@/data/quests';
import { npcById } from '@/data/npcs';
import { ENEMIES } from '@/data/enemies';
import { BOSSES } from '@/data/bosses';
import { materialDef } from '@/data/materials';
import { RARITY_NAMES } from '@/data/items';
import { heroDef } from '@/data/heroes';

const name = (v: { en: string; id: string } | undefined, fallback: string): string => (v ? tr(v) : fallback);

export function objectiveText(o: Objective): string {
  switch (o.kind) {
    case 'talk': return t('objTalk', { n: name(npcById(o.npc)?.name, o.npc) });
    case 'flag': return t('objFlag');
    case 'kill': return o.enemy ? t('objKillType', { c: o.count, n: name(ENEMIES[o.enemy]?.name, o.enemy) }) : t('objKill', { c: o.count });
    case 'killElite': return t('objElite', { c: o.count });
    case 'boss': return t('objBoss', { n: name(BOSSES[o.boss]?.name, o.boss) });
    case 'depth': return t('objDepth', { d: o.depth });
    case 'item': return t('objItem', { c: o.count, n: name(materialDef(o.material)?.name, o.material) });
    case 'runs': return t('objRuns', { c: o.count });
    case 'stat': return tr(o.label);
    case 'events': return t('objEvents', { c: o.count });
    case 'upgrade': return t('objUpgrade', { l: o.level });
    case 'rarity': return t('objRarity', { r: tr(RARITY_NAMES[o.rarity] ?? RARITY_NAMES[0]) });
    case 'gold': return t('objGold', { c: o.count });
    case 'shards': return t('objShards', { c: o.count });
    case 'heatDepth': return t('objHeat', { h: o.heat, d: o.depth });
  }
}

export interface RewardChip {
  icon?: string;
  text: string;
  color: number;
}

export function rewardChips(r: QuestReward): RewardChip[] {
  const out: RewardChip[] = [];
  if (r.embers) out.push({ icon: 'ui_icon_embers', text: `${r.embers}`, color: 0xff7a2f });
  if (r.gold) out.push({ icon: 'ui_icon_gold', text: `${r.gold}`, color: 0xf2c14e });
  if (r.shards) out.push({ icon: 'ui_icon_shard', text: `${r.shards}`, color: 0xff9ad0 });
  if (r.material) out.push({ text: `${name(materialDef(r.material[0])?.name, r.material[0])} x${r.material[1]}`, color: 0x8fdc4a });
  if (r.item) out.push({ text: t('rewItem', { r: tr(RARITY_NAMES[r.item.rarity] ?? RARITY_NAMES[0]) }), color: 0x5fa8ff });
  if (r.hero) out.push({ text: t('rewHero', { n: tr(heroDef(r.hero).name) }), color: 0xffd84a });
  if (r.feature) out.push({ text: t('rewFeature'), color: 0x9ee8ff });
  return out;
}
