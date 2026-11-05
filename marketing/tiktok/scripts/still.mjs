// Renders still frames for fast design QC: node scripts/still.mjs <slugFilter> [frameTimes...]
// Writes .qc/<slug>@<sec>s.png

import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROJECT = path.resolve(import.meta.dirname, '..');
const QC = path.join(PROJECT, '.qc');
fs.mkdirSync(QC, { recursive: true });

const { briefs } = await import(pathToFileURL(path.join(PROJECT, 'src/tiktoks.ts')).href);
const { briefs2 } = await import(pathToFileURL(path.join(PROJECT, 'src/tiktoks2.ts')).href);
const all = [...briefs, ...briefs2];

const filter = process.argv[2] ?? '';
const times = process.argv.slice(3).map(Number);
const queue = all.filter((b) => b.slug.includes(filter));
if (!queue.length) throw new Error(`No brief matches ${filter}`);

const serveUrl = await bundle({ entryPoint: path.join(PROJECT, 'src/index.ts'), publicDir: path.join(PROJECT, 'public') });
for (const brief of queue) {
  const composition = await selectComposition({ serveUrl, id: brief.id, inputProps: { brief } });
  for (const t of times.length ? times : [1.2, 4, 8, composition.durationInFrames / 30 - 1.6]) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(t * 30));
    const target = path.join(QC, `${brief.slug}@${t}s.png`);
    await renderStill({ composition, serveUrl, output: target, frame, inputProps: { brief }, overwrite: true, imageFormat: 'png' });
    console.log('still', path.basename(target));
  }
}
