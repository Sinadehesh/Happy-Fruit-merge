// Gem Jar ad recorder. The page runs on a virtual clock (timers, animation frames, CSS animations, Date and
// performance.now all follow it), so every frame is exact and two runs with the same seed play the same game.
// Sounds go into an OfflineAudioContext at their virtual times and are rendered at the end.
//   node record.js explore <set> <seed> <seconds>              -> the merges, and the best 20-second window
//   node record.js capture <set> <seed> <start> <end> <outdir> -> outdir/f00001.jpg... and outdir/sfx.wav
const { chromium } = require('playwright');
const fs = require('fs');
const [mode, SET, SEED] = process.argv.slice(2, 5);
const BASE = process.env.BASE || 'http://localhost:8765';
const FPS = 30, STEP = 1000 / 60;
const W = 432, H = 768, DPR = 2.5;   // 1080 x 1920

function init([seed, set, audioSeconds]) {
  // ---- storage: a player who has everything open, boosters in hand, no pop-ups ----
  try {
    if (!sessionStorage.getItem('_rec')) {
      localStorage.clear(); sessionStorage.setItem('_rec', '1'); sessionStorage.setItem('gemJar.session', '1');
      const d = new Date(), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      localStorage.setItem('gemJar.profile', JSON.stringify({ tutorial: true, level: 24, xp: 520000, seen: 99 }));
      localStorage.setItem('gemJar.gift', JSON.stringify({ last: day, day: 3, streak: 3 }));
      localStorage.setItem('gemJar.unlock', JSON.stringify({ opened: 10, made: [], all: true }));
      localStorage.setItem('gemJar.skin', set);
      localStorage.setItem('gemJar.audio', JSON.stringify({ sfx: true, music: -1, voice: true }));
      localStorage.setItem('gemJar.zaps', '3'); localStorage.setItem('gemJar.stars', '2'); localStorage.setItem('gemJar.undos', '2');
      localStorage.setItem('gemJar.floatTold', '9');
      localStorage.setItem('gemJar.mine', JSON.stringify({ stars: Array(20).fill(3), seen: 21 }));
    }
  } catch (e) {}
  // ---- seeded randomness ----
  let s = seed >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // ---- the virtual clock ----
  let vt = 0; const date0 = Date.now();
  performance.now = () => vt;
  Date.now = () => date0 + vt;
  let timers = [], tid = 1, rafs = [], rid = 1;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.push({ id, at: vt + Math.max(0, +ms || 0), fn, a, every: 0 }); return id; };
  window.setInterval = (fn, ms = 0, ...a) => { const id = tid++; const e = Math.max(1, +ms || 0); timers.push({ id, at: vt + e, fn, a, every: e }); return id; };
  window.clearTimeout = window.clearInterval = id => { timers = timers.filter(t => t.id !== id); };
  window.requestAnimationFrame = fn => { const id = rid++; rafs.push({ id, fn }); return id; };
  window.cancelAnimationFrame = id => { rafs = rafs.filter(r => r.id !== id); };
  const seen = new Map();
  window.__vt = () => vt;
  window.__advance = ms => {
    const end = vt + ms;
    for (let guard = 0; guard < 5000; guard++) {
      let k = -1;
      for (let i = 0; i < timers.length; i++) if (timers[i].at <= end && (k < 0 || timers[i].at < timers[k].at)) k = i;
      if (k < 0) break;
      const t = timers[k];
      vt = Math.max(vt, t.at);
      if (t.every) t.at += t.every; else timers.splice(k, 1);
      try { typeof t.fn === 'function' ? t.fn(...t.a) : eval(t.fn); } catch (e) { console.error('timer', e && e.message); }
    }
    vt = end;
    const list = rafs; rafs = [];
    for (const r of list) { try { r.fn(vt); } catch (e) { console.error('raf', e && e.message); } }
    for (const an of document.getAnimations()) {
      if (!seen.has(an)) { seen.set(an, vt - (an.currentTime || 0)); try { an.pause(); } catch (e) {} }
      try { an.currentTime = vt - seen.get(an); } catch (e) {}
    }
  };
  // ---- sound into an offline context, at virtual times ----
  const SR = 44100;
  window.AudioContext = window.webkitAudioContext = function () {
    const ctx = new OfflineAudioContext(2, Math.ceil(SR * audioSeconds), SR);
    const zero = vt;
    Object.defineProperty(ctx, 'currentTime', { get: () => Math.max(0, (vt - zero) / 1000) });
    Object.defineProperty(ctx, 'state', { get: () => 'running' });
    ctx.resume = () => Promise.resolve(); ctx.suspend = () => Promise.resolve();
    window.__offline = ctx; window.__audioZero = zero;
    return ctx;
  };
}

// in the page, after the game has started: the touch dot, the bot and the event log
function startBot() {
  Render.setPixelRatio(render, 3);   // sharp gems in the video (the game draws the jar at 450 px)
  render.canvas.style.width = '100%'; render.canvas.style.height = '100%';   // (setPixelRatio pins it to 450 css px)
  const st = document.createElement('style');
  st.textContent = `#touch { position: absolute; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; pointer-events: none; z-index: 40;
    background: radial-gradient(circle, rgba(255,255,255,0.55) 0 35%, rgba(255,255,255,0.18) 36% 62%, rgba(255,255,255,0) 64%); box-shadow: 0 0 0 3px rgba(255,255,255,0.75), 0 4px 14px rgba(0,0,0,0.35);
    opacity: 0; transform: scale(0.6); transition: opacity 0.15s, transform 0.18s; }
    #touch.on { opacity: 1; transform: scale(1); } #touch.up { opacity: 0; transform: scale(1.6); transition: opacity 0.3s, transform 0.3s; }`;
  document.head.append(st);
  const dot = document.createElement('div'); dot.id = 'touch'; board.append(dot);
  const place = () => {
    const k = board.clientWidth / GAME_WIDTH, r = TIERS[currentTier] * SPRITE_FIT;
    dot.style.left = `${dropX * k}px`;
    dot.style.top = `${(FLOAT ? spawnY(currentTier) - r - 34 : spawnY(currentTier) + r + 34) * k}px`;
  };
  const log = window.__log = [];
  onGame('merge', (tier, points, combo) => log.push({ t: performance.now(), tier, combo }));
  onGame('gameOver', () => log.push({ t: performance.now(), over: true }));
  const reach = b => FLOAT ? GAME_HEIGHT - b.bounds.max.y : b.bounds.min.y;
  const bodies = () => Composite.allBodies(engine.world);
  function target() {
    const items = bodies().filter(b => b.tier !== undefined && !b.isDropping && !b.isMerging);
    const same = items.filter(b => b.tier === currentTier);
    if (same.length) {
      let best = null, bs = Infinity;
      for (const g of same) {
        const chain = items.some(o => o.tier === currentTier + 1 && Math.hypot(o.position.x - g.position.x, o.position.y - g.position.y) < (TIERS[currentTier + 1] || 0) * 2.4);
        const s = reach(g) - (chain ? 90 : 0) + Math.random() * 30;
        if (s < bs) { bs = s; best = g; }
      }
      return clampX(best.position.x + (Math.random() - 0.5) * 8, currentTier);
    }
    const r = TIERS[currentTier];
    let bx = 225, bsc = -Infinity;
    for (let k = 0; k < 15; k++) {
      const cx = clampX(25 + k * 400 / 14, currentTier);
      let top = GAME_HEIGHT;
      for (const b of bodies()) {
        if (b.isStatic && !b.crate && !b.jarPart) continue;
        if (b.bounds.max.x < cx - r || b.bounds.min.x > cx + r) continue;
        top = Math.min(top, reach(b));
      }
      const s = top + Math.random() * 40;
      if (s > bsc) { bsc = s; bx = cx; }
    }
    return bx;
  }
  function cycle() {
    if (isGameOver) return;
    const tx = target(), x0 = dropX, T = 300 + Math.random() * 160, t0 = performance.now();
    setHeld(true); place(); dot.className = 'on';
    (function move() {
      const k = Math.min(1, (performance.now() - t0) / T), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      dropX = clampX(x0 + (tx - x0) * e, currentTier); updateUI(); place();
      if (k < 1) requestAnimationFrame(move); else setTimeout(release, 110);
    })();
  }
  function release() {
    if (isGameOver) return;
    setHeld(false); dot.className = 'up';
    dropFruit();
    setTimeout(cycle, 560 + Math.random() * 380);
  }
  setTimeout(cycle, 500);
}

(async () => {
  const b = await chromium.launch();
  const total = mode === 'capture' ? +process.argv[6] + 1 : +process.argv[5];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  await ctx.addInitScript(init, [+SEED, SET, total + 2]);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(BASE + '/gems/', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1500));
  // into a game, sound on, then wait (real time) for the sounds to decode
  await p.evaluate(() => { for (let i = 0; i < 30; i++) __advance(1000 / 60); const m = document.getElementById('menu-play'); if (m && m.offsetParent) m.click(); for (let i = 0; i < 30; i++) __advance(1000 / 60); });
  await p.evaluate(() => Sound.unlock());
  await new Promise(r => setTimeout(r, 2500));
  const zero = await p.evaluate(() => __vt());
  await p.evaluate(startBot);
  if (mode === 'explore') {
    const secs = total;
    for (let done = 0; done < secs * 60; done += 600) {
      const over = await p.evaluate(n => { for (let i = 0; i < n; i++) { __advance(1000 / 60); } return isGameOver; }, 600);
      if (over) break;
    }
    const log = (await p.evaluate(() => window.__log)).map(e => ({ ...e, t: (e.t - zero) / 1000 }));
    const end = log.find(e => e.over); const last = end ? end.t : secs;
    // the best 20 seconds: big merges and combos count most; at least 25 s in (a jar with something in it)
    let best = null;
    for (let s = 25; s + 20 <= last - 1; s += 0.5) {
      const m = log.filter(e => !e.over && e.t >= s && e.t < s + 20);
      const score = m.reduce((a, e) => a + Math.pow(e.tier + 1, 2.2) + (e.combo >= 3 ? 25 : 0), 0) + (m.length ? Math.pow(Math.max(...m.map(e => e.tier)) + 1, 2.6) : 0);
      if (!best || score > best.score) best = { start: s, end: s + 20, score: Math.round(score), merges: m.length, top: m.length ? Math.max(...m.map(e => e.tier)) + 1 : 0, combos: m.filter(e => e.combo >= 3).length };
    }
    console.log(JSON.stringify({ set: SET, seed: +SEED, over: end ? end.t : null, merges: log.filter(e => !e.over).length, topLevel: Math.max(0, ...log.filter(e => !e.over).map(e => e.tier + 1)), best, errs: errs.slice(0, 3) }));
  } else {
    const start = +process.argv[5], stop = +process.argv[6], out = process.argv[7];
    fs.mkdirSync(out, { recursive: true });
    // play (no pictures) up to the start of the window
    const startSteps = Math.round(start * 60);
    for (let done = 0; done < startSteps; done += 600) await p.evaluate(n => { for (let i = 0; i < n; i++) __advance(1000 / 60); }, Math.min(600, startSteps - done));
    const frames = Math.round((stop - start) * FPS);
    for (let f = 0; f < frames; f++) {
      await p.evaluate(() => { __advance(1000 / 60); __advance(1000 / 60); });
      await p.screenshot({ path: `${out}/f${String(f + 1).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    }
    // render the sound and keep the window's part (16-bit stereo WAV)
    const wav = await p.evaluate(async ([a0, a1]) => {
      const buf = await window.__offline.startRendering();
      const sr = buf.sampleRate, i0 = Math.round(a0 * sr), i1 = Math.min(buf.length, Math.round(a1 * sr)), n = i1 - i0;
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const out = new DataView(new ArrayBuffer(44 + n * 4));
      const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
      out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) { const l = Math.max(-1, Math.min(1, L[i0 + i])), r = Math.max(-1, Math.min(1, R[i0 + i])); out.setInt16(44 + i * 4, l * 32767, true); out.setInt16(46 + i * 4, r * 32767, true); }
      const bytes = new Uint8Array(out.buffer); let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(s);
    }, [start + (zero - (await p.evaluate(() => window.__audioZero))) / 1000, stop + (zero - (await p.evaluate(() => window.__audioZero))) / 1000]);
    fs.writeFileSync(`${out}/sfx.wav`, Buffer.from(wav, 'base64'));
    const log = (await p.evaluate(() => window.__log)).map(e => ({ ...e, t: (e.t - zero) / 1000 })).filter(e => e.t >= start && e.t < stop);
    console.log(JSON.stringify({ set: SET, frames, merges: log.length, top: Math.max(0, ...log.map(e => (e.tier ?? -1) + 1)), errs: errs.slice(0, 3) }));
  }
  await b.close();
})();
