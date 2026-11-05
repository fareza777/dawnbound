// Visual regression tour for mobile typography. Run against the local dev server.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'artifacts/readability/verified';
const variant = process.argv[3] ?? 'phone';
const focus = process.argv.includes('--focus');
const configs = {
  phone: { width: 390, height: 844, dpr: 3, quality: 'high', textScale: 1 },
  compact: { width: 320, height: 640, dpr: 1, quality: 'low', textScale: 1 },
  large: { width: 360, height: 740, dpr: 3, quality: 'high', textScale: 1.3 },
  lowLarge: { width: 320, height: 640, dpr: 1, quality: 'low', textScale: 1.3 },
};
const c = configs[variant];
if (!c) throw new Error(`Unknown variant: ${variant}`);
const dir = path.join(out, variant);
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height }, deviceScaleFactor: c.dpr, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.error(e.stack ?? e.message); });
page.on('console', (m) => { if (m.type() === 'error') console.error(m.text()); });
await page.goto(process.env.GAME_URL ?? 'http://localhost:4174');
await page.waitForFunction(() => window.__grant && window.__overflow && window.__services?.save, null, { timeout: 30000 });
await page.evaluate(async (config) => {
  const s = __services.save.data;
  Object.assign(s.settings, { quality: config.quality, qualityUser: true, textScale: config.textScale, lang: 'en', musicVol: 0, sfxVol: 0, reduceMotion: true });
  s.profile.onboardingDone = true;
  s.profile.introSeen = true;
  s.flags.rift_open = 1;
  s.unlocks.heroes = ['rowan', 'sera', 'elio', 'kaito'];
  s.unlocks.maxDepthReached = 5;
  s.unlocks.bossesDefeated = ['gorehorn', 'colossus', 'twin_lamias'];
  s.unlocks.features = ['reforge', 'garden_plot'];
  s.currency.gold = 150000;
  s.currency.shards = 120;
  __grant(36, 'readability');
  for (const q of __questIds.slice(0, 5)) s.quests[q.id] = { status: 'active', progress: {} };
  const { ENEMIES } = await import('/src/data/enemies.ts');
  const { BOONS } = await import('/src/data/boons.ts');
  const { RELICS } = await import('/src/data/relics.ts');
  const { ITEM_BASES, UNIQUES } = await import('/src/data/items.ts');
  const { LORE } = await import('/src/data/story.ts');
  Object.keys(ENEMIES).forEach((id) => s.codex.enemies[id] = 10);
  s.codex.boons = BOONS.map((b) => b.id);
  s.codex.relics = RELICS.map((r) => r.id);
  s.codex.items = [...ITEM_BASES, ...UNIQUES].map((i) => i.id);
  s.codex.lore = LORE.map((l) => l.id);
  __services.save.markDirty();
  __services.save.flush();
}, c);
await page.reload();
await page.waitForFunction(() => window.__grant && window.__overflow && window.__services?.save, null, { timeout: 30000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  __game.scene.scenes.forEach((s) => __game.scene.stop(s.scene.key));
  __game.scene.start('Hub');
});
await page.waitForTimeout(1500);
const report = { variant, config: c, screens: [], errors };
async function shot(name, key) {
  await page.waitForTimeout(300);
  const overflow = await page.evaluate((scene) => __overflow().filter((s) => s.startsWith(`${scene}:`)), key);
  await page.screenshot({ path: path.join(dir, `${name}.png`), scale: 'css' });
  report.screens.push({ name, scene: key, overflow });
  if (overflow.length) console.log(name, JSON.stringify(overflow));
}
async function open(key, data = {}, name = key) {
  await page.evaluate(({ key, data }) => __game.scene.start(key, { from: 'Hub', ...data }), { key, data });
  await page.waitForFunction((key) => __game.scene.isActive(key), key, { timeout: 10000 });
  await shot(name, key);
}
async function stop(key) { await page.evaluate((k) => __game.scene.stop(k), key); }
await shot('Hub', 'HubHud');
for (const key of focus ? ['Inventory', 'Hero', 'Garden', 'Merchant'] : ['Inventory', 'QuestLog', 'Bounties', 'Vows', 'Hero', 'LanternTree', 'Alchemist', 'Merchant', 'Garden', 'Codex', 'Settings', 'Descend', 'HubMenu', 'Jukebox']) {
  await open(key);
  if (key === 'Inventory') {
    await page.evaluate(() => __game.scene.getScene('Inventory').showDetail(__services.save.data.inventory.find((it) => it.uniqueId) ?? __services.save.data.inventory[0]));
    await shot('Inventory-detail', key);
    await page.evaluate(() => { const d = __game.scene.getScene('Inventory').detail; d.setScroll(d.maxScroll); });
    await shot('Inventory-detail-bottom', key);
  }
  if (key === 'LanternTree') {
    await page.evaluate(async () => { const { TALENTS } = await import('/src/data/talents.ts'); __game.scene.getScene('LanternTree').scene.restart({ from: 'Hub', sel: TALENTS[0].id }); });
    await shot('LanternTree-detail', key);
  }
  if (key === 'Codex') {
    for (const tab of ['items', 'relics', 'boons', 'lore', 'achievements', 'stats']) {
      await page.evaluate((tab) => __game.scene.getScene('Codex').show(tab), tab);
      await shot(`Codex-${tab}`, key);
    }
  }
  if (['Alchemist', 'Settings', 'Descend', 'Hero'].includes(key)) {
    await page.evaluate((key) => {
      const sc = __game.scene.getScene(key);
      const scrollContainer = sc.children.list.find((o) => o.type === 'Container' && o.mask);
      if (!scrollContainer) return;
      const p = { x: scrollContainer.x * sc.cameras.main.zoom + 5, y: scrollContainer.y * sc.cameras.main.zoom + 5 };
      sc.input.emit('wheel', p, [], 0, 10000);
    }, key);
    await shot(`${key}-bottom`, key);
  }
  await stop(key);
}
const uid = await page.evaluate(() => (__services.save.data.inventory.find((it) => it.uniqueId) ?? __services.save.data.inventory[0]).uid);
for (const mode of ['upgrade', 'reforge', 'forge']) {
  await open('Blacksmith', { mode, uid }, `Blacksmith-${mode}`);
  await stop('Blacksmith');
}
await open('Dialogue', { from: 'Hub', lines: [{ who: 'maren', text: { en: 'The lantern is your last light in the darkness. Explore the depths, gather powerful equipment, and choose the blessings that shape your next adventure. Every journey brings you closer to the dawn.', id: '' } }] });
await page.evaluate(() => __game.scene.getScene('Dialogue').advance());
await shot('Dialogue-full', 'Dialogue');
await stop('Dialogue');
await page.evaluate(async () => {
  __game.scene.stop('Hub'); __game.scene.stop('HubHud');
  __run.start({ heroId: 'rowan', seed: 42 });
  const { BOONS } = await import('/src/data/boons.ts');
  __run.run.boons = [{ id: BOONS[0].id, rank: 1 }];
});
await open('RunMap');
if (focus) {
  const node = await page.evaluate(() => {
    const sc = __game.scene.getScene('RunMap');
    const scroll = sc.mapScroll;
    if (scroll.maxScroll <= 0) throw new Error('Expected a scrollable route map.');
    scroll.setScroll(0);
    scroll.setScroll(scroll.maxScroll);
    const n = scroll.container.list.find((o) => o.type === 'Container' && o.input?.enabled);
    if (!n) throw new Error('No tappable route after scrolling.');
    const b = n.getBounds();
    return { x: b.centerX, y: b.centerY };
  });
  await shot('RunMap-scrolled', 'RunMap');
  await page.mouse.click(node.x, node.y);
  await page.waitForFunction(() => __game.scene.isActive('Room'), null, { timeout: 15000 });
  await shot('RunMap-entered-room', 'Hud');
  await stop('Room'); await stop('Hud');
}
await stop('RunMap');
if (!focus) {
await open('Build');
await stop('Build');
await open('BoonPick', { source: 'level' });
await stop('BoonPick');
await open('Pause', { from: 'RunMap' });
await stop('Pause');
await open('Room', { kind: 'combat' });
await page.evaluate(() => { __game.scene.pause('Room'); __game.scene.pause('Hud'); });
await shot('Combat-Hud', 'Hud');
for (const key of ['Shop', 'Event', 'Rest']) {
  await page.evaluate((key) => __game.scene.start(key, { room: __game.scene.getScene('Room'), from: 'Room' }), key);
  await shot(key, key);
  await stop(key);
}
await stop('Room'); await stop('Hud');
await open('Results', { victory: false });
await page.waitForTimeout(700);
await shot('Results-final', 'Results');
}
report.errors.push(...await page.evaluate(() => window.__errs ?? []));
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`${variant}: ${report.screens.length} screens, ${report.errors.length} runtime errors, ${report.screens.filter((s) => s.overflow.length).length} screens with overflow`);
await browser.close();
if (report.errors.length) process.exitCode = 1;
