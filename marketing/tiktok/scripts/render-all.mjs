// Renders every TikTok composition to out/<slug>.mp4.
// Usage: node scripts/render-all.mjs [slugFilter ...]

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = import.meta.dirname;
const PROJECT = path.resolve(HERE, '..');
const OUT = path.join(PROJECT, 'out');
const CUTOFF = Number(process.env.CUTOFF ?? 30);
const MIN = 15;

fs.mkdirSync(OUT, { recursive: true });

const { briefs } = await import(pathToFileURL(path.join(PROJECT, 'src/tiktoks.ts')).href);
const { briefs2 } = await import(pathToFileURL(path.join(PROJECT, 'src/tiktoks2.ts')).href);
const all = [...briefs, ...briefs2];

const wanted = process.argv.slice(2);
const queue = all.filter((b) => !wanted.length || wanted.some((w) => b.slug.includes(w)));
if (!queue.length) throw new Error(`No brief matches ${wanted.join(', ')}`);

for (const b of all) {
  const s = b.beats.reduce((x, y) => x + y.seconds, 0) + (b.format === 'hook-card' ? 2.2 : 0) + 3.4;
  if (s < MIN || s > CUTOFF) throw new Error(`${b.id} is ${s.toFixed(1)}s, outside ${MIN}-${CUTOFF}s`);
}
for (const b of queue) {
  for (const beat of b.beats) {
    const file = beat.clip ? ['public/clips', `${beat.clip}.mp4`] : ['public/stills', `${beat.still}.png`];
    if (!fs.existsSync(path.join(PROJECT, file[0], file[1]))) throw new Error(`${b.id} references missing ${file[1]}`);
  }
  for (const beat of b.beats) if (!beat.caption && !beat.callout) console.log(`note: ${b.id} beat without caption: ${beat.clip ?? beat.still}`);
}

console.log(`Bundling ${all.length} compositions...`);
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(PROJECT, 'src/index.ts'), publicDir: path.join(PROJECT, 'public'), onProgress: () => {} });
console.log(`bundle ${(Date.now() - t0) / 1000}s`);

const timings = [];
for (const brief of queue) {
  const target = path.join(OUT, `${brief.slug}.mp4`);
  if (process.env.FORCE !== '1' && fs.existsSync(target)) {
    console.log(`skip ${brief.slug}`);
    continue;
  }
  const composition = await selectComposition({ serveUrl, id: brief.id, inputProps: { brief } });
  const start = Date.now();
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 19,
    pixelFormat: 'yuv420p',
    audioBitrate: '128k',
    concurrency: Number(process.env.CONC ?? 4),
    outputLocation: target,
    onProgress: ({ progress }) => {
      if (progress >= 1) return;
      const now = Date.now();
      if (now - start > 20000 && now % 5000 < 60) process.stdout.write(`  ${brief.slug} ${(progress * 100).toFixed(0)}%\n`);
    },
  });
  const secs = (Date.now() - start) / 1000;
  timings.push({ slug: brief.slug, seconds: Number((composition.durationInFrames / 30).toFixed(1)), renderSeconds: Number(secs.toFixed(0)) });
  const done = queue.length - timings.length;
  const eta = (timings.reduce((s, t) => s + t.renderSeconds, 0) / timings.length) * done;
  console.log(`✓ ${brief.slug}  ${(composition.durationInFrames / 30).toFixed(1)}s  render ${secs.toFixed(0)}s  eta ${(eta / 60).toFixed(0)}m`);
}

fs.writeFileSync(path.join(PROJECT, 'render-report.json'), JSON.stringify({ renderedAt: new Date().toISOString(), timings }, null, 2));
console.log(`\nDone: ${timings.length} rendered in ${((Date.now() - t0) / 60000).toFixed(0)} min`);
