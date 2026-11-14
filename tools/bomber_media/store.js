// The Google Play graphics for Zombie Bomber, from real screens of the game:
//   android/store/bomber/screenshots/zombiebomber-screenshot-1..8.png   1080 x 1920: a headline over a game screen
//   android/store/bomber/feature_graphic.png                             1024 x 500: the logo and the horde
//   node tools/bomber_media/store.js   (after film.js final: four screens are frames of the film)
// No "free", "#1", "best" or calls to action: Google Play doesn't allow them on store graphics.
const fs = require('fs'), path = require('path');
const { openGame, FLAGS, OUT, ROOT } = require('./page');
const { ff } = require('./film');
const STORE = path.join(ROOT, 'android', 'store', 'bomber'), FR = path.join(OUT, 'store-frames'), M = path.join(OUT, 'zombie-bomber-gameplay.mp4');
const png = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const toFile = (dataUrl, f) => fs.writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64'));
// [screen, headline, second line]: film frames by time, or the screens captured below
const SHOTS = [
    ['film@0.55', 'DRAG BOMBS', 'ONTO THE HORDE'],
    ['film@1.55', 'MERGE THEM', 'AND BLOW THEM UP!'],
    ['film@8.55', 'MERGE YOUR WAY', 'TO THE MEGA NUKE'],
    ['boss', 'BIG BOSSES', 'EVERY 25 LEVELS'],
    ['film@12.90', 'CALL IN', 'AIR STRIKES'],
    ['zone', '1000 LEVELS', 'IN 50 ZONES'],
    ['shop', 'UPGRADE YOUR', 'SOLDIERS AND BASE'],
    ['daily', 'DAILY REWARDS,', 'MISSIONS AND MORE']
];
const FEATURE_FRAME = 'film@0.15';   // the packed road just before the first throw

async function captured(save, seed, fn) {
    const g = await openGame({ save, seed });
    const shot = await g.page.evaluate(fn => {
        window.__t = 0; last = 0;
        window.step = n => { for (let i = 0; i < n; i++) { if (state === 'play') baseHP = baseMax; window.__t += 1000 / 60; frame(window.__t); } };   // the base holds
        return (0, eval)(`(${fn})`)();
    }, fn.toString());
    if (g.errors().length) console.log(g.errors().join('\n'));
    await g.close();
    return shot;
}

(async () => {
    fs.mkdirSync(FR, { recursive: true }); fs.mkdirSync(path.join(STORE, 'screenshots'), { recursive: true });
    if (!fs.existsSync(M)) throw new Error('make the film first: node tools/bomber_media/film.js final');
    for (const s of [...SHOTS.map(s => s[0]), FEATURE_FRAME].filter(s => s.startsWith('film@'))) {
        ff(['-ss', s.slice(5), '-i', M, '-frames:v', '1', path.join(FR, s.replace('@', '_') + '.png')]);
    }
    // the upgrade shop, mid-game
    toFile(await captured({ level: 47, coins: 6840, gems: 64, streak: 4, tut: true, bestTier: 8, up: { soldiers: 5, weapons: 6, base: 8, bombs: 7 }, login: { last: 'x', n: 4 }, boost: { air: 2, freeze: 3 }, flags: FLAGS }, 5, () => {
        openShop(); while (Meta.t.panel) Meta.t.close(); Meta.t.queue.length = 0; step(50); return canvas.toDataURL('image/png');
    }), path.join(FR, 'shop.png'));
    // a big boss: the Butcher charges at the base in the final wave of level 175 (Plague Marsh), the Kings behind it
    toFile(await captured({ level: 175, coins: 900, gems: 40, streak: 3, tut: true, bestTier: 10, up: { soldiers: 8, weapons: 12, base: 20, bombs: 16 }, login: { last: 'x', n: 4 }, boost: { air: 2, freeze: 2 }, flags: FLAGS }, 7, () => {
        startLevel(175); banner = null; crateAt = 0;
        waveIdx = waves.length - 2; waveState = 'gap'; waveGapT = 0.1;
        step(60 * 2);
        for (let i = 0; i < 60 * 10 && !(boss && boss.type.mech && boss.x < W - 120 && boss.charging > 0.5); i++) step(1);
        banner = null; step(3);
        return canvas.toDataURL('image/png');
    }), path.join(FR, 'boss.png'));
    // one of the new zones: Dune Road (level 328) in a Lightning Storm, a bolt striking the final wave
    toFile(await captured({ level: 328, coins: 900, gems: 40, streak: 3, tut: true, bestTier: 11, up: { soldiers: 8, weapons: 12, base: 20, bombs: 16 }, login: { last: 'x', n: 4 }, boost: { air: 2, freeze: 2 }, flags: FLAGS }, 11, () => {
        startLevel(328); banner = null; crateAt = 0;
        waveIdx = waves.length - 2; waveState = 'gap'; waveGapT = 0.1;
        World.levelStart();
        step(60 * 4.5); banner = null;
        World.t.strike(); step(8);   // a bolt comes down on the horde (and its flash fades)
        return canvas.toDataURL('image/png');
    }), path.join(FR, 'zone.png'));
    // the daily reward, day 5
    toFile(await captured({ level: 46, coins: 5200, gems: 64, streak: 4, tut: true, bestTier: 8, up: { soldiers: 5, weapons: 6, base: 7, bombs: 6 }, login: { last: 'x', n: 4 }, boost: { air: 2, freeze: 3 }, flags: FLAGS }, 5, () => {
        Meta.t.open({ id: 'daily' }); step(40); return canvas.toDataURL('image/png');
    }), path.join(FR, 'daily.png'));

    // ---------- compose ----------
    const g = await openGame({ save: { level: 150, coins: 100, tut: true, bestTier: 11, up: { soldiers: 8, weapons: 12, base: 20, bombs: 16 }, login: { last: 'x', n: 2 }, flags: FLAGS } });
    const load = src => g.page.evaluate(src => new Promise((res, rej) => { const i = new Image(); i.onload = () => { window.__img = i; res(); }; i.onerror = rej; i.src = src; }), src);
    const frameFile = s => path.join(FR, s.replace('@', '_') + '.png');
    for (let i = 0; i < SHOTS.length; i++) {
        const [screen, l1, l2] = SHOTS[i];
        await load(png(frameFile(screen)));
        const tmp = path.join(FR, `shot${i + 1}.png`);
        toFile(await g.page.evaluate(([l1, l2, i]) => {
            const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
            const g = c.getContext('2d'), main = ctx; ctx = g;
            // the game's night purple, an orange glow, faint sparks
            const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, '#2c1b4d'); bg.addColorStop(0.55, '#1a1026'); bg.addColorStop(1, '#0f0a1a');
            g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
            const rg = g.createRadialGradient(540, 300, 40, 540, 300, 700); rg.addColorStop(0, 'rgba(255, 140, 50, 0.35)'); rg.addColorStop(1, 'rgba(255, 140, 50, 0)');
            g.fillStyle = rg; g.fillRect(0, 0, 1080, 1920);
            for (let k = 0; k < 40; k++) { const x = (k * 263 + i * 97) % 1080, y = (k * 151 + i * 53) % 1920, r = 2 + (k % 3); g.fillStyle = `rgba(255, 200, 120, ${0.08 + (k % 5) * 0.04})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
            // the headline, fitted to the width
            g.setTransform(2.4, 0, 0, 2.4, 0, 0);
            const fit = (s, size, max) => Math.min(size, size * max / textWidth(s, size)), sz = Math.min(fit(l1, 44, 410), fit(l2, 44, 410));
            text(l1, 225, 62, sz, '#ffffff');
            text(l2, 225, 62 + sz * 1.12, sz, '#ffd32a');
            // the game screen at 82%, rounded, framed, with a shadow
            g.setTransform(1, 0, 0, 1, 0, 0);
            const w = 886, h = Math.round(w * 1920 / 1080), x = (1080 - w) / 2, y = 1920 - h - 40, r = 40;
            const rr = () => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
            g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 50; g.shadowOffsetY = 16; g.fillStyle = '#000'; rr(); g.fill(); g.restore();
            g.save(); rr(); g.clip(); g.imageSmoothingQuality = 'high'; g.drawImage(window.__img, x, y, w, h); g.restore();
            g.lineWidth = 6; g.strokeStyle = 'rgba(255, 210, 140, 0.55)'; rr(); g.stroke();
            ctx = main;
            return c.toDataURL('image/png');
        }, [l1, l2, i]), tmp);
        ff(['-i', tmp, '-pix_fmt', 'rgb24', path.join(STORE, 'screenshots', `zombiebomber-screenshot-${i + 1}.png`)]);   // Play wants no alpha
    }
    // ---------- the feature graphic: the logo on the left, the horde on the right ----------
    await load(png(frameFile(FEATURE_FRAME)));
    const tmp = path.join(FR, 'feature.png');
    toFile(await g.page.evaluate(() => {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 500;
        const g = c.getContext('2d'), main = ctx; ctx = g;
        g.fillStyle = '#140c24'; g.fillRect(0, 0, 1024, 500);
        const sh = Math.round(1080 * 500 / 1024), sy = 1018 - sh + 6;   // the lower battlefield: the road, the base, the horde
        g.imageSmoothingQuality = 'high'; g.drawImage(window.__img, 0, sy, 1080, sh, 0, 0, 1024, 500);
        const lg = g.createLinearGradient(0, 0, 680, 0); lg.addColorStop(0, 'rgba(18, 10, 32, 0.94)'); lg.addColorStop(0.6, 'rgba(18, 10, 32, 0.66)'); lg.addColorStop(1, 'rgba(18, 10, 32, 0)');
        g.fillStyle = lg; g.fillRect(0, 0, 1024, 500);
        const k = 400 / textWidth('BOMBER', 76), cx = 262, cy = 205;   // "BOMBER" 400 px wide
        g.setTransform(k, 0, 0, k, cx, cy);
        g.globalCompositeOperation = 'lighter'; glow('orange', 0, 8, 160, 0.32); g.globalCompositeOperation = 'source-over';
        g.rotate(-0.04); text('ZOMBIE', 0, -30, 66, '#8cf06a', 'center', '#1a1026', 13); text('BOMBER', 0, 32, 76, '#ff7a2f', 'center', '#1a1026', 14);
        g.setTransform(k, 0, 0, k, cx, cy); drawBomb(156, -78, 26, 10, -0.15);
        const t = 'MERGE BOMBS. BLOW UP THE HORDE!', ts = Math.min(22, 22 * 440 / (textWidth(t, 22) * k));
        g.setTransform(k, 0, 0, k, cx, cy); text(t, 0, 128, ts, '#ffffff');
        ctx = main;
        return c.toDataURL('image/png');
    }), tmp);
    ff(['-i', tmp, '-pix_fmt', 'rgb24', path.join(STORE, 'feature_graphic.png')]);
    console.log(`8 screenshots and the feature graphic in ${path.relative(process.cwd(), STORE)}; ` + (g.errors().length ? g.errors().join('\n') : 'no page errors'));
    await g.close();
})();
