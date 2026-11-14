// --- ZOMBIE BOMBER: THE WORLD ---
// What makes levels look and play differently, besides the zombies:
//   Weather: every zone has its own (zone.fx in bomber.js): rain, snow, ash, embers, spores, fog, fireflies,
//            leaves, flies, dust, sand, acid rain, neon rain, motes, cherry petals, wisps, bats, shooting stars,
//            an aurora, and lightning in the sky.
//   Special levels (bomber.js SPECIALS) that change the battlefield:
//            BLACKOUT: the battlefield goes dark; explosions, fires, the base's searchlight and the aim ring
//                      light it, and the zombies' eyes glow.
//            GRAVEYARD SHIFT: zombies climb out of the ground along the road (bomber.js spawnPack, World.rise).
//            LIGHTNING STORM: heavy rain, and lightning that strikes the horde every few seconds.
// Loaded before bomber.js and called from it (World.update, World.drawFront, World.levelStart, World.rise);
// it uses bomber.js's helpers and state, which exist by the time any of it runs.

const World = (() => {
    let parts = [], splashes = [], bolts = [];
    let made = '', kinds = [];
    let t = 0, skyT = 6, strikeT = 2;
    const dark = { c: document.createElement('canvas') };
    dark.g = dark.c.getContext('2d');

    // ---------- WEATHER ----------
    const top = () => L.battleTop, bottom = () => L.battleBottom;
    // n: how many at once; make(p, first): place a new one (first: anywhere, as if it had been falling a while)
    const fall = (o) => ({
        n: o.n,
        make(p, first) {
            p.x = rand(-60, W + 80); p.y = first ? rand(top(), bottom()) : top() - rand(0, 60);
            p.vx = o.wind + rand(-20, 20); p.vy = rand(o.speed[0], o.speed[1]);
            p.len = rand(o.len[0], o.len[1]); p.a = rand(o.alpha[0], o.alpha[1]);
            p.floor = rand(L.laneTop - 6, bottom() - 2); p.c = o.colors ? pick(o.colors) : o.color;
        },
        step(p, dt) {
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.y >= p.floor) {
                if (o.splash && splashes.length < 40 && p.x > 0 && p.x < W) splashes.push({ x: p.x, y: p.floor, t: 0, c: p.c, a: p.a });
                return false;
            }
            return true;
        },
        draw(p) {
            ctx.strokeStyle = `rgba(${p.c}, ${p.a})`; ctx.lineWidth = o.width;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * p.len / p.vy, p.y - p.len); ctx.stroke();
        }
    });
    const flakes = (o) => ({
        n: o.n,
        make(p, first) {
            p.x = rand(-30, W + 60); p.y = first ? rand(top(), bottom()) : top() - rand(0, 30);
            p.vx = o.wind + rand(-12, 12); p.vy = rand(o.speed[0], o.speed[1]); p.r = rand(o.size[0], o.size[1]);
            p.ph = rand(0, 6); p.a = rand(0.55, 0.95); p.c = o.colors ? pick(o.colors) : o.color; p.spin = rand(-4, 4); p.rot = rand(0, 6);
        },
        step(p, dt) {
            p.x += (p.vx + Math.sin(t * o.sway + p.ph) * o.swayPx) * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
            return p.y < bottom() + 4 && p.x > -60;
        },
        draw(p) {
            ctx.fillStyle = `rgba(${p.c}, ${p.a * o.alpha})`;
            if (o.leaf) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ellipse(0, 0, p.r * 1.8, p.r * 0.8); ctx.fill(); ctx.restore(); }
            else { circle(p.x, p.y, p.r); ctx.fill(); }
        }
    });
    const glows = (o) => ({   // glowing specks that rise, drift or wander
        n: o.n,
        make(p, first) {
            p.x = rand(0, W); p.y = first ? rand(o.from(), o.to()) : o.spawnY ? o.spawnY() : rand(o.from(), o.to());
            p.vx = rand(o.vx[0], o.vx[1]); p.vy = rand(o.vy[0], o.vy[1]); p.life = rand(o.life[0], o.life[1]); p.t = first ? rand(0, p.life) : 0;
            p.r = rand(o.size[0], o.size[1]); p.ph = rand(0, 6);
        },
        step(p, dt) {
            p.t += dt;
            if (o.wander) { p.vx += rand(-60, 60) * dt; p.vy += rand(-60, 60) * dt; p.vx = clamp(p.vx, -30, 30); p.vy = clamp(p.vy, -24, 24); }
            p.x += (p.vx + Math.sin(t * 1.3 + p.ph) * (o.sway || 0)) * dt; p.y += p.vy * dt;
            if (o.wander) { if (p.y < o.from()) p.vy = Math.abs(p.vy); if (p.y > o.to()) p.vy = -Math.abs(p.vy); }
            return p.t < p.life && p.y > top() - 10 && p.x > -20 && p.x < W + 20;
        },
        draw(p) {
            const life = Math.min(1, p.t / 0.4, (p.life - p.t) / 0.6), blink = o.blink ? 0.35 + 0.65 * Math.max(0, Math.sin(t * o.blink + p.ph)) : 0.8 + 0.2 * Math.sin(t * 9 + p.ph);
            const a = life * blink;
            if (a <= 0.02) return;
            ctx.globalCompositeOperation = 'lighter';
            glow(o.glow, p.x, p.y, p.r * 5, a * o.alpha);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = o.core; ctx.globalAlpha = a; circle(p.x, p.y, p.r * 0.7); ctx.fill(); ctx.globalAlpha = 1;
        }
    });
    const streaks = (o) => ({   // wind-blown dust or sand, and the haze it raises
        n: o.n, haze: o.haze,
        make(p, first) {
            p.x = first ? rand(-40, W + 40) : W + rand(10, 120); p.y = rand(top(), bottom());
            p.vx = -rand(o.speed[0], o.speed[1]); p.vy = rand(-8, 8); p.len = rand(16, 46); p.a = rand(0.08, o.alpha);
        },
        step(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; return p.x > -60; },
        draw(p) {
            ctx.strokeStyle = `rgba(${o.color}, ${p.a})`; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.len, p.y + p.vy * 0.05); ctx.stroke();
        }
    });
    const fog = {   // low banks of fog drifting over the road
        n: 7,
        make(p, first) { p.x = first ? rand(-120, W + 120) : -rand(140, 220); p.y = rand(L.groundY - 20, bottom() + 10); p.r = rand(100, 160); p.vx = rand(6, 16); p.a = rand(0.16, 0.26); },
        step(p, dt) { p.x += p.vx * dt; return p.x < W + 200; },
        draw(p) { glow('smokeLight', p.x, p.y, p.r, p.a); glow('smokeLight', p.x + p.r * 0.6, p.y + 8, p.r * 0.7, p.a * 0.8); }
    };
    const flies = {   // little clouds of flies over the marsh
        n: 30,
        make(p, first) { const s = Math.floor(rand(0, 3)); p.s = s; p.ph = rand(0, 6); p.f = rand(5, 11); p.rx = rand(6, 18); p.ry = rand(4, 12); },
        step() { return true; },
        draw(p) {
            const cx = (W * (0.25 + p.s * 0.28) + Math.sin(t * 0.3 + p.s * 2) * 60), cy = L.laneTop - 30 + Math.sin(t * 0.4 + p.s) * 24;
            ctx.fillStyle = 'rgba(20, 24, 18, 0.85)';
            circle(cx + Math.sin(t * p.f + p.ph) * p.rx, cy + Math.cos(t * p.f * 1.3 + p.ph) * p.ry, 1.3); ctx.fill();
        }
    };
    const meteors = {   // shooting stars streaking down the sky now and then
        n: 3,
        make(p, first) {
            p.x = rand(W * 0.2, W + 120); p.y = top() + rand(-40, 50);
            const sp = rand(380, 560); p.vx = -sp * 0.8; p.vy = sp * 0.55; p.len = rand(40, 80);
            p.wait = first ? rand(0, 3) : rand(0.6, 3.2); p.t = 0;
            p.life = clamp((L.groundY - 70 - p.y) / p.vy, 0.25, rand(0.6, 1));   // gone before the road
        },
        step(p, dt) {
            if (p.wait > 0) { p.wait -= dt; return true; }
            p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
            return p.t < p.life;
        },
        draw(p) {
            if (p.wait > 0) return;
            const a = Math.min(1, p.t / 0.1, (p.life - p.t) / 0.25), d = Math.hypot(p.vx, p.vy), ux = p.vx / d, uy = p.vy / d;
            const g = ctx.createLinearGradient(p.x, p.y, p.x - ux * p.len, p.y - uy * p.len);
            g.addColorStop(0, `rgba(255, 240, 200, ${0.9 * a})`); g.addColorStop(1, 'rgba(255, 160, 80, 0)');
            ctx.strokeStyle = g; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - ux * p.len, p.y - uy * p.len); ctx.stroke();
            ctx.globalCompositeOperation = 'lighter'; glow('yellow', p.x, p.y, 7, 0.8 * a); ctx.globalCompositeOperation = 'source-over';
        }
    };
    const bats = {   // bats flapping across the sky
        n: 9,
        make(p, first) { p.x = first ? rand(-40, W + 40) : W + rand(20, 260); p.y = top() + rand(20, 120); p.vx = -rand(60, 110); p.ph = rand(0, 6); p.s = rand(0.7, 1.2); p.f = rand(10, 14); },
        step(p, dt) { p.x += p.vx * dt; p.y += Math.sin(t * 2 + p.ph) * 12 * dt; return p.x > -40; },
        draw(p) {
            const flap = Math.sin(t * p.f + p.ph), s = 6 * p.s;
            ctx.fillStyle = 'rgba(20, 14, 30, 0.9)';
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.quadraticCurveTo(p.x - s, p.y - s * flap, p.x - s * 1.9, p.y - s * 0.3 * flap);
            ctx.quadraticCurveTo(p.x - s * 0.9, p.y + s * 0.2, p.x, p.y + s * 0.25);
            ctx.quadraticCurveTo(p.x + s * 0.9, p.y + s * 0.2, p.x + s * 1.9, p.y - s * 0.3 * flap);
            ctx.quadraticCurveTo(p.x + s, p.y - s * flap, p.x, p.y);
            ctx.fill();
        }
    };
    const WEATHER = {
        rain: fall({ n: 60, wind: -110, speed: [620, 760], len: [12, 20], alpha: [0.22, 0.4], color: '185, 205, 255', width: 1.2, splash: true }),
        storm: fall({ n: 150, wind: -230, speed: [760, 900], len: [16, 26], alpha: [0.25, 0.45], color: '190, 210, 255', width: 1.4, splash: true }),
        acid: fall({ n: 60, wind: -60, speed: [560, 700], len: [12, 18], alpha: [0.3, 0.5], color: '160, 255, 110', width: 1.3, splash: true }),
        neon: fall({ n: 70, wind: -90, speed: [600, 740], len: [12, 20], alpha: [0.3, 0.5], colors: ['255, 90, 230', '90, 230, 255'], width: 1.3, splash: true }),
        snow: flakes({ n: 70, wind: -10, speed: [30, 70], size: [1, 2.4], color: '255, 255, 255', alpha: 0.9, sway: 1.5, swayPx: 18 }),
        blizzard: flakes({ n: 160, wind: -170, speed: [90, 150], size: [0.8, 2.2], color: '240, 248, 255', alpha: 0.85, sway: 3, swayPx: 30 }),
        ash: flakes({ n: 55, wind: -14, speed: [16, 42], size: [0.8, 2], colors: ['205, 205, 210', '150, 150, 155', '90, 90, 95'], alpha: 0.8, sway: 0.9, swayPx: 26 }),
        leaves: flakes({ n: 22, wind: -30, speed: [35, 70], size: [2.2, 3.4], colors: ['192, 57, 43', '225, 112, 85', '169, 50, 38', '230, 126, 34'], alpha: 1, sway: 1.2, swayPx: 34, leaf: true }),
        embers: glows({ n: 32, from: () => top() + 30, to: () => bottom(), spawnY: () => rand(L.groundY - 10, bottom()), vx: [-12, 26], vy: [-75, -25], life: [2.4, 4.6], size: [1.1, 2.3], glow: 'orange', core: '#ffd28a', alpha: 0.7, sway: 14 }),
        hellfire: glows({ n: 60, from: () => top() + 20, to: () => bottom(), spawnY: () => rand(L.groundY - 10, bottom()), vx: [-20, 40], vy: [-110, -40], life: [2, 4], size: [1.2, 2.6], glow: 'orange', core: '#ffb15e', alpha: 0.85, sway: 20 }),
        spores: glows({ n: 28, from: () => top() + 30, to: () => bottom(), spawnY: () => rand(L.groundY, bottom()), vx: [-10, 10], vy: [-30, -10], life: [3, 6], size: [1.2, 2.4], glow: 'green', core: '#d4ff9a', alpha: 0.5, sway: 20 }),
        motes: glows({ n: 34, from: () => top() + 10, to: () => bottom(), vx: [-14, 14], vy: [-16, 16], life: [3, 6], size: [1, 2.2], glow: 'purple', core: '#f0c8ff', alpha: 0.65, wander: true, blink: 2 }),
        fireflies: glows({ n: 16, from: () => L.groundY - 110, to: () => L.laneBottom, vx: [-20, 20], vy: [-14, 14], life: [5, 10], size: [1, 1.6], glow: 'yellow', core: '#fffbb0', alpha: 0.8, wander: true, blink: 3 }),
        dust: streaks({ n: 40, speed: [260, 380], color: '215, 195, 160', alpha: 0.22, haze: 'rgba(200, 170, 120, 0.1)' }),
        sand: streaks({ n: 80, speed: [320, 460], color: '235, 195, 125', alpha: 0.3, haze: 'rgba(225, 175, 105, 0.18)' }),
        petals: flakes({ n: 30, wind: -40, speed: [30, 60], size: [1.8, 2.8], colors: ['255, 183, 213', '255, 214, 230', '245, 140, 180'], alpha: 1, sway: 1.4, swayPx: 30, leaf: true }),
        wisps: glows({ n: 12, from: () => L.groundY - 70, to: () => L.laneBottom, vx: [-12, 12], vy: [-10, 10], life: [5, 9], size: [2, 3.2], glow: 'cyan', core: '#d6fff9', alpha: 0.7, wander: true, blink: 1.2 }),
        fog, flies, meteors, bats
    };

    // the weather now: the zone's, and a storm's rain on a Lightning Storm level
    function want() {
        const k = (zone.fx || []).slice();
        if (special && special.id === 'storm' && (state === 'play' || state === 'cleared' || state === 'over' || state === 'revive')) { k.push('storm'); k.push('lightning'); }
        return k;
    }
    function remake() {
        kinds = want();
        made = kinds.join(',') + '|' + zone.name;
        parts = [];
        for (const k of kinds) { const w = WEATHER[k]; if (!w) continue; for (let i = 0; i < w.n; i++) { const p = { k }; w.make(p, true); parts.push(p); } }
        splashes = []; skyT = rand(3, 8);
    }

    // ---------- LIGHTNING ----------
    function makeBolt(x0, x1, y1, power) {
        const pts = [{ x: x0, y: top() - 6 }], n = 9;
        for (let i = 1; i <= n; i++) {
            const k = i / n;
            pts.push({ x: lerp(x0, x1, k) + (i < n ? rand(-26, 26) * (1 - k * 0.5) : 0), y: lerp(top() - 6, y1, k) });
        }
        const branches = [];
        for (let i = 2; i < n - 1; i++) if (Math.random() < 0.35) {
            const p = pts[i], d = Math.random() < 0.5 ? -1 : 1, b = [{ x: p.x, y: p.y }];
            for (let j = 1; j <= 3; j++) b.push({ x: p.x + d * j * rand(10, 22), y: p.y + j * rand(10, 20) });
            branches.push(b);
        }
        bolts.push({ pts, branches, t: 0, life: 0.32, power });
    }
    function drawBolt(b) {
        const k = b.t / b.life, flick = k < 0.5 ? 1 : (Math.sin(b.t * 70) > 0 ? 1 : 0.4) * (1 - k);
        const path = pts => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const p of pts) ctx.lineTo(p.x, p.y); ctx.stroke(); };
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = `rgba(150, 120, 255, ${0.35 * flick})`; ctx.lineWidth = 12 * b.power; path(b.pts);
        ctx.strokeStyle = `rgba(200, 220, 255, ${0.7 * flick})`; ctx.lineWidth = 4.5 * b.power; path(b.pts);
        ctx.strokeStyle = `rgba(255, 255, 255, ${flick})`; ctx.lineWidth = 1.8 * b.power; path(b.pts);
        ctx.lineWidth = 1.2 * b.power;
        for (const br of b.branches) { ctx.strokeStyle = `rgba(210, 225, 255, ${0.7 * flick})`; path(br); }
        ctx.restore();
    }
    // a strike on the horde (Lightning Storm): where it does the most
    function strike() {
        const road = zombies.filter(z => !z.dead && !z.emerge && z.x < W - 20 && z.x > L.stopX - 10);
        if (!road.length) return;
        let best = road[0], bestN = -1;
        for (const z of road) { const n = road.filter(o => Math.abs(o.x - z.x) < 70).length + Math.random(); if (n > bestN) { bestN = n; best = z; } }
        const x = clamp(best.x, 30, W - 20);
        makeBolt(x + rand(-50, 50), x, L.impactY - 6, 1.2);
        explode(x, clamp(stats().dropMin + 3, 3, 9), { scale: 0.75, color: 'purple', quiet: true });
        flashA = Math.max(flashA, 0.45); flashColor = '205, 215, 255';
        Sound.thunder(1);
    }

    // ---------- GRAVEYARD SHIFT ----------
    // a zombie climbing out of the ground: dirt flies, a gravestone is left in the road
    function rise(z) {
        z.under = false;   // a Digger in a graveyard comes up like the rest
        z.emerge = z.emergeMax = 1.05;
        const x = z.x, y = z.y;
        for (let i = 0; i < 10; i++) fieldParts.push({ kind: 'debris', x: x + rand(-10, 10), y: y - 2, vx: rand(-120, 120), vy: rand(-320, -120), g: 1000, drag: 0.4, life: rand(0.6, 1), t: 0, size: rand(2, 4.5), rot: rand(0, 6), vr: rand(-10, 10), floor: y + rand(-4, 8), color: pick(['#5a4030', '#6d5038', '#3d2a1d', '#7a6a5a']) });
        for (let i = 0; i < 5; i++) fieldParts.push({ kind: 'smoke', dust: true, x: x + rand(-14, 14), y: y - rand(0, 8), vx: rand(-30, 30), vy: rand(-30, -5), g: 0, drag: 2.4, life: rand(0.6, 1), t: 0, size: rand(9, 15), grow: 1.4, alpha: 0.5 });
        const gx = x + rand(14, 26), gy = y - rand(10, 18);
        paintDecal(() => {
            ctx.fillStyle = 'rgba(40, 28, 20, 0.55)'; ellipse(x, y + 3, 22, 7); ctx.fill();
            ctx.fillStyle = '#6f6a73'; ctx.strokeStyle = '#2b2730'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(gx - 7, gy); ctx.lineTo(gx - 7, gy - 12); ctx.arc(gx, gy - 12, 7, Math.PI, 0); ctx.lineTo(gx + 7, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#3e3a44'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(gx, gy - 15); ctx.lineTo(gx, gy - 6); ctx.moveTo(gx - 3, gy - 12); ctx.lineTo(gx + 3, gy - 12); ctx.stroke();
        });
        Sound.dig();
    }

    // ---------- BLACKOUT ----------
    // the dark, with holes cut where there is light; drawn at half resolution (it's all soft)
    // The dark is all soft edges, so it's drawn at a quarter of the screen's resolution (a big saving on
    // phones: it covers the whole battlefield every frame) and stretched over it.
    function drawDark() {
        const k = Math.max(0.5, RS * 0.25), y0 = top(), h = bottom() - y0, d = dark, g = d.g;
        const w = Math.ceil(W * k), hh = Math.ceil(h * k);
        if (d.c.width !== w || d.c.height !== hh) { d.c.width = w; d.c.height = hh; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, w, hh);
        const shade = clamp(0.9 - flashA * 1.3, 0.25, 0.9);
        g.fillStyle = `rgba(4, 6, 18, ${shade})`; g.fillRect(0, 0, w, hh);
        g.setTransform(k, 0, 0, k, 0, -y0 * k);
        g.globalCompositeOperation = 'destination-out';
        // a soft hole in the dark (no bigger than the battlefield: a blast's light fills it anyway)
        const hole = (x, y, r, a) => { if (a <= 0.01 || r <= 1) return; r = Math.min(r, 300); g.globalAlpha = Math.min(1, a); g.drawImage(GLOW.white, x - r, y - r, r * 2, r * 2); };
        // the base's own lights, and its searchlight sweeping the road
        hole(70, L.laneTop + 6, 120, 0.85);
        const sx = 58, sy = L.baseBottom - 132, ang = 0.16 + 0.24 * Math.sin(t * 0.55), len = 430, spread = 0.2;
        const grad = g.createLinearGradient(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
        grad.addColorStop(0, 'rgba(0,0,0,0.95)'); grad.addColorStop(0.75, 'rgba(0,0,0,0.6)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = 1; g.fillStyle = grad;
        g.beginPath(); g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(ang - spread) * len, sy + Math.sin(ang - spread) * len);
        g.lineTo(sx + Math.cos(ang + spread) * len, sy + Math.sin(ang + spread) * len);
        g.closePath(); g.fill();
        const ex = sx + Math.cos(ang) * len * 0.82, ey = sy + Math.sin(ang) * len * 0.82;
        hole(ex, ey, 70, 0.75);
        // explosions, their light, fires, flames, bombs in the air, the plane, a crate, muzzle flashes
        for (const e of explosions) { const q = e.t / e.life; hole(e.x, e.y - e.R * 0.3, e.R * (2.4 - q), Math.sqrt(Math.max(0, 1 - q))); }
        for (const l of lights) { const q = l.t / l.life; hole(l.x, l.y, l.r * 1.25, l.a * (1 - q) * 1.8); }
        for (const f of fires) hole(f.x, L.impactY, f.w * 0.8, 0.9 * Math.min(1, (f.life - f.t) / 0.8));
        let flames = 0;
        for (const p of fieldParts) if (p.kind === 'fire' && p.t >= 0 && p.size > 3 && flames++ < 30) hole(p.x, p.y, p.size * 2.6, (1 - p.t / p.life) * 0.75);
        for (const b of thrown) hole(b.x, b.y, 34, 0.7);
        if (plane.x > -100 && plane.x < W + 100) hole(plane.x, plane.y, 46, 0.55);
        if (crate) hole(crate.x, crate.y - 10, 48, 0.75);
        for (const s of soldiers) if (s.recoil > 0) hole(s.x + 14, s.y - 26, 30, s.recoil * 0.8);
        // the ground under the bomb you're holding: you see what you're aiming at
        if (grabbed && grabOverField(grabbed) && state === 'play') hole(clamp(grabbed.x, 24, W - 8), L.impactY, blastRadius(grabbed.tier) * 1.1, 0.8);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.imageSmoothingQuality = 'low'; ctx.drawImage(d.c, 0, 0, w, hh, 0, y0, w / k, hh / k); ctx.restore();
        // eyes in the dark
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const z of zombies) {
            if (z.dead || z.under || z.faded || z.x > W + 10 || (z.emerge && z.emerge > z.emergeMax * 0.6)) continue;
            const s = z.type.size * depthOf(z.y), hgt = ZOMBIE_H * s, bob = z.attacking ? 0 : -Math.abs(Math.sin(z.walk)) * 2.6 * s;
            const rise = z.emerge ? z.emerge / z.emergeMax * hgt : 0;
            const ex1 = z.x - hgt * 0.16, eyY = z.y + bob + rise - hgt * 0.84, gap = Math.max(2.2, hgt * 0.07), blink = Math.sin(t * 2.3 + z.walk * 0.7) > -0.96 ? 1 : 0.1;
            const col = z.type.boss ? 'yellow' : 'red';
            glow(col, ex1, eyY, 5 * s + 3, 0.75 * blink); glow(col, ex1 + gap, eyY - 0.5, 5 * s + 3, 0.75 * blink);
        }
        ctx.restore();
        ctx.fillStyle = '#fff3c4';
        for (const z of zombies) {
            if (z.dead || z.under || z.faded || z.x > W + 10 || (z.emerge && z.emerge > z.emergeMax * 0.6)) continue;
            const s = z.type.size * depthOf(z.y), hgt = ZOMBIE_H * s, bob = z.attacking ? 0 : -Math.abs(Math.sin(z.walk)) * 2.6 * s;
            const rise = z.emerge ? z.emerge / z.emergeMax * hgt : 0;
            const ex1 = z.x - hgt * 0.16, eyY = z.y + bob + rise - hgt * 0.84, gap = Math.max(2.2, hgt * 0.07);
            if (Math.sin(t * 2.3 + z.walk * 0.7) <= -0.96) continue;
            circle(ex1, eyY, Math.max(0.9, 1.1 * s)); ctx.fill(); circle(ex1 + gap, eyY - 0.5, Math.max(0.9, 1.1 * s)); ctx.fill();
        }
    }

    // ---------- THE AURORA (Glacier Pass) ----------
    function drawAurora() {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const y = top() + 40 + i * 26, col = i === 1 ? '120, 255, 200' : '90, 200, 255';
            for (let pass = 0; pass < 2; pass++) {
                ctx.strokeStyle = `rgba(${col}, ${pass ? 0.16 : 0.07})`; ctx.lineWidth = pass ? 8 : 26;
                ctx.beginPath();
                for (let x = -10; x <= W + 10; x += 15) {
                    const yy = y + Math.sin(x * 0.012 + t * (0.5 + i * 0.15) + i * 2) * 14 + Math.sin(x * 0.031 - t * 0.7) * 5;
                    if (x === -10) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
                }
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // ---------- every frame ----------
    function update(dt) {
        t += dt;
        const k = want();
        if (k.join(',') + '|' + zone.name !== made) remake();
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i], w = WEATHER[p.k];
            if (!w.step(p, dt)) w.make(p, false);
        }
        for (const s of splashes) s.t += dt;
        splashes = splashes.filter(s => s.t < 0.2);
        for (const b of bolts) b.t += dt;
        bolts = bolts.filter(b => b.t < b.life);
        // lightning in the sky (zones with lightning, and every storm)
        if (kinds.includes('lightning')) {
            skyT -= dt;
            if (skyT <= 0) {
                skyT = special && special.id === 'storm' ? rand(2.5, 5) : rand(6, 12);
                const x = rand(60, W - 40);
                makeBolt(x + rand(-30, 30), x + rand(-60, 60), L.groundY - rand(20, 90), 0.8);
                flashA = Math.max(flashA, 0.18); flashColor = '200, 210, 255';
                Sound.thunder(0.5);
            }
        }
        // the storm strikes the horde
        if (special && special.id === 'storm' && state === 'play') {
            strikeT -= dt;
            if (strikeT <= 0) { strikeT = rand(1.7, 3.1); strike(); }
        }
        // dirt keeps flying while a zombie climbs out
        if (special && special.id === 'graveyard') for (const z of zombies) if (!z.dead && z.emerge > 0 && Math.random() < dt * 14) {
            fieldParts.push({ kind: 'debris', x: z.x + rand(-12, 12), y: z.y - 2, vx: rand(-90, 90), vy: rand(-220, -90), g: 1000, drag: 0.4, life: rand(0.4, 0.7), t: 0, size: rand(1.5, 3.5), rot: rand(0, 6), vr: rand(-10, 10), floor: z.y + rand(-4, 6), color: pick(['#5a4030', '#6d5038', '#3d2a1d']) });
        }
    }

    // in front of the zombies and the explosions, behind the game's text
    function drawFront() {
        if (kinds.includes('aurora')) drawAurora();
        for (const k of kinds) if (WEATHER[k] && WEATHER[k].haze) { ctx.fillStyle = WEATHER[k].haze; ctx.fillRect(0, top(), W, bottom() - top()); }
        for (const p of parts) WEATHER[p.k].draw(p);
        for (const s of splashes) {
            const q = s.t / 0.2;
            ctx.strokeStyle = `rgba(${s.c}, ${s.a * (1 - q)})`; ctx.lineWidth = 1;
            ellipse(s.x, s.y, 2 + q * 5, 1 + q * 1.6); ctx.stroke();
        }
        if (special && special.id === 'blackout' && (state === 'play' || state === 'cleared' || state === 'over' || state === 'revive')) drawDark();
        for (const b of bolts) drawBolt(b);
    }

    function levelStart() { strikeT = rand(2.5, 4); bolts = []; }

    return { update, drawFront, levelStart, rise, t: { get parts() { return parts; }, get kinds() { return kinds; }, strike, WEATHER } };
})();
