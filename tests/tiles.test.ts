import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TILE_INDEX } from '@/data/tileIndex';
import { LEGACY_COLS, MAIN_COLS } from '@/data/biomes';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('packed tiles', () => {
  it('contains every tile the code references (re-run tools/pack_tiles.py if this fails)', () => {
    const missing: string[] = [];
    for (const file of sources(join(__dirname, '..', 'src'))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\b(M|LG)\((\d+), (\d+)\)/g)) {
        const sheet = m[1] === 'M' ? 'main' : 'legacy';
        const key = `${sheet}:${Number(m[3]) * (sheet === 'main' ? MAIN_COLS : LEGACY_COLS) + Number(m[2])}`;
        if (TILE_INDEX[key] === undefined) missing.push(`${key} (${file})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
