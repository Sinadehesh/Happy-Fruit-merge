// Runs inside the game page for tools/bomber_media/film.js: a "showcase player" that plays a level with real
// touch events (a touch circle drawn over the game shows them) on a fixed 60 fps clock. film.js calls
// DIR.setup(scene) once, then DIR.step(n) for each batch of frames, and DIR.sound() at the end.
window.DIR = (() => {
    const FPS = 60, DT = 1000 / FPS;
    const fing = { x: 330, y: 560, down: false, alpha: 0, idle: 0, ripples: [] };
    const log = [];
    let job = null, f = 0, clock = 0, pause = 0;
    let strikes = 0, lastStrikeWave = -9, nukeDone = false;
    const say = (...a) => log.push(`${(f / FPS).toFixed(2)}s ${a.join(' ')}`);

    // ---------- touches ----------
    function client(x, y) { const r = canvas.getBoundingClientRect(); return { clientX: r.left + x / W * r.width, clientY: r.top + y / H * r.height }; }
    function send(type) {
        canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, buttons: type === 'pointerup' ? 0 : 1, ...client(fing.x, fing.y) }));
    }
    const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    function* wait(s) { for (let n = Math.round(s * FPS); n > 0; n--) yield; }
    function* glide(x, y, s) {
        const x0 = fing.x, y0 = fing.y, n = Math.max(1, Math.round(s * FPS));
        for (let i = 1; i <= n; i++) { const k = ease(i / n); fing.x = x0 + (x - x0) * k; fing.y = y0 + (y - y0) * k; if (fing.down) send('pointermove'); yield; }
    }
    const travel = (x, y) => 0.1 + Math.min(0.22, Math.hypot(x - fing.x, y - fing.y) / 1800);
    function* press() { fing.down = true; send('pointerdown'); yield; }
    function* lift() { fing.down = false; send('pointerup'); fing.ripples.push({ x: fing.x, y: fing.y, t: 0 }); yield; }
    function* tap(x, y) { yield* glide(x, y, travel(x, y)); yield* press(); yield* wait(0.04); yield* lift(); }

    // ---------- reading the game ----------
    const alive = () => zombies.filter(z => !z.dead);
    const onRoad = () => alive().filter(z => z.x < W - 6);
    const landed = () => bayBombs().filter(b => !b.isDropping && !b.isGrowing && !b.isMerging);
    const speedOf = z => z.stun > 0 || freezeT > 0 ? 0 : z.type.speed * z.speedMul;
    // where a throw of this tier does the most, given how far the zombies walk before it lands
    function bestShot(tier, lead = 0.75) {
        const R = blastRadius(tier) * (BOMBS[tier].fx === 'cluster' ? 1.3 : 1), dmg = blastDamage(tier);
        const zs = onRoad().map(z => ({ z, x: z.x - speedOf(z) * lead }));
        let best = null;
        for (let x = 30; x <= W - 20; x += 6) {
            let kills = 0, hits = 0, kings = 0;
            for (const o of zs) {
                if (Math.abs(o.x - x) > R + 12 * o.z.type.size) continue;
                hits++;
                if (o.z.hp <= dmg) kills++;
                if (o.z.type.boss) kings++;
            }
            // before the Nuke, leave the Kings alone: every hit knocks them back and they'd never arrive
            const score = kills * 3 + hits - (x > 360 ? 3 : 0) - (!nukeDone && kings ? 1000 : 0);
            if (!best || score > best.score) best = { x, kills, hits, kings, score };
        }
        return best;
    }

    // ---------- the things the player does ----------
    function* throwBomb_(b, tx, why) {
        const bx = L.bay.x + b.position.x, by = L.bay.y + b.position.y;
        yield* glide(bx, by, travel(bx, by));
        if (!engine.world.bodies.includes(b) || b.isMerging) return;   // it merged meanwhile
        yield* press();
        yield* glide(bx + (tx - bx) * 0.15, by - 34, 0.07);
        const hy = clamp(L.bay.y + 30, L.bay.y + 12, L.bay.y + 50);   // the bomb rides 62 px above the finger: over the road
        yield* glide(tx, hy, 0.26);
        yield* wait(0.2);                      // the aim ring and the kill count
        say('throw', BOMBS[b.tier].name, 'at', Math.round(tx), why);
        yield* lift();
    }
    function* drop(x) { yield* tap(x, L.bay.y + 22); }
    function* airStrike() { const s = Meta.t.boosterSpot(0); say('AIR STRIKE'); yield* tap(s.x, s.y); }

    // a drop onto a bomb of the same size, so it merges (the highest such bomb, so merges chain)
    function mergeSpot() {
        const t = currentTier, same = landed().filter(b => b.tier === t && !b.reserved);
        if (same.length) { same.sort((a, b) => a.position.y - b.position.y); return L.bay.x + same[0].position.x; }
        // otherwise where the pile is lowest, away from the big one we're saving
        let best = null;
        for (let x = L.bay.x + 60; x <= L.bay.x + L.bay.w - 60; x += 12) {
            if (reserve && Math.abs(x - (L.bay.x + reserve.position.x)) < BOMB_R[reserve.tier] + BOMB_R[t]) continue;
            const top = Math.min(L.bay.y + L.bay.h, ...landed().filter(b => Math.abs(L.bay.x + b.position.x - x) < b.currentRadius + BOMB_R[t] * 0.6).map(b => L.bay.y + b.bounds.min.y));
            if (!best || top > best.top) best = { x, top };
        }
        return best ? best.x : L.bay.x + L.bay.w * 0.7;
    }
    let reserve = null;   // the Mega Nuke, kept for the Zombie Kings
    const pileHigh = () => landed().some(b => b.bounds.min.y < BAY_LINE + 40);

    // the film's beats: the final wave comes in early (so both waves are on the road), an Air Strike on the
    // packed road before the Kings get there, the Mega Nuke once all the Kings are in its reach, a second
    // Air Strike for the tough ones left, then the last kill in slow motion. In between: throws and merges.
    let staged = false, nukeAt = -1, strike2 = false, STAGE_AT = 2.5;
    const filmT = () => f / FPS;
    function stage() {
        if (!staged && filmT() >= STAGE_AT && waveIdx === waves.length - 2 && waveState === 'fighting') {
            staged = true; waveState = 'gap'; waveGapT = 1.2;
            showBanner('FINAL WAVE!', 'THE ZOMBIE KING LEADS IT!', '#ff6b6b', 2); Sound.alarm();
        }
    }
    // the Nuke's aim: a spot whose blast reaches every King (once the last one is on screen), and as
    // much of the horde as possible besides
    function kingsShot() {
        const ks = alive().filter(z => z.type.boss), queued = waveQueue.filter(k => k === 'boss').length;
        const R = blastRadius(reserve.tier), dmg = blastDamage(reserve.tier), lead = 0.8;
        const ready = ks.length > 0 && !queued && Math.max(...ks.map(k => k.x)) < W - 8;
        let best = null;
        for (let x = 30; x <= W - 20; x += 6) {
            if (!ks.every(k => Math.abs(k.x - speedOf(k) * lead - x) <= R + 12 * k.type.size)) continue;
            let kills = 0, hits = 0;
            for (const z of onRoad()) { if (Math.abs(z.x - speedOf(z) * lead - x) > R + 12 * z.type.size) continue; hits++; if (z.hp <= dmg) kills++; }
            const score = kills * 3 + hits;
            if (!best || score > best.score) best = { x, kills, hits, score };
        }
        return { s: best, all: ready && !!best, ks: ks.length + queued, inReach: best ? ks.length : 0 };
    }
    function choose() {
        const road = onRoad(), finalWave = waves[waveIdx] && waves[waveIdx].includes('boss');
        if (reserve && !engine.world.bodies.includes(reserve)) reserve = null;
        const bombs = landed().filter(b => b !== reserve).sort((a, b) => b.tier - a.tier);
        const big = bombs[0], kingsOn = road.some(z => z.type.boss && z.x < W + 10);
        // the Air Strike on the packed road, before the Kings are out (it would take them down too)
        const kingsOut = alive().some(z => z.type.boss);
        if (!strikes && filmT() >= 1.2 && road.length >= 10 && !kingsOut && save.boost.air > 0) { strikes++; return airStrike(); }
        // the Mega Nuke, once every King is in its reach
        if (reserve && !nukeDone && finalWave) {
            const k = kingsShot();
            if (k.all && (k.s.hits >= 12 || filmT() > 11)) { nukeDone = true; nukeAt = filmT(); return throwBomb_(reserve, k.s.x, `kills~${k.s.kills} hits ${k.s.hits} kings ${k.inReach}/${k.ks}`); }
        }
        // a second Air Strike only if tough ones are left after the Nuke
        if (nukeDone && !strike2 && filmT() > nukeAt + 1.2 && road.length >= 2 && save.boost.air > 0 && !strike && cdReady()) { strike2 = true; strikes++; return airStrike(); }
        // trouble at the gate
        const close = road.filter(z => z.x < L.stopX + 60);
        if (close.length >= 3 && big) { const s = bestShot(big.tier); if (s.hits >= 2 && s.score > -500) return throwBomb_(big, Math.min(s.x, L.stopX + 50), 'at the gate'); }
        // a big bomb and a good target (after the Nuke, anything that hits)
        if (big) {
            const s = bestShot(big.tier), need = nukeDone ? 1 : big.tier >= 9 ? 6 : big.tier >= 7 ? 4 : 3;
            if (s && s.score > -500 && (s.kills >= need || (strike2 && s.hits >= 1) || (pileHigh() && s.hits >= 2))) return throwBomb_(big, s.x, `kills~${s.kills} hits ${s.hits}`);
        }
        // merge
        if (!jammed && dropCd <= 0 && !pileHigh()) { const x = mergeSpot(); return drop(x); }
        return null;
    }
    const cdReady = () => { try { return !(Meta.t && Meta.t.cd && Meta.t.cd.air > 0); } catch (e) { return true; } };

    // ---------- drawing the finger ----------
    function drawFinger() {
        const g = mainCtx;
        g.save(); g.setTransform(RS, 0, 0, RS, 0, 0);
        for (const r of fing.ripples) {
            const k = r.t / 0.4;
            g.strokeStyle = `rgba(255, 255, 255, ${0.75 * (1 - k)})`; g.lineWidth = 3 * (1 - k) + 1;
            g.beginPath(); g.arc(r.x, r.y, 15 + k * 24, 0, Math.PI * 2); g.stroke();
        }
        if (fing.alpha > 0.01) {
            const a = fing.alpha, r = fing.down ? 15 : 17;
            g.fillStyle = `rgba(0, 0, 0, ${0.18 * a})`; g.beginPath(); g.arc(fing.x + 1.5, fing.y + 2.5, r + 1, 0, Math.PI * 2); g.fill();
            g.fillStyle = `rgba(255, 255, 255, ${(fing.down ? 0.5 : 0.28) * a})`; g.beginPath(); g.arc(fing.x, fing.y, r, 0, Math.PI * 2); g.fill();
            g.strokeStyle = `rgba(255, 255, 255, ${0.9 * a})`; g.lineWidth = 2.5; g.beginPath(); g.arc(fing.x, fing.y, r, 0, Math.PI * 2); g.stroke();
        }
        g.restore();
    }

    // ---------- the film ----------
    function tick() {
        if (state === 'play') stage();
        if (!job && pause <= 0 && state === 'play') { job = choose(); if (job) fing.idle = 0; }
        if (job) { const r = job.next(); if (r.done) { job = null; pause = 0.06 + Math.random() * 0.12; } }
        else { pause -= 1 / FPS; fing.idle += 1 / FPS; }
        fing.alpha = fing.down || job ? Math.min(1, fing.alpha + 0.2) : fing.idle > 0.5 ? Math.max(0, fing.alpha - 0.06) : fing.alpha;
        for (const r of fing.ripples) r.t += 1 / FPS;
        fing.ripples = fing.ripples.filter(r => r.t < 0.4);
    }
    function advance(withDirector) {
        window.__simT = f / FPS;
        if (withDirector) tick();
        clock += DT; window.__simMs = clock;
        frame(clock);
        if (withDirector) drawFinger();
        f++;
    }

    // what goes on, for the log
    const realExplode = window.explode;
    window.explode = function (x, tier, opts = {}) {
        const before = zombies.filter(z => !z.dead).length;
        const r = realExplode(x, tier, opts);
        const killed = before - zombies.filter(z => !z.dead).length;
        if (!opts.small && killed >= 3) say('  boom', BOMBS[tier].name, 'killed', killed);
        return r;
    };
    const realBanner = window.showBanner;
    window.showBanner = function (t, s, c, d) { say('BANNER', t, '/', s); return realBanner(t, s, c, d); };
    const realSpawn = window.spawnBayBomb;
    window.spawnBayBomb = function (x, y, tier, merged) { const b = realSpawn(x, y, tier, merged); if (merged) say('  merge ->', BOMBS[tier].name, 'combo', mergeCombo); return b; };

    return {
        log, fing,
        setup(o) {
            while (Meta.t.panel) Meta.t.close(); Meta.t.queue.length = 0;
            for (const m of save.daily.m || []) { m.n = m.target; m.got = true; }
            save.daily.chest = true;
            last = 0; clock = 0; window.__simMs = 0;
            startLevel(o.level);
            banner = null;
            // the first waves are behind us: wave 4 of 5 is coming in
            waveIdx = o.fromWave - 1; waveState = 'gap'; waveGapT = 0.2;
            kills = waves.slice(0, o.fromWave).reduce((s, w) => s + w.length, 0);
            coinsThisLevel = o.coins || 0; crateAt = 0;
            if (o.kingsAfter !== undefined) {   // the Kings walk in with the final wave, not behind it
                const fw = waves[waves.length - 1], ks = fw.filter(k => k === 'boss'), rest = fw.filter(k => k !== 'boss');
                waves[waves.length - 1] = [...rest.slice(0, o.kingsAfter), ...ks, ...rest.slice(o.kingsAfter)];
            }
            for (const b of o.bay) { const bb = spawnBayBomb(b.x, b.y, b.tier, false); if (b.reserve) { bb.reserved = true; reserve = bb; } }
            for (let i = 0; i < Math.round(o.preroll * FPS); i++) advance(false);
            f = 0;
            Sound.init();   // the film's sound starts now, at 0
            return { alive: alive().length, onRoad: onRoad().length, bay: landed().map(b => b.tier), jammed, state };
        },
        // n frames; returns pictures when asked (every `every` frames)
        step(n, every, quality, type = 'image/jpeg') {
            const pics = [];
            for (let i = 0; i < n; i++) {
                advance(true);
                if (every && (f - 1) % every === 0) pics.push(canvas.toDataURL(type, quality));
            }
            return { pics, f, state, stateT, alive: alive().length, wave: waveIdx };
        },
        // the film's sound as a 16-bit WAV, base64
        async sound(seconds) {
            const buf = await window.__oc.startRendering();
            const n = Math.min(buf.length, Math.round(seconds * buf.sampleRate)), ch = [buf.getChannelData(0), buf.getChannelData(1)];
            const data = new DataView(new ArrayBuffer(44 + n * 4));
            const str = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
            str(0, 'RIFF'); data.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); data.setUint32(16, 16, true);
            data.setUint16(20, 1, true); data.setUint16(22, 2, true); data.setUint32(24, buf.sampleRate, true); data.setUint32(28, buf.sampleRate * 4, true);
            data.setUint16(32, 4, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, n * 4, true);
            let peak = 0;
            for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) { const v = Math.max(-1, Math.min(1, ch[c][i])); peak = Math.max(peak, Math.abs(v)); data.setInt16(44 + (i * 2 + c) * 2, v * 32767, true); }
            const bytes = new Uint8Array(data.buffer); let bin = '';
            for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
            return { wav: btoa(bin), peak };
        }
    };
})();
