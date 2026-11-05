// Copies rendered clips to the user's upload folder, verifies every byte with SHA256, and writes a posting sheet.
// Usage: node scripts/deliver.mjs [destinationFolder]

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROJECT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(PROJECT, 'out');
const DEST = process.argv[2] ?? 'D:\\Video Games Upload\\Dawnbound Roguelike RPG\\tiktok';

const { briefs } = await import(pathToFileURL(path.join(PROJECT, 'src/tiktoks.ts')).href);
const { briefs2 } = await import(pathToFileURL(path.join(PROJECT, 'src/tiktoks2.ts')).href);
const all = [...briefs, ...briefs2];

const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

fs.mkdirSync(DEST, { recursive: true });

const copied = [];
for (const brief of all) {
  const src = path.join(OUT, `${brief.slug}.mp4`);
  const dst = path.join(DEST, `${brief.slug}.mp4`);
  if (!fs.existsSync(src)) throw new Error(`missing render: ${src}`);
  fs.copyFileSync(src, dst);
  const a = sha(src);
  const b = sha(dst);
  if (a !== b) throw new Error(`SHA256 mismatch after copy: ${brief.slug}`);
  copied.push({ slug: brief.slug, bytes: fs.statSync(dst).size, sha256: a });
  console.log(`copied ${brief.slug}.mp4  ${(fs.statSync(dst).size / 1048576).toFixed(1)} MB  ${a.slice(0, 12)}…`);
}

fs.writeFileSync(path.join(DEST, 'SHA256.json'), JSON.stringify({ deliveredAt: new Date().toISOString(), destination: DEST, files: copied }, null, 2));
console.log(`\n${copied.length} files verified in ${DEST}`);
