// Inspect the separate, debuggable QA package. Customer builds expose neither these hooks nor test menus.
// Usage: adb forward tcp:9228 localabstract:webview_devtools_remote_<app-pid>
//        node tools/admob-native-status.mjs
// Optional argument: path to a QA-only JavaScript file to run before collecting status.
import { readFile } from 'node:fs/promises';
const action = process.argv[2] ? await readFile(process.argv[2], 'utf8') : '';
const port = Number(process.env.DAWNBOUND_AD_TEST_PORT || 9228);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local test port');
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = pages.find((page) => page.url === 'https://localhost/' && page.title === 'Dawnbound');
if (!target) throw new Error('Dawnbound WebView not found');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});
const result = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => { ws.close(); reject(new Error('Native status timed out')); }, 15_000);
  ws.addEventListener('message', (event) => {
    const response = JSON.parse(event.data);
    if (response.id !== 1) return;
    clearTimeout(timeout);
    ws.close();
    if (response.error || response.result?.exceptionDetails) reject(new Error(JSON.stringify(response)));
    else resolve(response.result.result.value);
  });
});
ws.send(JSON.stringify({
  id: 1, method: 'Runtime.evaluate',
  params: {
    expression: `(async () => {
      const build = await (await fetch('/ad-build.json')).json();
      if (!build.qa || !window.Capacitor.isNativePlatform() || !window.__services) throw new Error('Native QA build required');
      const actionResult = ${action ? `await (async () => { ${action} })()` : 'undefined'};
      const game = window.__game;
      const labels = [];
      const buttons = [];
      const walk = (children) => children.forEach(c => {
        if (typeof c.text === 'string' && c.text) labels.push(c.text);
        if (c.input?.enabled && c.getBounds) {
          const { x, y, width, height } = c.getBounds();
          buttons.push({ type: c.type, x, y, width, height });
        }
        if (c.list) walk(c.list);
      });
      game.scene.getScenes(true).forEach(s => walk(s.children.list));
      const save = window.__services.save.data;
      return {
        native: true, demoAds: build.testAds,
        build, actionResult,
        scenes: game.scene.getScenes(true).map(s => s.scene.key),
        ads: window.__services.ads?.diagnostics,
        result: window.__nativeAdResult,
        labels, buttons,
        save: { currency: save.currency, giftDay: save.shop.giftDay, runs: save.stats.runs, adBreaks: save.shop.adBreaks },
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, canvas: game.canvas.getBoundingClientRect().toJSON() }
      };
    })()`,
    awaitPromise: true, returnByValue: true,
  },
}));
console.log(JSON.stringify(await result, null, 2));
