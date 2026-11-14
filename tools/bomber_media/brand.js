// The end card for the ad (1080 x 1920, 60 fps, transparent, with a short sound sting) and the side panels
// for the 16:9 video (1920 x 1080, transparent in the middle), drawn with the game's own font, text, buttons
// and bombs. The side panels carry no "free" and no call to action, so the 16:9 video suits the store page.
//   node tools/bomber_media/brand.js   ->  android/build-bomber/media/brand/
const fs = require('fs'), path = require('path');
const { openGame, FLAGS, OUT } = require('./page');
const DIR = path.join(OUT, 'brand'), FPS = 60, SECS = 1.8;

(async () => {
    fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(path.join(DIR, 'end'), { recursive: true });
    const g = await openGame({ save: { level: 150, coins: 100, tut: true, bestTier: 11, up: { soldiers: 8, weapons: 12, base: 20, bombs: 16 }, login: { last: 'x', n: 2 }, flags: FLAGS }, seed: 99, film: true, audioSeconds: SECS + 1 });
    const page = g.page;
    // ---------- the end card ----------
    await page.evaluate(() => {
        window.endCard = t => {
            const g = mainCtx;
            g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
            ctx = mainCtx; ctx.setTransform(RS, 0, 0, RS, 0, 0);
            const cx = W / 2, k = x => clamp(x, 0, 1);
            const pop = easeOutBack(k(t / 0.42)), cy = H * 0.34, S = 1.3;   // the logo pops in
            ctx.save(); ctx.translate(cx, cy); ctx.scale(pop * S, pop * S);
            ctx.globalCompositeOperation = 'lighter'; glow('orange', 0, 8, 250, 0.42 * k(t / 0.3)); ctx.globalCompositeOperation = 'source-over';
            ctx.rotate(-0.04);
            text('ZOMBIE', 0, -30, 66, '#8cf06a', 'center', '#1a1026', 13);
            text('BOMBER', 0, 32, 76, '#ff7a2f', 'center', '#1a1026', 14);
            ctx.restore();
            const bt = k((t - 0.12) / 0.4), by = cy - 92 - (1 - easeOutBack(bt)) * 140;   // the Mega Nuke drops in
            if (bt > 0) drawBomb(cx + 168, by + Math.sin(t * 4) * 3, 34, 10, Math.sin(t * 3) * 0.12, k(bt * 3));
            const tg = k((t - 0.32) / 0.25);   // the tagline
            ctx.save(); ctx.globalAlpha = tg; ctx.translate(0, (1 - tg) * 18);
            text('MERGE BOMBS.', cx, H * 0.53, 34, '#fff');
            text('BLOW UP THE HORDE!', cx, H * 0.53 + 44, 34, '#ffd32a');
            ctx.restore();
            const bp = easeOutBack(k((t - 0.5) / 0.3)), pulse = 1 + Math.sin(Math.max(0, t - 0.8) * 7) * 0.035 * k((t - 0.8) / 0.2);   // the button
            if (bp > 0) {
                const bw = 292, bh = 82;
                ctx.save(); ctx.translate(cx, H * 0.7); ctx.scale(bp * pulse, bp * pulse);
                ctx.globalCompositeOperation = 'lighter'; glow('yellow', 0, 0, 190, 0.22); ctx.globalCompositeOperation = 'source-over';
                button(-bw / 2, -bh / 2, bw, bh, '#5ee87a', '#1f9e46', 'PLAY FREE', 40);
                ctx.restore();
            }
            ctx.save(); ctx.globalAlpha = k((t - 0.75) / 0.3);
            text('500 LEVELS  ·  12 BOMBS  ·  BIG BOSSES', cx, H * 0.82, 17, '#d9d2ff', 'center', '#120d22', 4);
            ctx.restore();
        };
        Sound.init();
    });
    const N = Math.round(SECS * FPS);
    for (let f = 0; f < N; f++) {
        const png = await page.evaluate(([f, FPS]) => {
            const t = f / FPS; window.__simT = t;
            if (f === 0) Sound.boom(7);                          // a blast as the logo lands
            if (f === Math.round(0.14 * FPS)) Sound.newBomb();   // a sparkle as the bomb drops in
            if (f === Math.round(0.52 * FPS)) Sound.buy();       // a chime for the button
            endCard(t);
            return canvas.toDataURL('image/png');
        }, [f, FPS]);
        fs.writeFileSync(path.join(DIR, 'end', `e${String(f).padStart(3, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
    }
    await page.addScriptTag({ path: path.join(__dirname, 'director.js') });   // for DIR.sound()
    const snd = await page.evaluate(s => DIR.sound(s), SECS);
    fs.writeFileSync(path.join(DIR, 'end_sound.wav'), Buffer.from(snd.wav, 'base64'));
    // ---------- the 16:9 side panels: each 656 px wide beside the 608 px game, every line fitted to its panel ----------
    const side = await page.evaluate(() => {
        const c = document.createElement('canvas'); c.width = 1920; c.height = 1080;
        const g = c.getContext('2d'), main = ctx; ctx = g;
        const s = 1.75, fit = (str, size, maxPx) => Math.min(size, size * maxPx / (textWidth(str, size) * s));
        g.setTransform(s, 0, 0, s, 0, 0);
        const lx = 328 / s, ly = 410 / s, zs = fit('ZOMBIE', 66, 470), bs = fit('BOMBER', 76, 520);
        ctx.save(); ctx.translate(lx, ly); ctx.globalCompositeOperation = 'lighter'; glow('orange', 0, 8, 170, 0.35); ctx.globalCompositeOperation = 'source-over';
        ctx.rotate(-0.04); text('ZOMBIE', 0, -30, zs, '#8cf06a', 'center', '#1a1026', zs * 0.2); text('BOMBER', 0, 32, bs, '#ff7a2f', 'center', '#1a1026', bs * 0.185); ctx.restore();
        drawBomb(lx + 128, ly - 86, 26, 10, -0.12);
        const ts = Math.min(fit('MERGE BOMBS.', 34, 540), fit('BLOW UP THE HORDE!', 34, 540));
        text('MERGE BOMBS.', lx, 680 / s, ts, '#fff');
        text('BLOW UP THE HORDE!', lx, 680 / s + ts * 1.3, ts, '#ffd32a');
        const rows = [[11, '500 LEVELS'], [6, '25 ZONES'], [9, '12 BOMBS TO MERGE'], [4, 'BIG BOSSES']];
        const rs = Math.min(...rows.map(([, str]) => fit(str, 30, 430)));
        rows.forEach(([tier, str], i) => { const y = (330 + i * 140) / s; drawBomb(1356 / s, y, 21, tier, 0); text(str, 1408 / s, y + 2, rs, '#fff', 'left'); });
        ctx = main;
        return c.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(DIR, 'side_panels.png'), Buffer.from(side.split(',')[1], 'base64'));
    console.log(`end card: ${N} frames; side panels; ` + (g.errors().length ? g.errors().join('\n') : 'no page errors'));
    await g.close();
})();
