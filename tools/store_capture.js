// Captures real Gem Jar screens for the Google Play screenshots (tools/make_store_screens.py composes them).
// Serve the repo first (python3 -m http.server 8765 in its root), then: node tools/store_capture.js <out dir> [scene ...]
const { chromium, devices } = require('playwright');
const BASE = 'http://localhost:8765/gems/';
const OUT = process.argv[2];
const ONLY = process.argv.slice(3);
const VIEW = { width: 412, height: 860 };
const ALL_STARS = JSON.stringify({ stars: Array(20).fill(3), seen: 21 });

async function page(b, store, session = true) {
  const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: VIEW });
  await ctx.addInitScript(([store, session]) => {
    try {
      if (!sessionStorage.getItem('_init')) {
        localStorage.clear();
        for (const [k, v] of Object.entries(store)) localStorage.setItem(k, v);
        if (session) sessionStorage.setItem('gemJar.session', '1');
        sessionStorage.setItem('_init', '1');
      }
    } catch (e) {}
  }, [store, session]);
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGE', e.message));
  return p;
}
const xpFor = n => n <= 1 ? 0 : Math.round(250000 * Math.pow((n - 1) / 9, 1.84) / 100) * 100;
const profile = (level) => JSON.stringify({ tutorial: true, xp: Math.round((xpFor(level) + 0.62 * (xpFor(level + 1) - xpFor(level))) / 100) * 100, level, seen: 99, sound: false });

// a settled pile of gems (no two same-size gems touching), then a few merges with a combo going
async function pile(p, layout, merges, comboStart) {
  await p.evaluate(({ layout }) => {
    for (const [x, y, t] of layout) { const a = spawnItem(x, y, t, false); a.isDropping = false; }
  }, { layout });
  await p.waitForTimeout(2500);
  await p.evaluate(({ merges, comboStart }) => {
    combo = comboStart;
    for (const [x, y, t] of merges) {
      const a = spawnItem(x - TIERS[t] * 0.9, y, t, false); a.isDropping = false;
      const c = spawnItem(x + TIERS[t] * 0.9, y, t, false); c.isDropping = false;
    }
  }, { merges, comboStart });
}

const PILE = [[118, 520, 8], [340, 540, 7], [215, 380, 6], [380, 400, 5], [70, 360, 4], [300, 300, 3], [150, 280, 2], [400, 280, 1], [250, 230, 0]];

const scenes = {
  async play_rocks(b) { await play(b, 'rocks', 'play_rocks'); },
  async play_pets(b) { await play(b, 'pets', 'play_pets'); },
  async play_neon(b) { await play(b, 'neon', 'play_neon'); },
  async play_crystal(b) { await play(b, 'crystal', 'play_crystal'); },
  async play_pixel(b) { await play(b, 'pixel', 'play_pixel'); },
  async play_cyber(b) { await play(b, 'cyber', 'play_cyber'); },
  async collection(b) {
    const p = await page(b, { 'gemJar.profile': profile(9), 'gemJar.unlock': JSON.stringify({ opened: 3, made: [0, 0, 0, 0, 0, 0, 0, 31, 9] }),
      'gemJar.mine': JSON.stringify({ stars: [3, 3, 3, 2, 3, 3, 2, 3], seen: 9 }) });
    await p.goto(BASE); await p.waitForTimeout(1500);
    await p.tap('#btn-settings'); await p.waitForTimeout(300); await p.tap('#btn-gems'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/collection.png` });
    await p.evaluate(() => { document.querySelector('#collection .scroll').scrollTop = 520; }); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/collection2.png` });
    await p.context().close();
  },
  async map(b) {
    const p = await page(b, { 'gemJar.profile': profile(9), 'gemJar.mine': JSON.stringify({ stars: [3, 3, 2, 3, 3, 3, 2, 3, 1], seen: 10 }) });
    await p.evaluate(() => 0).catch(() => {});
    await p.goto(BASE); await p.waitForTimeout(800);
    await p.evaluate(() => { sessionStorage.setItem('gemJar.menuNext', '1'); sessionStorage.setItem('gemJar.mapNext', '1'); });
    await p.goto(BASE); await p.waitForTimeout(1800);
    await p.screenshot({ path: `${OUT}/map.png` });
    await p.context().close();
  },
  async stage(b) {
    const p = await page(b, { 'gemJar.profile': profile(9), 'gemJar.mine': ALL_STARS, 'gemJar.unlock': JSON.stringify({ opened: 5, made: [] }), 'gemJar.skin': 'crystal' });
    await p.goto(BASE + '?mine=16'); await p.waitForTimeout(1500);
    await p.evaluate(() => { document.querySelectorAll('.toast, #stage-tip').forEach(e => e.remove()); });
    await p.evaluate(() => { for (const [x, y, t] of [[200, 560, 4], [270, 600, 2], [140, 600, 3], [330, 560, 1]]) { const a = spawnItem(x, y, t, false); a.isDropping = false; } });
    await p.waitForTimeout(2200);
    await p.screenshot({ path: `${OUT}/stage.png` });
    await p.context().close();
  },
  async menu(b) {
    const p = await page(b, { 'gemJar.profile': profile(9), 'gemJar.mine': JSON.stringify({ stars: [3, 3, 2, 3, 3, 3, 2, 3, 1], seen: 10 }), 'gemJar.unlock': JSON.stringify({ opened: 3, made: [] }), 'gemJar.best.rocks': '24310', 'gemJar.best': '24310' }, false);
    await p.goto(BASE); await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/menu.png` });
    await p.context().close();
  },
  async newset(b) {
    const p = await page(b, { 'gemJar.profile': profile(9), 'gemJar.mine': JSON.stringify({ stars: [3, 3, 3, 3, 3, 2], seen: 7 }) });
    await p.goto(BASE + '?mine=7'); await p.waitForTimeout(1500);
    await p.evaluate(() => { const d = { position: { x: 0, y: 0 } }; Mine.onMerge(225, 300, 6, d, d); Mine.onMerge(225, 300, 6, d, d); });
    await p.waitForTimeout(2800);
    await p.screenshot({ path: `${OUT}/newset.png` });
    await p.context().close();
  },
};
async function play(b, skin, name) {
  const p = await page(b, { 'gemJar.profile': profile(9), 'gemJar.mine': ALL_STARS, 'gemJar.unlock': JSON.stringify({ opened: 5, made: [] }), 'gemJar.skin': skin, 'gemJar.best.rocks': '48210' });
  await p.goto(BASE); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.querySelectorAll('.toast').forEach(e => e.remove()); });
  await p.evaluate(() => { score = 18640; bestScore = 24310; updateUI(); });
  await pile(p, PILE, [[225, 200, 4]], 6);
  await p.waitForTimeout(150);
  await p.evaluate(() => FX.praise(3));
  await p.waitForTimeout(550);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await p.context().close();
}
(async () => {
  const b = await chromium.launch();
  for (const [k, f] of Object.entries(scenes)) if (!ONLY.length || ONLY.includes(k)) { await f(b); console.log('shot', k); }
  await b.close();
})();
