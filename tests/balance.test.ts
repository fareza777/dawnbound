import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { findSpikes, simulateAverage, type StepReport } from '@/sim/balance';
import { HEROES } from '@/data/heroes';

const f1 = (n?: number) => (n === undefined ? '' : n.toFixed(1));

function report(rows: StepReport[]): string {
  const head = '| hero | step | lvl | boons | ATK | HP | TTK s | TTD s | boss TTK s | boss TTD s |\n|---|---|---|---|---|---|---|---|---|---|';
  const body = rows.map((r) => `| ${r.hero} | ${r.depth}-${r.floor} | ${r.level} | ${r.boons} | ${r.atk} | ${r.maxHp} | ${f1(r.ttk)} | ${f1(r.ttd)} | ${f1(r.bossTtk)} | ${f1(r.bossTtd)} |`);
  return [head, ...body].join('\n');
}

describe('difficulty curve (balance model)', () => {
  it('has no spikes for any hero with typical gear', () => {
    const rows = HEROES.flatMap((h) => simulateAverage(h.id, { gearRarity: 1 }));
    const spikes = findSpikes(rows);
    mkdirSync(join(__dirname, '..', 'tools', '.cache'), { recursive: true });
    writeFileSync(join(__dirname, '..', 'tools', '.cache', 'balance.md'),
      `# Balance model\n\n${report(rows)}\n\n## Spikes\n${spikes.map((s) => `- ${s.hero} ${s.at}: ${s.reason}`).join('\n') || 'none'}\n`);
    expect(spikes).toEqual([]);
  });
});

describe('alternate regions', () => {
  it('are about as tough as the main region they replace (±30% average monster HP and attack)', async () => {
    const { ALT_BIOMES, BIOMES } = await import('@/data/biomes');
    const { ENEMIES } = await import('@/data/enemies');
    const avg = (ids: string[], k: 'hp' | 'atk') => ids.reduce((a, id) => a + ENEMIES[id][k], 0) / ids.length;
    const off: string[] = [];
    for (const alt of ALT_BIOMES) {
      const main = BIOMES[alt.depth - 1];
      for (const k of ['hp', 'atk'] as const) {
        const r = avg(alt.enemies, k) / avg(main.enemies, k);
        if (r < 0.7 || r > 1.3) off.push(`${alt.id} ${k} x${r.toFixed(2)} vs ${main.id}`);
      }
    }
    expect(off).toEqual([]);
  });
});

describe('first run (no gear, no talents)', () => {
  it('is a fair fight on depth 1: a few hits per monster and time to react', () => {
    const rows = simulateAverage('rowan', { gearRarity: null }, 8).filter((r) => r.depth === 1);
    for (const r of rows) {
      expect(r.hits).toBeLessThanOrEqual(5);
      expect(r.ttd).toBeGreaterThan(18);
    }
  });
});
