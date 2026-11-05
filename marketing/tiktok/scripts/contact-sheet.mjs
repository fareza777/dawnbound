// Builds one QC contact sheet per rendered clip: 8 frames sampled every 2.5s, tiled 4x2.
// Usage: node scripts/contact-sheet.mjs [slugFilter]

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(PROJECT, 'out');
const QC = path.join(PROJECT, '.qc');
const FFMPEG = path.join(PROJECT, '.bin/ffmpeg.exe');
fs.mkdirSync(QC, { recursive: true });

const filter = process.argv[2];
for (const name of fs.readdirSync(OUT).filter((f) => f.endsWith('.mp4'))) {
  if (filter && !name.includes(filter)) continue;
  const target = path.join(QC, `${name.replace('.mp4', '')}.png`);
  const res = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(OUT, name),
    '-vf', 'fps=1/2.5,scale=270:480:flags=area,tile=4x2', '-frames:v', '1', target], { windowsHide: true, stdio: 'pipe' });
  if (res.status !== 0) throw new Error(`${name}: ${res.stderr}`);
  console.log('sheet', path.basename(target));
}
