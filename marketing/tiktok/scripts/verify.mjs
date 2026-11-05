// Probes every exported mp4: 1080x1920, 30fps, 15-30s, decodes fully, audio present but quiet.
// Usage: node scripts/verify.mjs [dir]

import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const HERE = import.meta.dirname;
const PROJECT = path.resolve(HERE, '..');
const FFMPEG = path.join(PROJECT, '.bin/ffmpeg.exe');
const base = process.argv[2] ? path.resolve(process.argv[2]) : path.join(PROJECT, 'out');
const MIN = 15;
const MAX = 30;
const MAX_PEAK_DB = -8; // "not loud" in practice: peaks stay under this
const MIN_PEAK_DB = -30;

const files = fs.readdirSync(base).filter((f) => f.endsWith('.mp4')).sort();
if (!files.length) throw new Error(`No mp4 files in ${base}`);

const videos = [];
const problems = [];
for (const name of files) {
  const file = path.join(base, name);
  const probe = spawnSync(FFMPEG, ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true });
  const err = probe.stderr ?? '';
  if (probe.status !== 0) problems.push(`${name}: decode failed`);

  const seconds = err.match(/Duration: (\d+):(\d+):([\d.]+)/)?.slice(1).reduce((a, b) => a * 60 + Number(b), 0) ?? 0;
  const decoded = [...err.matchAll(/frame=\s*(\d+)/g)].map((m) => Number(m[1])).at(-1);
  const peak = Number(err.match(/max_volume: ([\d.-]+)/)?.[1]);
  const mean = Number(err.match(/mean_volume: ([\d.-]+)/)?.[1]);

  if (!err.includes('1080x1920')) problems.push(`${name}: not 1080x1920`);
  if (!err.includes('30 fps')) problems.push(`${name}: not 30fps`);
  if (!(seconds >= MIN && seconds <= MAX)) problems.push(`${name}: ${seconds.toFixed(1)}s outside ${MIN}-${MAX}s`);
  if (!decoded || decoded < seconds * 29) problems.push(`${name}: only ${decoded} frames for ${seconds.toFixed(1)}s`);
  if (!(peak > MIN_PEAK_DB)) problems.push(`${name}: audio inaudible (peak ${peak} dB)`);
  if (!(peak <= MAX_PEAK_DB)) problems.push(`${name}: audio too loud (peak ${peak} dB > ${MAX_PEAK_DB} dB)`);

  videos.push({
    file: name,
    seconds: Number(seconds.toFixed(2)),
    frames: decoded,
    peakDb: peak,
    meanDb: mean,
    bytes: fs.statSync(file).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  });
}

if (new Set(videos.map((v) => v.sha256)).size !== videos.length) problems.push('duplicate exports detected');

fs.writeFileSync(path.join(base, 'VALIDATION.json'), JSON.stringify({ checkedAt: new Date().toISOString(), videos }, null, 2));
if (problems.length) {
  console.error(`FAIL (${problems.length}):\n` + problems.join('\n'));
  process.exit(1);
}
const loud = Math.max(...videos.map((v) => v.peakDb));
console.log(`PASS: ${videos.length} distinct 1080x1920 30fps clips, ${MIN}-${MAX}s, loudest peak ${loud} dB.`);
