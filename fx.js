// --- COMBO EFFECTS ---
// Draws merge bursts, flying candy pieces, "COMBO xN" labels and praise words on a transparent
// canvas layered over the board. All art is from assets/fx (cut from the combo sheets).

const FX = (() => {
    const W = 450, H = 640;   // same logical size as the board

    const NAMES = ['burst_yellow', 'burst_pink', 'ring', 'sparkle', 'star', 'heart', 'drop_orange', 'drop_red',
        'sprinkle_blue', 'sprinkle_purple', 'jellybean', 'lollipop',
        'word_combo', 'word_sweet', 'word_yummy', 'word_juicy', 'word_tasty', 'word_delicious'];
    const img = {};
    NAMES.forEach(n => { img[n] = new Image(); img[n].src = `assets/fx/${n}.png`; });
    const digit = {};
    ['x', ...'0123456789'].forEach(d => { digit[d] = new Image(); digit[d].src = `assets/fx/digit_${d}.png`; });
    const ready = i => i && i.complete && i.naturalWidth > 0;

    // Pieces that fly out of a merge, with how often each shows up
    const PIECES = [['sparkle', 3], ['star', 3], ['heart', 2], ['drop_orange', 2], ['drop_red', 2],
        ['sprinkle_blue', 2], ['sprinkle_purple', 2], ['jellybean', 1], ['lollipop', 0.4]];
    const pieceTotal = PIECES.reduce((s, p) => s + p[1], 0);
    function randomPiece() {
        let r = Math.random() * pieceTotal;
        return (PIECES.find(p => (r -= p[1]) < 0) || PIECES[0])[0];
    }

    const PRAISE = ['word_sweet', 'word_yummy', 'word_juicy', 'word_tasty', 'word_delicious'];

    let canvas, ctx, effects = [], last = performance.now();
    const rand = (a, b) => a + Math.random() * (b - a);
    const easeOutBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
    // springy pop: overshoots, wobbles and settles at 1
    const elastic = t => t >= 1 ? 1 : 1 - Math.pow(2, -9 * t) * Math.cos(t * 16);

    function init(board) {
        canvas = document.createElement('canvas');
        canvas.className = 'fx-layer';
        board.appendChild(canvas);
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(loop);
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const r = canvas.getBoundingClientRect();
        canvas.width = Math.round(r.width * dpr);
        canvas.height = Math.round(r.height * dpr);
        ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
        ctx.imageSmoothingQuality = 'high';
    }

    // draw an image centred at (x, y) with its larger side `size` px
    function draw(im, x, y, size, rot = 0, alpha = 1) {
        if (!ready(im) || alpha <= 0) return;
        const k = size / Math.max(im.naturalWidth, im.naturalHeight);
        const w = im.naturalWidth * k, h = im.naturalHeight * k;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(x, y); ctx.rotate(rot);
        ctx.drawImage(im, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    // ---------- what the game calls ----------

    // Two items merged at (x, y); r = size of the new item, combo = merges in a row so far
    function merge(x, y, r, combo) {
        const big = Math.min(1, r / 120);
        effects.push({ kind: 'burst', x, y, size: r * 2.6, t: 0, dur: 0.45, name: Math.random() < 0.5 ? 'burst_yellow' : 'burst_pink', rot: rand(0, 6.3) });
        effects.push({ kind: 'ring', x, y, size: r * 2.2, t: 0, dur: 0.55 });
        const n = Math.min(26, 7 + Math.round(big * 6) + combo * 2);
        for (let i = 0; i < n; i++) {
            const a = rand(0, Math.PI * 2), sp = rand(140, 320) * (0.7 + big * 0.6);
            effects.push({
                kind: 'piece', name: randomPiece(), x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, rot: rand(0, 6.3), vr: rand(-8, 8),
                size: rand(16, 28) * (0.8 + big * 0.5), t: 0, dur: rand(0.7, 1.1)
            });
        }
        if (combo >= 2) {
            const ly = Math.max(70, y - r - 28);
            effects.push({ kind: 'combo', x: Math.max(120, Math.min(W - 120, x)), y: ly, count: combo, t: 0, dur: 1.1 });
        }
    }

    // Praise word for a long combo: 0 = SWEET! ... 4 = DELICIOUS!
    function praise(level) {
        const name = PRAISE[Math.min(level, PRAISE.length - 1)];
        effects = effects.filter(e => e.kind !== 'praise');   // one at a time
        effects.push({ kind: 'praise', name, x: W / 2, y: 270, size: 200 + level * 45, t: 0, dur: 1.5 });
        for (let i = 0; i < 18; i++) {
            const a = rand(0, Math.PI * 2), sp = rand(160, 300);
            effects.push({ kind: 'piece', name: ['sparkle', 'star', 'heart'][i % 3], x: W / 2, y: 270,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, rot: rand(0, 6.3), vr: rand(-6, 6), size: rand(18, 30), t: 0, dur: rand(0.8, 1.2) });
        }
    }

    // ---------- animation ----------

    function drawCombo(e) {
        const k = e.t / e.dur;
        const s = elastic(Math.min(1, e.t / 0.45));
        const alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const y = e.y - k * 30;
        // "COMBO" word, then "x" and the digits, side by side
        const wordH = 34, digH = 40;
        const word = img.word_combo;
        const wordW = ready(word) ? word.naturalWidth * wordH / word.naturalHeight : 0;
        const chars = ['x', ...String(e.count)];
        const charW = chars.map(c => ready(digit[c]) ? digit[c].naturalWidth * digH / digit[c].naturalHeight * 0.92 : 0);
        const total = wordW - 4 + charW.reduce((a, b) => a + b, 0);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(e.x, y); ctx.scale(s, s); ctx.rotate(-0.06);
        let cx = -total / 2;
        if (ready(word)) ctx.drawImage(word, cx, -wordH / 2, wordW, wordH);
        cx += wordW - 4;
        chars.forEach((c, i) => {
            const im = digit[c];
            if (ready(im)) {
                const w = im.naturalWidth * digH / im.naturalHeight;
                ctx.drawImage(im, cx - (w - charW[i]) / 2, -digH / 2 - 2, w, digH);
            }
            cx += charW[i];
        });
        ctx.restore();
    }

    function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        ctx.clearRect(0, 0, W, H);
        for (const e of effects) {
            e.t += dt;
            const k = e.t / e.dur;
            if (e.kind === 'burst') {
                draw(img[e.name], e.x, e.y, e.size * (0.35 + 0.75 * easeOutBack(Math.min(1, k * 1.6))), e.rot + k * 0.6, 1 - k * k);
            } else if (e.kind === 'ring') {
                draw(img.ring, e.x, e.y, e.size * (0.5 + 1.2 * Math.sqrt(k)), 0, 0.9 * (1 - k));
            } else if (e.kind === 'piece') {
                e.vy += 700 * dt; e.vx *= 1 - 1.2 * dt;
                e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt;
                const pop = Math.min(1, e.t / 0.12);
                draw(img[e.name], e.x, e.y, e.size * pop * (k > 0.6 ? 1 - (k - 0.6) / 0.4 * 0.6 : 1), e.rot, k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
            } else if (e.kind === 'combo') {
                drawCombo(e);
            } else if (e.kind === 'praise') {
                const s = elastic(Math.min(1, e.t / 0.6));
                const fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
                const im = img[e.name];
                const size = Math.min(e.size, W - 30);
                draw(im, e.x, e.y - Math.max(0, k - 0.75) * 120, size * s, Math.sin(e.t * 5) * 0.03, fade);
            }
        }
        effects = effects.filter(e => e.t < e.dur);
        requestAnimationFrame(loop);
    }

    return { init, merge, praise };
})();
