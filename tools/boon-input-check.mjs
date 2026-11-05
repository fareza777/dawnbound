// Exercise the actual Phaser card hit areas and gesture handlers in a mobile browser.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const variant = process.argv[2] ?? 'phone';
const config = variant === 'compact' ? { width: 320, height: 640, dpr: 1 } : { width: 390, height: 844, dpr: 3 };
const output = `artifacts/readability/revision/${variant}`;
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: config, deviceScaleFactor: config.dpr, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL ?? 'http://localhost:4174');
  await page.waitForFunction(() => window.__run && window.__services?.save, null, { timeout: 30000 });
  await page.evaluate((config) => {
    const s = __services.save.data;
    Object.assign(s.settings, { quality: config.dpr > 1 ? 'high' : 'low', qualityUser: true, textScale: 1, lang: 'en', musicVol: 0, sfxVol: 0 });
    s.profile.onboardingDone = true; s.profile.introSeen = true;
    __services.save.markDirty(); __services.save.flush();
  }, config);
  await page.reload();
  await page.waitForFunction(() => window.__run && window.__services?.save, null, { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => __game.scene.scenes.forEach((s) => __game.scene.stop(s.scene.key)));

  async function fresh(index) {
    await page.evaluate(() => {
      __game.scene.stop('BoonPick');
      __run.start({ heroId: 'rowan', seed: 42 });
      __game.scene.start('BoonPick', { source: 'level', from: 'Menu' });
    });
    await page.waitForFunction(() => __game.scene.isActive('BoonPick') && __game.scene.getScene('BoonPick').cards.length === 3);
    await page.waitForTimeout(500);
    return page.evaluate(async (index) => {
      const scene = __game.scene.getScene('BoonPick');
      const scroll = scene.cardScroll;
      const card = scene.cards[index];
      scroll.setScroll(Math.max(0, card.y + card.height - scroll.h));
      const b = card.list[0].getBounds();
      const name = card.list.find((o) => o.type === 'BitmapText').text;
      const { BOONS } = await import('/src/data/boons.ts');
      const { view } = await import('/src/core/viewport.ts');
      const rect = __game.canvas.getBoundingClientRect();
      const scale = rect.width / view.w;
      return { x: rect.x + b.x * scale, y: rect.y + b.y * scale, w: b.width * scale,
        h: b.height * scale, name, id: BOONS.find((o) => o.name.en === name)?.id };
    }, index);
  }

  let checks = 0;
  for (const index of [0, 1, 2]) {
    for (const [xf, yf] of [[0.75, 0.5], [0.25, 0.75]]) {
      const card = await fresh(index);
      assert.ok(card.id, `Unknown offer ${card.name}`);
      await page.touchscreen.tap(card.x + card.w * xf, card.y + card.h * yf);
      const picked = await page.evaluate(() => __run.run.boons.map((b) => b.id));
      assert.deepEqual(picked, [card.id], `Card ${index + 1} (${card.name}) tap at ${xf},${yf}`);
      checks++;
    }
  }
  const card = await fresh(0);
  await page.mouse.move(card.x + card.w * 0.3, card.y + card.h * 0.35);
  await page.mouse.down();
  await page.mouse.move(card.x + card.w * 0.3, card.y + card.h * 0.65, { steps: 6 });
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => __run.run.boons), [], 'Dragging must not select a skill'); checks++;
  const next = await fresh(0);
  await page.mouse.move(3, 3); await page.mouse.down();
  await page.mouse.move(next.x + next.w * 0.3, next.y + next.h * 0.3); await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => __run.run.boons), [], 'Releasing a press that began outside must not select a skill'); checks++;
  await fresh(0);
  await page.screenshot({ path: `${output}/BoonPick.png`, scale: 'css' });
  await page.evaluate(() => { __game.scene.stop('BoonPick'); __game.scene.start('Menu'); });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/Menu.png`, scale: 'css' });
  assert.deepEqual(errors, [], 'Unexpected runtime errors');
  console.log(`${variant}: ${checks} real card input checks passed, no runtime errors`);
} finally { await browser.close(); }
