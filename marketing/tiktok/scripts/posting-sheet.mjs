// Writes posting-sheet.md: one row per clip with hook, captions, length and hashtags.
// Usage: node scripts/posting-sheet.mjs [destinationFolder]

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROJECT = path.resolve(import.meta.dirname, '..');
const DEST = process.argv[2] ?? path.join(PROJECT, 'out');

const { briefs } = await import(pathToFileURL(path.join(PROJECT, 'src/tiktoks.ts')).href);
const { briefs2 } = await import(pathToFileURL(path.join(PROJECT, 'src/tiktoks2.ts')).href);
const all = [...briefs, ...briefs2];

const BASE = ['dawnbound', 'roguelike', 'androidgaming', 'mobilegaming', 'pixelart', 'indiegame', 'gamedev', 'tiktokgaming'];
const EXTRA = [
  [/boss|gorehorn|malachar|azhar|vesper|sister/i, 'bossfight'],
  [/flare|fire|ignis|ember/i, 'firemage'],
  [/ice|frozen|vesper|rime/i, 'frost'],
  [/boon|spirit|build/i, 'buildcraft'],
  [/hero|rowan|sera|elio|kaito/i, 'characterdesign'],
  [/loot|gear|drop|inventory|rarity/i, 'loot'],
  [/die|death|defeat|come back/i, 'roguelikepain'],
  [/village|home|garden|story|quest|npc|dialogue/i, 'cozygaming'],
  [/offline|free|ad/i, 'freetoplay'],
  [/map|path|gamble|descend|depth/i, 'dungeoncrawl'],
  [/alone|built/i, 'solodev'],
  [/codex|lore|remembers/i, 'lorehound'],
  [/thumb|control|one/i, 'mobilefirst'],
];

const flat = (b) => b.replace(/\*/g, '').replace(/\n/g, ' · ');
const length = (b) => (b.format === 'hook-card' ? 2.2 : 0) + b.beats.reduce((s, x) => s + x.seconds, 0) + 3.4;

const rows = all.map((b, i) => {
  const text = [b.hook, b.cta, ...b.beats.map((x) => x.caption ?? '')].join(' ');
  const tags = [...BASE, ...EXTRA.filter(([re]) => re.test(text)).map(([, t]) => t)];
  return { n: i + 1, b, tags: [...new Set(tags)] };
});

const md = [
  '# Dawnbound: Roguelike RPG — 30 TikTok cuts',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} · portrait 1080×1920 · 30 fps · English copy · music bed mixed low.`,
  '',
  'Post one clip a day, keep the hook as the on-screen text, and put the CTA line in the caption.',
  '',
  '| # | File | Length | Theme | Hook | Hashtags |',
  '|--:|------|-------:|-------|------|----------|',
  ...rows.map(({ n, b, tags }) =>
    `| ${n} | \`${b.slug}.mp4\` | ${length(b).toFixed(1)}s | ${b.name} | ${flat(b.hook)} | ${tags.map((t) => `#${t}`).join(' ')} |`),
  '',
  '## On-screen captions, in order',
  '',
  ...rows.map(({ n, b }) => [
    `**${String(n).padStart(2, '0')} — ${b.name}** (\`${b.slug}.mp4\`)`,
    ...b.beats.filter((x) => x.caption).map((x) => `- ${x.caption}`),
    `- _End card:_ ${b.cta}`,
    '',
  ].join('\n')),
].join('\n');

fs.mkdirSync(DEST, { recursive: true });
fs.writeFileSync(path.join(DEST, 'posting-sheet.md'), md);
console.log(`posting-sheet.md written to ${DEST} (${rows.length} rows)`);
