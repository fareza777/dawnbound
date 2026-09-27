/** Codex detail cards: what the player learns about a discovered monster, boss, item, relic or boon. */
import { COLORS, RARITY_COLORS } from '@/ui/theme';
import type { DetailLine, DetailSpec } from '@/ui/detailCard';
import { t, tr } from '@/core/i18n';
import { ENEMIES, type EnemyDef } from '@/data/enemies';
import { BOSSES, bossArt, type BossDef } from '@/data/bosses';
import { ALL_BIOMES } from '@/data/biomes';
import { materialDef } from '@/data/materials';
import { SLOT_NAMES, baseById, type ItemBase, type UniqueDef } from '@/data/items';
import { RELIC_TIER_COLOR, type RelicDef } from '@/data/relics';
import { SPIRITS, boonValue, type BoonDef } from '@/data/boons';
import { formatMod } from '@/systems/stats';
import { STATUS, type StatusKind } from '@/systems/combat';
import type { Element } from '@/data/types';

const ELEMENT_COLOR: Record<Element, number> = {
  physical: 0xd8d4e6, fire: 0xff7a2f, ice: 0x9ee8ff, shock: 0xfff27a, poison: 0x8fdc4a, holy: 0xffe6a0, shadow: 0xb77cff,
};

const el = (e: Element) => t(`el_${e}`);
const pct = (v: number) => Math.round(v * 100);

/** Largest value of a stat across all monsters, so bars compare a monster with the whole bestiary. */
function maxOf(key: 'hp' | 'atk' | 'def' | 'speed'): number {
  return Math.max(...Object.values(ENEMIES).map((e) => e[key]));
}

function regionsWith(test: (b: (typeof ALL_BIOMES)[number]) => boolean): DetailLine[] {
  return ALL_BIOMES.filter(test).map((b) => ({ text: `${tr(b.name)}  ·  ${t('cxDepth', { n: b.depth })}`, color: COLORS.text }));
}

function resistLines(resist: Partial<Record<Element, number>> | undefined): DetailLine[] {
  return Object.entries(resist ?? {}).map(([e, v]) => {
    const elem = e as Element;
    return v! >= 0
      ? { text: t('cxResists', { e: el(elem), p: pct(v!) }), color: ELEMENT_COLOR[elem] }
      : { text: t('cxWeak', { e: el(elem), p: pct(-v!) }), color: COLORS.red };
  });
}

export function monsterDetail(e: EnemyDef, kills: number): DetailSpec {
  const base = e.sprite.atlas === 'monsters' ? e.sprite.key : e.sprite.key.replace('_walk', '');
  const frame = e.sprite.atlas === 'monsters' ? `${base}/down/1` : `${base}/walk/down/1`;
  const anim = e.sprite.atlas === 'monsters' ? `${base}_down` : `${base}_walk_down`;
  const abilities: DetailLine[] = [{ text: t(`ai_${e.ai}`) }];
  if (e.element && e.element !== 'physical') abilities.push({ text: t('cxElement', { e: el(e.element) }), color: ELEMENT_COLOR[e.element] });
  if (e.onHit) {
    const kind = e.onHit[0] as StatusKind;
    abilities.push({ text: t('cxInflicts', { s: t(`st_${kind}`), p: pct(e.onHit[1]) }), color: STATUS[kind]?.color });
  }
  if (e.pattern && e.ai !== 'shooter' && e.ai !== 'caster' && e.ai !== 'turret') abilities.push({ text: t('cxShoots') });
  if (e.flying) abilities.push({ text: t('cxFlying') });
  if (e.splitInto) abilities.push({ text: t('cxSplits', { n: tr(ENEMIES[e.splitInto]?.name ?? { en: e.splitInto, id: e.splitInto }) }) });
  if (e.explode) abilities.push({ text: t('cxExplodes'), color: COLORS.orange });
  if (e.summon) abilities.push({ text: t('cxSummons', { n: tr(ENEMIES[e.summon]?.name ?? { en: e.summon, id: e.summon }) }) });
  abilities.push(...resistLines(e.resist));

  const rewards: DetailLine[] = [
    { text: t('cxGold', { a: e.gold[0], b: e.gold[1] }), color: COLORS.gold },
    { text: t('cxXp', { n: e.xp }), color: COLORS.cyan },
  ];
  const mat = e.drop ? materialDef(e.drop[0]) : undefined;
  if (e.drop && mat) rewards.push({ text: t('cxDrop', { n: tr(mat.name), p: pct(e.drop[1]) }), color: COLORS.green });

  const found = regionsWith((b) => b.enemies.includes(e.id) || b.elites.includes(e.id) || b.minibosses.includes(e.id));
  return {
    title: tr(e.name),
    titleColor: COLORS.text,
    subtitle: [found[0]?.text.split('  ·  ')[0], el(e.element ?? 'physical')].filter(Boolean).join('  ·  '),
    art: { atlas: e.sprite.atlas, frame, anim, tint: e.sprite.tint },
    bars: [
      { label: t('cxHp'), value: e.hp, max: maxOf('hp'), color: COLORS.red },
      { label: t('cxAtk'), value: e.atk, max: maxOf('atk'), color: COLORS.orange },
      { label: t('cxDef'), value: e.def, max: maxOf('def'), color: 0x5fa8ff },
      { label: t('cxSpd'), value: e.speed, max: maxOf('speed'), color: COLORS.green },
    ],
    sections: [
      { head: t('cxAbilities'), lines: abilities },
      { head: t('cxFoundIn'), lines: found },
      { head: t('cxDrops'), lines: rewards },
      { head: t('cxRecord'), lines: [{ text: t('cxKills', { n: kills }), color: COLORS.textDim }] },
    ],
    quote: tr(e.lore),
  };
}

export function bossDetail(b: BossDef, defeated: boolean): DetailSpec {
  const bosses = Object.values(BOSSES);
  const max = (k: 'hp' | 'atk' | 'def') => Math.max(...bosses.map((x) => x[k]));
  const abilities: DetailLine[] = [{ text: t('cxElement', { e: el(b.element) }), color: ELEMENT_COLOR[b.element] }];
  if (b.summon) abilities.push({ text: t('cxSummons', { n: tr(ENEMIES[b.summon]?.name ?? { en: b.summon, id: b.summon }) }) });
  if (b.partner) abilities.push({ text: tr(BOSSES[b.partner]?.name ?? { en: b.partner, id: b.partner }), color: COLORS.orange });
  // The twin lamias share one arena id.
  const found = regionsWith((x) => x.boss === b.id || (x.boss === 'twin_lamias' && (b.id === 'ivra' || b.id === 'sseth')));
  return {
    title: tr(b.name),
    titleColor: COLORS.orange,
    subtitle: tr(b.title),
    art: { ...bossArt(b), tint: b.sprite ? undefined : b.tint },
    bars: [
      { label: t('cxHp'), value: b.hp, max: max('hp'), color: COLORS.red },
      { label: t('cxAtk'), value: b.atk, max: max('atk'), color: COLORS.orange },
      { label: t('cxDef'), value: b.def, max: max('def'), color: 0x5fa8ff },
    ],
    sections: [
      { head: t('cxAbilities'), lines: abilities },
      { head: t('cxFoundIn'), lines: found },
      { head: t('cxRecord'), lines: [{ text: defeated ? t('cxBossDefeated') : t('cxBossNot'), color: defeated ? COLORS.green : COLORS.textDim }] },
    ],
    quote: tr(b.intro),
  };
}

export function uniqueDetail(u: UniqueDef): DetailSpec {
  const base = baseById(u.baseId);
  const color = u.mythic ? RARITY_COLORS[5] : RARITY_COLORS[4];
  const info: DetailLine[] = [{ text: t('cxMinDepth', { n: u.minDepth }), color: COLORS.textDim }];
  if (u.bossOnly) info.push({ text: t('cxBossOnly', { n: tr(BOSSES[u.bossOnly]?.name ?? { en: u.bossOnly, id: u.bossOnly }) }), color: COLORS.orange });
  return {
    title: tr(u.name),
    titleColor: color,
    subtitle: `${u.mythic ? t('cxMythic') : t('cxUniqueItem')}${base ? `  ·  ${tr(SLOT_NAMES[base.slot])}  ·  ${tr(base.name)}` : ''}`,
    art: { atlas: `icons_unique_${u.id}` },
    sections: [
      { head: t('cxPower'), lines: [{ text: tr(u.power), color }] },
      { head: t('cxStats'), lines: [...(base?.implicit ?? []), ...u.mods].map((m) => ({ text: formatMod(m) })) },
      { head: t('cxFoundIn'), lines: info },
    ],
    quote: tr(u.flavor),
  };
}

export function baseDetail(b: ItemBase): DetailSpec {
  return {
    title: tr(b.name),
    titleColor: COLORS.text,
    subtitle: `${tr(SLOT_NAMES[b.slot])}  ·  ${t('cxTier', { n: b.tier })}`,
    art: { atlas: b.icon },
    sections: [{ head: t('cxStats'), lines: b.implicit.map((m) => ({ text: formatMod(m) })) }],
  };
}

export function relicDetail(r: RelicDef): DetailSpec {
  const color = RELIC_TIER_COLOR[r.tier];
  return {
    title: tr(r.name),
    titleColor: color,
    subtitle: t(`rt_${r.tier}`),
    art: { atlas: r.icon },
    // The description already states the relic's numbers; a separate stat list would repeat it.
    sections: [{ head: t('cxEffect'), lines: [{ text: tr(r.desc), color }] }],
  };
}

export function boonDetail(b: BoonDef): DetailSpec {
  const sp = SPIRITS[b.spirit];
  const kind = b.legendary ? t('cxLegendary') : b.duo ? t('cxDuo') : '';
  const spirits = `${tr(sp.name)}${b.duo ? ` + ${tr(SPIRITS[b.duo].name)}` : ''}`;
  const ranks: DetailLine[] = [];
  for (let r = 1; r <= b.maxRank; r++) {
    const { v, v2 } = boonValue(b, r);
    ranks.push({ text: t('cxRank', { r, d: tr(b.desc, { v, v2 }) }), color: r === 1 ? COLORS.text : COLORS.textDim });
  }
  return {
    title: tr(b.name),
    titleColor: sp.color,
    subtitle: kind ? `${spirits}  ·  ${kind}` : spirits,
    art: { atlas: `icons_boon_${b.id}` },
    sections: [{ head: t('cxRanks'), lines: ranks }],
  };
}
