// Records real gameplay from the QA build in headless Edge and encodes silent 1080x1920 mp4 clips.
// Usage: node scripts/capture.mjs [nameFilter ...]
// Every scenario is a scripted session: reset save -> drive the game -> record N seconds -> trim.

import { chromium } from 'playwright-core';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const PROJECT = path.resolve(HERE, '..');
const ROOT = path.resolve(PROJECT, '../..');
const CLIPS = path.join(PROJECT, 'public/clips');
const STILLS = path.join(PROJECT, 'public/stills');
const RAW = path.join(PROJECT, '.raw');
const FFMPEG = path.join(PROJECT, '.bin/ffmpeg.exe');
const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}`;
const RECORD = Number(process.env.RECORD ?? 1);

fs.mkdirSync(CLIPS, { recursive: true });
fs.mkdirSync(STILLS, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

// ---- shared in-page helpers -------------------------------------------------

const reset = (extra = '') => `
  localStorage.clear();
  __setLang('en');
  __services.save.reset();
  const s = __services.save.data;
  s.profile.onboardingDone = true; s.profile.introSeen = true; s.profile.tutorialDone = true;
  s.unlocks.heroes = ['rowan','sera','elio','kaito'];
  s.unlocks.features = ['garden_plot','jukebox','lantern_tree','reforge'];
  s.unlocks.bossesDefeated = ['gorehorn','sseth','ivra','azhar','vesper'];
  s.unlocks.maxDepthReached = 5;
  s.currency.gold = 12500; s.currency.embers = 4800; s.currency.shards = 260;
  s.shop.noAds = true;
  __services.notify = () => {};
  const g = __game;
  g.scene.getScenes(true).filter(x => x.scene.key !== 'Notify').forEach(sc => sc.scene.stop());
  ${extra}
`;

const toHub = `${reset()} for (const q of ['mq_awaken','mq_training','mq_village','mq_descend','mq_gorehorn']) s.quests[q] = {status:'claimed', progress:[]}; g.scene.start('Hub'); 'hub'`;

/** Steer the hero around the village without the autoplay bot, which only understands run scenes. */
const wander = `
  const h = __game.scene.getScene('Hub'); const p = h.avatar;
  setInterval(() => {
    const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 70;
    const tx = p.x + Math.cos(a) * d, ty = p.y + Math.sin(a) * d;
    const id = setInterval(() => {
      const dx = tx - p.x, dy = ty - p.y, m = Math.hypot(dx, dy);
      if (m < 5) { __controls.moveX = 0; __controls.moveY = 0; clearInterval(id); return; }
      __controls.moveX = dx / m; __controls.moveY = dy / m;
    }, 50);
    setTimeout(() => clearInterval(id), 2100);
  }, 2300);
  'wandering'
`;

/** Start a run at a given depth/floor and enter the first node of a given kind. */
const startRun = (hero, depth, kind, level, enter = true) => `${reset()}
  const run = __run.start({heroId:'${hero}'});
  while (!(run.depth === ${depth} && run.floor === 2)) __run.advance(run);
  run.level = ${level ?? 12};
  g.scene.start('RunMap');
  ${enter ? `setTimeout(() => {
    const m = __game.scene.getScene('RunMap');
    const opts = __run.choices(run);
    m.select(opts.find(n => n.kind === '${kind}') ?? opts[0]);
  }, 700);` : "'stay on the map'"}
  'run d${depth}'
`;

/** Jump straight to a depth's boss: the boss sits on the last row of floor 3, unreachable from the start row. */
const startBoss = (hero, depth, level) => `${reset()}
  const run = __run.start({heroId:'${hero}'});
  while (!(run.depth === ${depth} && run.floor === 3)) __run.advance(run);
  run.level = ${level};
  const boss = run.map.nodes.find(n => n.kind === 'boss');
  const pre = run.map.nodes.find(n => (n.next ?? []).includes(boss.id));
  run.nodeId = pre.id; run.visited = [pre.id];
  g.scene.start('RunMap');
  setTimeout(() => __game.scene.getScene('RunMap').select(boss), 700);
  'boss d${depth} ' + boss.id
`;

/** Wait until the combat room is live and enemies are on screen. */
const inCombat = `__game.scene.isActive('Room') && __game.scene.getScene('Room').enemies && __game.scene.getScene('Room').enemies.filter(e => e.alive).length > 0`;

/** Keep the bot pressing skill/dash so the footage has effects in it. */
const pulse = `setInterval(() => { const r = __game.scene && __game.scene.getScene('Room'); if (!r || !r.player) return; __controls.skill = true; if (Math.random() < 0.4) __controls.dash = true; }, 2600); 'pulsing'`;

// ---- scenarios --------------------------------------------------------------
// record: seconds of footage kept, still: optional still name grabbed at the end of the action.

export const scenarios = [
  { name: '01_title', record: 6, eval: `${reset()} g.scene.start('Menu'); 'menu'`, wait: 2600, still: 'menu' },
  { name: '02_intro', record: 11, eval: `${reset()} s.profile.introSeen = false; g.scene.start('Intro'); 'intro'`, wait: 1200 },
  { name: '03_hub_walk', record: 12, eval: toHub, wait: 3000, then: `if (__game.scene.isActive('Dialogue')) { __game.scene.stop('Dialogue'); __game.scene.getScene('Hub').scene.resume(); } ${wander}`, still: 'hub' },
  { name: '04_map', record: 9, eval: startRun('rowan', 1, 'combat', 9, false), wait: 2600, still: 'map' },
  { name: '04b_map_deep', record: 9, eval: startRun('sera', 3, 'elite', 14, false), wait: 2600, still: 'map_deep' },
  { name: '05_combat_forest', record: 13, eval: startRun('rowan', 1, 'combat', 9), waitUntil: inCombat, then: `__autoplay(); ${pulse}` },
  { name: '06_combat_crypt', record: 12, eval: startRun('sera', 2, 'combat', 12), waitUntil: inCombat, then: `__autoplay(); ${pulse}` },
  { name: '07_combat_crystal', record: 12, eval: startRun('kaito', 3, 'combat', 14), waitUntil: inCombat, then: `__autoplay(); ${pulse}` },
  { name: '08_combat_ice', record: 12, eval: startRun('elio', 4, 'combat', 16), waitUntil: inCombat, then: `__autoplay(); ${pulse}` },
  { name: '09_combat_throne', record: 12, eval: startRun('rowan', 5, 'combat', 18), waitUntil: inCombat, then: `__autoplay(); ${pulse}` },
  { name: '10_boss_gorehorn', record: 13, eval: startBoss('rowan', 1, 12), waitUntil: inCombat, then: `__autoplay(); ${pulse}`, still: 'boss_gorehorn' },
  { name: '11_boss_twin', record: 12, eval: startBoss('sera', 2, 14), waitUntil: inCombat, then: `__autoplay(); ${pulse}` },
  { name: '12_boss_azhar', record: 12, eval: startBoss('elio', 3, 16), waitUntil: inCombat, then: `__autoplay(); ${pulse}` },
  { name: '13_boss_vesper', record: 12, eval: startBoss('kaito', 4, 18), waitUntil: inCombat, then: `__autoplay(); ${pulse}` },
  { name: '14_boss_malachar', record: 13, eval: startBoss('rowan', 5, 20), waitUntil: inCombat, then: `__autoplay(); ${pulse}`, still: 'boss_malachar' },
  {
    name: '15_boonpick', record: 8, eval: startRun('rowan', 2, 'combat', 9), waitUntil: inCombat,
    then: `__autoplay(); __bot.paused = true;`, wait: 2200,
    mid: [`const r = __game.scene.getScene('Room'); r.gainXp(400); 'xp'`, `const r = __game.scene.getScene('Room'); r.openBoonPick('level'); 'pick'`],
    still: 'boonpick',
  },
  {
    name: '16_elite', record: 11, eval: startRun('kaito', 3, 'combat', 14), waitUntil: inCombat,
    then: `__autoplay(); const r = __game.scene.getScene('Room'); r.startAmbush(true); ${pulse}`,
  },
  {
    name: '17_flare', record: 11, eval: startRun('rowan', 2, 'combat', 12), waitUntil: inCombat,
    then: `__autoplay(); setInterval(() => { const r = __game.scene.getScene('Room'); if (r && r.player) { r.player.flare = 100; __controls.flare = true; } }, 3400); 'flaring'`,
  },
  {
    name: '18_shop', record: 8, eval: startRun('rowan', 2, 'combat', 10), waitUntil: `__game.scene.isActive('Room')`,
    then: `const r = __game.scene.getScene('Room'); r.run.gold = 4000; r.scene.pause(); r.scene.launch('Shop', {room: r}); 'shop'`, hold: 1400, still: 'shop',
  },
  { name: '19_forge', record: 8, eval: toHub, wait: 3000, then: `if (__game.scene.isActive('Dialogue')) { __game.scene.stop('Dialogue'); __game.scene.getScene('Hub').scene.resume(); } __game.scene.getScene('Hub').openMenu('Blacksmith'); 'forge'`, hold: 1600, still: 'forge' },
  { name: '20_inventory', record: 8, eval: `${toHub}; __grant(26,'tiktok')`, wait: 3000, then: `if (__game.scene.isActive('Dialogue')) { __game.scene.stop('Dialogue'); __game.scene.getScene('Hub').scene.resume(); } __game.scene.getScene('Hub').openMenu('Inventory'); 'inv'`, hold: 1400, still: 'inventory' },
  {
    name: '21_event', record: 9, eval: startRun('sera', 3, 'combat', 12), waitUntil: `__game.scene.isActive('Room')`,
    then: `const r = __game.scene.getScene('Room'); r.scene.pause(); r.scene.launch('Event', {room: r, eventId: 'ev_wounded_knight'}); 'event'`, hold: 2000, still: 'event',
  },
  {
    name: '22_rest', record: 7, eval: startRun('elio', 4, 'combat', 12), waitUntil: `__game.scene.isActive('Room')`,
    then: `const r = __game.scene.getScene('Room'); r.scene.pause(); r.scene.launch('Rest', {room: r}); 'rest'`, hold: 1600, still: 'rest',
  },
  {
    name: '23_results', record: 9, eval: startRun('rowan', 1, 'combat', 9), waitUntil: inCombat,
    then: `const g = __game; const run = __run.run; run.roomsCleared = 7; run.gold = 1240; run.depth = 3; g.scene.getScenes(true).forEach(sc => sc.scene.stop()); g.scene.start('Results', {victory: true}); 'results'`,
    hold: 2200, still: 'results',
  },
  {
    name: '24_defeat', record: 8, eval: startRun('rowan', 3, 'combat', 6), waitUntil: inCombat,
    then: `const g = __game; const run = __run.run; run.roomsCleared = 4; run.depth = 4; g.scene.getScenes(true).forEach(sc => sc.scene.stop()); g.scene.start('Results', {victory: false}); 'defeat'`,
    hold: 2200, still: 'defeat',
  },
  { name: '25_heroes', record: 9, eval: toHub, wait: 3000, then: `if (__game.scene.isActive('Dialogue')) { __game.scene.stop('Dialogue'); __game.scene.getScene('Hub').scene.resume(); } __game.scene.getScene('Hub').openMenu('Hero'); 'hero'`, hold: 1600, still: 'hero' },
  { name: '26_tree', record: 8, eval: toHub, wait: 3000, then: `if (__game.scene.isActive('Dialogue')) { __game.scene.stop('Dialogue'); __game.scene.getScene('Hub').scene.resume(); } __game.scene.getScene('Hub').openMenu('LanternTree'); 'tree'`, hold: 1600, still: 'tree' },
  { name: '27_quests', record: 8, eval: toHub, wait: 3000, then: `if (__game.scene.isActive('Dialogue')) { __game.scene.stop('Dialogue'); __game.scene.getScene('Hub').scene.resume(); } __game.scene.getScene('Hub').openMenu('QuestLog'); 'quests'`, hold: 1600, still: 'quests' },
  {
    name: '28_dialogue', record: 10, eval: toHub, wait: 3200,
    then: `const h = __game.scene.getScene('Hub'); const spot = h.spots.find(x => x.id.startsWith('npc:')); spot && spot.use(); 'talk'`,
    hold: 2400, mid: [`if (__game.scene.isActive('Dialogue')) { const d = __game.scene.getScene('Dialogue'); d.advance && d.advance(); } 'next'`], still: 'dialogue',
  },
  { name: '29_codex', record: 8, eval: toHub, wait: 3000, then: `if (__game.scene.isActive('Dialogue')) { __game.scene.stop('Dialogue'); __game.scene.getScene('Hub').scene.resume(); } __game.scene.getScene('Hub').openMenu('Codex'); 'codex'`, hold: 1600, still: 'codex' },
  { name: '30_garden', record: 8, eval: toHub, wait: 3000, then: `if (__game.scene.isActive('Dialogue')) { __game.scene.stop('Dialogue'); __game.scene.getScene('Hub').scene.resume(); } __game.scene.getScene('Hub').openMenu('Garden'); 'garden'`, hold: 1600, still: 'garden' },
];

// ---- runner -----------------------------------------------------------------

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const queue = scenarios.filter((s) => !wanted.length || wanted.some((w) => s.name.startsWith(w)));
if (!queue.length) throw new Error(`No scenario matches ${wanted.join(', ')}`);

function serve() {
  const child = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', 'dist-qa', '--strictPort', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  const log = fs.createWriteStream(path.join(PROJECT, '.capture-server.log'));
  child.stdout.pipe(log); child.stderr.pipe(log);
  return child;
}

async function waitForServer(ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(BASE, { signal: AbortSignal.timeout(1500) })).ok) return true; } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const has = (name) => fs.existsSync(path.join(CLIPS, `${name}.mp4`));
const missing = queue.filter((s) => !has(s.name));
if (process.env.FORCE !== '1' && !wanted.length && missing.length === 0) {
  console.log('All clips already recorded. Pass FORCE=1 to redo.');
  process.exit(0);
}

const server = await waitForServer() ? null : serve();
if (!(await waitForServer())) throw new Error(`Preview server never answered on ${BASE} (see .capture-server.log)`);

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle'] });
const report = [];

for (const sc of queue) {
  if (process.env.FORCE !== '1' && wanted.length && has(sc.name) && !process.env.ONLY) {
    console.log(`skip ${sc.name} (exists)`);
    continue;
  }
  const t0 = Date.now();
  const ctx = await browser.newContext({
    // 1080x1920 at dpr 1 gives the game the same 3x virtual layout as a phone, and the video maps 1:1 onto the frame.
    viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true,
    recordVideo: RECORD ? { dir: RAW, size: { width: 1080, height: 1920 } } : undefined,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction('window.__game && window.__services && window.__services.save && window.__grant', null, { timeout: 40000 });
  await page.waitForFunction("['Menu','Onboarding','Hub','Splash'].some(k => __game.scene.isActive(k))", null, { timeout: 40000 });

  let recordFrom = 0;
  const stamp = () => { if (!recordFrom) recordFrom = (Date.now() - t0) / 1000; };

  await page.evaluate(sc.eval);
  if (sc.wait) await page.waitForTimeout(sc.wait);
  if (sc.waitUntil) await page.waitForFunction(sc.waitUntil, null, { timeout: 90000 }).catch(() => errors.push(`waitUntil timed out: ${sc.name}`));
  if (sc.then) await page.evaluate(sc.then);
  if (sc.hold) await page.waitForTimeout(sc.hold);
  stamp();
  for (const step of sc.mid ?? []) { await page.evaluate(step); await page.waitForTimeout(900); }
  if (sc.still) await page.screenshot({ path: path.join(STILLS, `${sc.still}.png`) });
  const scenes = await page.evaluate("__game.scene.getScenes(true).map(s => s.scene.key).join('>')").catch(() => '?');
  await page.waitForTimeout(sc.record * 1000 + 400);

  const video = await page.video();
  const rawPath = path.join(RAW, `${sc.name}.webm`);
  await ctx.close();
  if (video) await video.saveAs(rawPath);

  if (RECORD) {
    const out = path.join(CLIPS, `${sc.name}.mp4`);
    const res = spawnSync(FFMPEG, [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', rawPath,
      '-ss', recordFrom.toFixed(2), '-t', String(sc.record),
      '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'fast',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out,
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    if (res.status !== 0) throw new Error(`ffmpeg failed for ${sc.name}: ${res.stderr}`);
    fs.rmSync(rawPath, { force: true });
  }

  report.push({ name: sc.name, seconds: sc.record, recordFrom: Number(recordFrom.toFixed(2)), scenes, errors });
  console.log(`✓ ${sc.name}  ${sc.record}s from ${recordFrom.toFixed(1)}s  [${scenes}]  ${errors.length ? `!! ${errors.join(' | ')}` : ''}  (${((Date.now() - t0) / 1000).toFixed(0)}s wall)`);
}

await browser.close();
server?.kill();
fs.rmSync(RAW, { recursive: true, force: true });
fs.writeFileSync(path.join(PROJECT, 'capture-report.json'), JSON.stringify({ capturedAt: new Date().toISOString(), clips: report }, null, 2));
console.log(`\n${report.length} clips in public/clips, stills in public/stills`);
