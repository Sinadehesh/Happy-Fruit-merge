// Gem Mine stage calibration: a bot plays every stage many times, fast-forwarded, and from how many drops it
// needed this suggests each stage's drops and star lines. The bot drops every 1.5-2.5 seconds, onto the highest
// gem that matches (for crate goals: the matching gem closest to a crate, or next to a crate), and never uses
// boosters, so a person who plans ahead does a bit better.
// Needs Playwright and the game served locally (python3 -m http.server 8765):
//   node tools/calibrate_mine.js [attempts per stage, default 60] [stages, e.g. 1-20 or 3,7] [base url]
// With VERIFY=1 the bot plays with each stage's real drops instead, and reports its wins and stars.
const { chromium } = require('playwright');
const ATTEMPTS = +(process.argv[2] || 60);
const BASE = process.argv[4] || 'http://localhost:8765';
const WORKERS = 4;
const VERIFY = !!process.env.VERIFY;
const range = (process.argv[3] || '1-20').split(',').flatMap(s => {
    const [a, b] = s.split('-').map(Number);
    return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
});
// the share of tries the bot should win with the stage's drops: easy at first, a saw shape after
const TARGET = [0.97, 0.95, 0.93, 0.9, 0.86, 0.88, 0.86, 0.82, 0.76, 0.62, 0.9, 0.8, 0.8, 0.74, 0.72, 0.6, 0.68, 0.64, 0.6, 0.48];
// a few drops more than the bot needs, for people still learning the game (more in the first stages)
const SLACK = n => n <= 5 ? 3 : 2;

async function playStage(page, n) {
    await page.goto(`${BASE}/gems/?mine=${n}`);
    await page.waitForFunction(() => typeof Mine !== 'undefined' && Mine.N > 0 && typeof engine !== 'undefined');
    await page.waitForTimeout(300);
    return page.evaluate(([attempts, verify]) => {
        Runner.stop(runner);
        Render.stop(render);
        const LIMIT = verify ? Mine.stage.drops : 400;
        const out = [];
        const bodies = () => Matter.Composite.allBodies(engine.world);
        function aim() {
            const items = bodies().filter(b => b.tier !== undefined && !b.isDropping && !b.isMerging);
            const crates = bodies().filter(b => b.crate);
            const forCrates = Mine.stage.goals.some(g => g.k === 'crates') && crates.length > 0;
            const same = items.filter(b => b.tier === currentTier);
            let x;
            if (same.length) {
                let best = null, bestScore = Infinity;
                for (const g of same) {
                    const dc = forCrates ? Math.min(...crates.map(c => Math.hypot(c.position.x - g.position.x, c.position.y - g.position.y))) : 0;
                    const s = dc + g.bounds.min.y * (forCrates ? 0.3 : 1) + Math.random() * 40;
                    if (s < bestScore) { bestScore = s; best = g; }
                }
                x = best.position.x;
            } else {
                // no match: where the pile is lowest, a little toward the crates when they are the goal
                const r = TIERS[currentTier];
                let bestScore = -Infinity;
                for (let k = 0; k < 15; k++) {
                    const cx = clampX(25 + k * 400 / 14, currentTier);
                    let top = 640;
                    for (const b of bodies()) {
                        if (b.isStatic && !b.crate && !b.jarPart) continue;   // the walls and the floor
                        if (b.bounds.max.x < cx - r || b.bounds.min.x > cx + r) continue;
                        top = Math.min(top, b.bounds.min.y);
                    }
                    const near = forCrates ? Math.min(...crates.map(c => Math.abs(c.position.x - cx))) : 999;
                    const s = top + (near < 90 ? 60 : 0) + Math.random() * 50;
                    if (s > bestScore) { bestScore = s; x = cx; }
                }
            }
            return clampX(x, currentTier);
        }
        for (let a = 0; a < attempts; a++) {
            Mine.restart({ drops: LIMIT });
            let frame = 0, next = 40, outcome = 'stuck';
            while (frame < 60 * 60 * 20) {
                Engine.update(engine, 1000 / 60);
                frame++;
                if (isGameOver) { outcome = Mine.goalsMet() ? 'win' : Mine.dropsLeft === 0 ? 'drops' : 'full'; break; }
                if (frame < next) continue;
                next = frame + 90 + Math.floor(Math.random() * 61);
                if (Mine.dropsLeft <= 0 || Mine.goalsMet()) continue;
                dropX = aim();
                dropFruit();
            }
            out.push({ outcome, used: LIMIT - Mine.dropsLeft, left: Mine.dropsLeft, stars: outcome === 'win' ? Mine.starsFor(Mine.dropsLeft) : 0 });
        }
        return out;
    }, [ATTEMPTS, VERIFY]);
}

const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : NaN; };

(async () => {
    const browser = await chromium.launch();
    const queue = [...range];
    const results = {};
    const t0 = Date.now();
    await Promise.all(Array.from({ length: WORKERS }, async () => {
        const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
        await ctx.addInitScript(() => {
            try {
                sessionStorage.setItem('gemJar.session', '1');
                if (!localStorage.getItem('gemJar.calib')) {
                    localStorage.clear();
                    localStorage.setItem('gemJar.calib', '1');
                    localStorage.setItem('gemJar.profile', JSON.stringify({ tutorial: true, xp: 30000, level: 3 }));
                }
                localStorage.setItem('gemJar.mine', JSON.stringify({ stars: Array(40).fill(1) }));   // every stage open
            } catch (e) {}
        });
        const page = await ctx.newPage();
        page.on('pageerror', e => console.error('page error', e.message));
        while (queue.length) {
            const n = queue.shift();
            results[n] = await playStage(page, n);
            process.stderr.write(`stage ${n} done (${Math.round((Date.now() - t0) / 1000)} s)\n`);
        }
        await ctx.close();
    }));
    await browser.close();
    const summary = {};
    if (VERIFY) {
        for (const n of range) {
            const r = results[n], count = k => r.filter(x => x.stars === k).length;
            summary[n] = { tries: r.length, win: +(r.filter(x => x.outcome === 'win').length / r.length).toFixed(2),
                lostDrops: r.filter(x => x.outcome === 'drops').length, lostFull: r.filter(x => x.outcome === 'full').length,
                stars123: [count(1), count(2), count(3)] };
        }
        console.log(JSON.stringify(summary, null, 1));
        return;
    }
    for (const n of range) {
        const r = results[n];
        const wins = r.filter(x => x.outcome === 'win').map(x => x.used);
        const winShare = wins.length / r.length;
        const target = TARGET[n - 1] || 0.6;
        // the fewest drops that let the bot win `target` of its tries
        const sorted = [...wins].sort((a, b) => a - b);
        const k = Math.ceil(target * r.length);
        const botDrops = k <= sorted.length ? sorted[k - 1] : NaN;
        const within = sorted.filter(u => u <= botDrops);
        const drops = botDrops + SLACK(n);
        // star lines in drops left: about half of the bot's wins get 2 stars or more, about a quarter 3
        const s2 = Math.max(1, drops - pct(within, 0.5));
        const s3 = Math.max(s2 + 1, drops - pct(within, 0.25));
        summary[n] = { tries: r.length, winShare: +winShare.toFixed(2), full: r.filter(x => x.outcome === 'full').length, stuck: r.filter(x => x.outcome === 'stuck').length,
            usedP10: pct(wins, 0.1), usedP50: pct(wins, 0.5), usedP90: pct(wins, 0.9), target, botDrops, drops, stars: [s2, s3] };
    }
    console.log(JSON.stringify(summary, null, 1));
})();
