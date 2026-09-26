// Capture a burst of frames during autoplay combat to catch one-frame visual glitches.
// Usage: node tools/burst.mjs <url> <seconds> <outDir>
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [, , url = 'http://localhost:4174', secs = '40', out = 'tools/.cache/burst'] = process.argv;
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.goto(url);
await page.waitForFunction(() => window.__game && window.__services?.save && window.__autoplay && ['Menu', 'Onboarding'].some((k) => window.__game.scene.isActive(k)), null, { timeout: 30000 });
await page.evaluate(() => { localStorage.clear(); window.__services.save.reset(); window.__services.save.data.profile.tutorialDone = true; window.__autoplay(); });
await page.waitForFunction(() => window.__game.scene.isActive('Room'), null, { timeout: 30000 });
const end = Date.now() + Number(secs) * 1000;
let i = 0;
while (Date.now() < end) {
  await page.screenshot({ path: `${out}/f${String(i++).padStart(4, '0')}.png` });
}
console.log('frames', i, 'errors', await page.evaluate(() => (window.__errs || []).length));
await browser.close();
