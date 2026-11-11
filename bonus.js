// --- BONUS: the Lucky Wheel and the Daily Gift (GAME.meta; Gem Jar) ---
//
// Two reasons to open the game every day, both honest:
// - the Lucky Wheel has eight slices of the same size and every spin picks one of them with the same chance
//   (one in eight). One free spin a day; in the Android app up to AD_SPINS more, each for an ad the player
//   chooses to watch. The prize is given the moment the spin starts, so closing the app can't lose it.
// - the Daily Gift is a ladder of seven days shown up front: a bigger gift each day in a row, then round
//   again. Missing a day starts it at Day 1; in the app, after one missed day, an ad can keep the place.
//   An ad can also double the gift.
// The days are the phone's own days (midnight to midnight). Both open at a level (meta.js FEATURES).
(() => {
    if (!GAME.meta || !window.Meta) return;
    const $ = id => document.getElementById(id);
    const inApp = !!window.AndroidApp;
    const { ICON, featureOpen } = Meta;
    const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };
    const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} };
    const img = src => { const i = document.createElement('img'); i.src = src; i.alt = ''; return i; };
    const short = n => n >= 1000 ? (n / 1000) + 'k' : String(n);
    const untilTomorrow = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d - Date.now(); };
    const anotherPanelOpen = me => [...document.querySelectorAll('.overlay.show')].some(o => o.id !== me && o.id !== 'gameover');

    // a prize is some of { zaps, stars, undos, xp }
    const KINDS = [['zaps', 'zap', 'Zap'], ['stars', 'star', 'Star'], ['undos', 'undo', 'Undo']];
    function give(prize, times = 1) {
        if (prize.zaps) addZaps(prize.zaps * times);
        if (prize.stars) addStars(prize.stars * times);
        if (prize.undos) addUndos(prize.undos * times);
        if (prize.xp) Meta.addXP(prize.xp * times);
    }

    // ---------- the Lucky Wheel ----------
    const WHEEL_KEY = `${GAME.id}.wheel`;
    const AD_SPINS = 5;
    const SLICE = 45;   // degrees: eight equal slices
    const COLOURS = ['#ff5c8a', '#ff9a3c', '#5fd37a', '#35c3f0', '#9b6bff', '#ffb02e', '#ff7a45', '#4d8dff'];
    // boosters that haven't opened yet aren't on the wheel
    const wheelSlices = () => [
        { zaps: 1 }, { xp: 2000 }, featureOpen('star') ? { stars: 1 } : { zaps: 2 }, { zaps: 2 },
        { xp: 5000 }, featureOpen('undo') ? { undos: 1 } : { xp: 3000 }, { zaps: 3 }, { xp: 20000, jackpot: true }
    ];
    function wheelState() {
        const today = localDate(0), s = read(WHEEL_KEY);
        return s && s.date === today ? { date: today, free: !!s.free, ads: s.ads | 0 } : { date: today, free: false, ads: 0 };
    }
    const pickSlice = n => Math.floor(Math.random() * n);   // every slice has the same chance

    let slices = [], spinning = false, angle = 0;
    function drawWheel() {
        slices = wheelSlices();
        const disc = $('wheel-disc');
        disc.innerHTML = '';
        disc.style.background = `conic-gradient(${slices.map((s, i) => `${s.jackpot ? '#f2b705' : COLOURS[i]} ${i * SLICE}deg ${(i + 1) * SLICE}deg`).join(', ')})`;
        slices.forEach((s, i) => {
            const cell = document.createElement('div');
            cell.className = 'wheel-prize';
            cell.style.transform = `rotate(${i * SLICE + SLICE / 2}deg)`;
            const label = document.createElement('span');
            if (s.xp) {
                label.className = 'xp';
                const unit = document.createElement('small');
                unit.textContent = s.jackpot ? 'XP ★' : 'XP';
                label.append(short(s.xp), unit);
            } else {
                const [key, icon] = KINDS.find(([k]) => s[k]);
                label.append(img(ICON[icon]), `×${s[key]}`);
            }
            cell.append(label);
            disc.append(cell);
        });
    }
    function renderWheel() {
        const st = wheelState(), btn = $('btn-spin'), note = $('wheel-note');
        const adsLeft = AD_SPINS - st.ads;
        if (spinning) { btn.disabled = true; return; }
        btn.disabled = false;
        if (!st.free) {
            btn.className = 'pill green';
            btn.textContent = 'Free spin';
            note.textContent = 'Every slice has the same chance';
        } else if (inApp && adsLeft > 0) {
            const ready = Ads.rewardedReady();
            btn.className = 'pill yellow';
            btn.textContent = ready ? '▶ Spin' : 'Loading…';
            btn.disabled = !ready;
            note.textContent = `Watch a short ad to spin again · ${adsLeft} left today`;
        } else {
            btn.className = 'pill grey';
            btn.textContent = 'Tomorrow';
            btn.disabled = true;
            note.textContent = `Free spin in ${Meta.timeLeft(untilTomorrow())}`;
        }
    }
    function showResult(prize) {
        const box = $('wheel-result');
        box.innerHTML = '';
        if (prize.xp) box.append(`+${prize.xp.toLocaleString()} XP${prize.jackpot ? ' · Jackpot!' : ''}`);
        else {
            const [key, icon, name] = KINDS.find(([k]) => prize[k]);
            box.append(img(ICON[icon]), `+${prize[key]} ${name}${prize[key] > 1 ? 's' : ''}`);
        }
        box.classList.remove('win'); void box.offsetWidth; box.classList.add('win');
        Sound.play(prize.jackpot ? 'levelUp' : 'claim');
        Haptics.play('praise', prize.jackpot ? 3 : 1);
    }
    function spin(kind) {
        if (spinning) return;
        const st = wheelState();
        if (kind === 'free') { if (st.free) return; st.free = true; }
        else { if (st.ads >= AD_SPINS) return; st.ads++; }
        write(WHEEL_KEY, st);
        const k = pickSlice(slices.length), prize = slices[k];
        give(prize);   // given now; the spin only shows it
        spinning = true;
        $('wheel-result').innerHTML = '';
        renderWheel();
        // turn the disc so the middle part of slice k stops under the pin at the top
        const stopAt = 360 - (k * SLICE + SLICE / 2 + (Math.random() - 0.5) * (SLICE - 14));
        const from = angle, to = angle - (angle % 360) + 5 * 360 + stopAt, t0 = performance.now(), TIME = 4200;
        const disc = $('wheel-disc'), pin = $('wheel-pin');
        let lastSlice = Math.floor(from / SLICE), lastTick = 0;
        const frame = now => {
            const t = Math.min(1, (now - t0) / TIME);
            const a = from + (to - from) * (1 - Math.pow(1 - t, 3.2));   // fast, then slowing to a stop
            disc.style.transform = `rotate(${a}deg)`;
            const sl = Math.floor(a / SLICE);
            if (sl !== lastSlice) {   // a slice line passes the pin
                lastSlice = sl;
                if (now - lastTick > 70) { lastTick = now; Sound.play('tick', false); pin.classList.remove('tick'); void pin.offsetWidth; pin.classList.add('tick'); }
            }
            if (t < 1) { requestAnimationFrame(frame); return; }
            angle = to;
            spinning = false;
            showResult(prize);
            renderWheel();
            Meta.refreshMenu();
        };
        requestAnimationFrame(frame);
    }
    function openWheel() {
        if (!featureOpen('wheel') || anotherPanelOpen('wheel')) return;
        Sound.play('tap');
        if (!spinning) { drawWheel(); $('wheel-result').innerHTML = ''; }
        renderWheel();
        $('wheel').classList.add('show');
    }
    function closePanel(id) {
        $(id).classList.remove('show');
        Meta.refreshMenu();
        onGameOver();
        Meta.showLevelCard();   // a prize may have brought a level
    }

    // ---------- the Daily Gift ----------
    const GIFT_KEY = `${GAME.id}.gift`, GIFT_SHOWN = `${GAME.id}.giftShown`;
    const gifts = () => {
        const star = featureOpen('star'), undo = featureOpen('undo');
        return [{ zaps: 1 }, { xp: 3000 }, { zaps: 2 }, star ? { stars: 1 } : { zaps: 2 }, { xp: 8000 },
            undo ? { zaps: 2, undos: 1 } : { zaps: 3 }, star ? { zaps: 3, stars: 2, xp: 20000 } : { zaps: 5, xp: 20000 }];
    };
    function giftState() {
        const s = read(GIFT_KEY) || {};
        return { last: s.last || null, day: Math.min(7, Math.max(0, s.day | 0)), streak: Math.max(0, s.streak | 0) };
    }
    // today's gift: { claimed, day (1 to 7), streak (days in a row), keepDay (the day an ad can keep, after one missed day) }
    function giftToday() {
        const s = giftState();
        if (s.last === localDate(0)) return { claimed: true, day: s.day, streak: s.streak };
        if (s.last === localDate(-1)) return { day: s.day % 7 + 1, streak: s.streak + 1 };
        const t = { day: 1, streak: 1 };
        if (s.last === localDate(-2) && s.day >= 2 && s.day < 7) t.keepDay = s.day + 1;
        return t;
    }
    function giftItems(prize) {
        const box = document.createElement('div');
        box.className = 'items';
        for (const [key, icon] of KINDS) if (prize[key]) { const e = document.createElement('span'); e.append(img(ICON[icon]), `×${prize[key]}`); box.append(e); }
        if (prize.xp) { const e = document.createElement('span'); e.textContent = `${short(prize.xp)} XP`; box.append(e); }
        return box;
    }
    function renderGift(done) {
        const t = giftToday(), box = $('gift-days');
        box.innerHTML = '';
        gifts().forEach((g, i) => {
            const d = i + 1, cell = document.createElement('div');
            const got = d < t.day || (t.claimed && d === t.day);
            cell.className = 'gift-day' + (d === 7 ? ' big' : '') + (got ? ' got' : '') + (!t.claimed && d === t.day ? ' today' : '');
            const name = document.createElement('b');
            name.textContent = `DAY ${d}`;
            cell.append(name, giftItems(g));
            box.append(cell);
        });
        const adReady = inApp && Ads.rewardedReady();
        $('gift-collect').style.display = t.claimed ? 'none' : '';
        $('gift-double').style.display = !t.claimed && adReady ? '' : 'none';
        const next = t.day % 7 + 1;
        $('gift-sub').textContent = t.claimed ? `${done || `Day ${t.day} collected`}. Come back tomorrow for Day ${next}!`
            : t.keepDay ? 'You missed a day, so it starts again at Day 1'
            : t.streak > 1 ? `Day ${t.day} · ${t.streak} days in a row` : 'A bigger gift every day in a row';
        const note = $('gift-note');
        note.innerHTML = '';
        if (t.claimed) note.textContent = `Next gift in ${Meta.timeLeft(untilTomorrow())}`;
        else if (t.keepDay && adReady) {
            const keep = document.createElement('button');
            keep.className = 'pill yellow';
            keep.id = 'gift-keep';
            keep.textContent = `▶ Keep Day ${t.keepDay}`;
            keep.onclick = () => Ads.showRewarded(watched => {
                if (!watched) return;
                const s = giftState();
                write(GIFT_KEY, { last: localDate(-1), day: s.day, streak: s.streak });   // the missed day is bridged
                Sound.play('claim');
                renderGift();
                refresh();
            });
            note.append('Or watch a short ad to keep your place:', document.createElement('br'), keep);
        } else if (adReady) note.textContent = 'Watch a short ad to double it';
    }
    function collectGift(times) {
        const t = giftToday();
        if (t.claimed) return;
        give(gifts()[t.day - 1], times);
        write(GIFT_KEY, { last: localDate(0), day: t.day, streak: t.streak });
        Sound.play(t.day === 7 ? 'levelUp' : 'claim');
        Haptics.play('praise', t.day === 7 ? 3 : 2);
        renderGift(times > 1 ? 'Doubled' : 'Collected');
        refresh();
    }
    function openGift() {
        if (!featureOpen('gift') || anotherPanelOpen('gift')) return;
        Sound.play('tap');
        renderGift();
        $('gift').classList.add('show');
    }
    // on the home menu: today's gift opens by itself, once a day (after the level-up card, if there is one)
    let popTimer = 0;
    function onMenuOpen() {
        clearTimeout(popTimer);
        let shown = null;
        try { shown = sessionStorage.getItem(GIFT_SHOWN); } catch (e) {}
        const today = localDate(0);
        if (shown === today) return;
        const attempt = left => {
            if (!Meta.menuOpen || !featureOpen('gift') || giftToday().claimed) return;
            if (document.querySelector('.overlay.show')) { if (left > 0) popTimer = setTimeout(() => attempt(left - 1), 600); return; }
            try { sessionStorage.setItem(GIFT_SHOWN, today); } catch (e) {}
            openGift();
        };
        popTimer = setTimeout(() => attempt(60), 800);
    }

    // ---------- on the menu and after a game ----------
    function refresh() {
        const w = $('side-wheel'), g = $('side-gift');
        const wOpen = featureOpen('wheel'), gOpen = featureOpen('gift');
        w.classList.toggle('open', wOpen);
        g.classList.toggle('open', gOpen);
        if (wOpen) {
            const st = wheelState(), adsLeft = inApp ? AD_SPINS - st.ads : 0;
            w.classList.toggle('has-news', !st.free);
            $('side-wheel-sub').textContent = !st.free ? 'FREE' : adsLeft > 0 ? `▶ ${adsLeft} left` : Meta.timeLeft(untilTomorrow());
        }
        if (gOpen) {
            const t = giftToday();
            g.classList.toggle('has-news', !t.claimed);
            $('side-gift-sub').textContent = t.claimed ? Meta.timeLeft(untilTomorrow()) : `Day ${t.day}`;
        }
    }
    // the game-over panel says so when the gift or the free spin is waiting
    function onGameOver() {
        const b = $('go-bonus');
        b.innerHTML = '';
        let show = false;
        if (isGameOver && featureOpen('gift') && !giftToday().claimed) { b.append(img(ICON.gift), 'Daily Gift ready!'); b.onclick = openGift; show = true; }
        else if (isGameOver && featureOpen('wheel') && !wheelState().free) { b.append(img(ICON.wheel), 'Free spin ready!'); b.onclick = openWheel; show = true; }
        b.style.display = show ? '' : 'none';
    }

    $('side-wheel').onclick = openWheel;
    $('side-gift').onclick = openGift;
    $('btn-spin').onclick = () => {
        if (spinning) return;
        const st = wheelState();
        if (!st.free) { spin('free'); return; }
        if (inApp && st.ads < AD_SPINS && Ads.rewardedReady()) Ads.showRewarded(watched => { if (watched) spin('ad'); });
    };
    $('btn-close-wheel').onclick = () => { if (!spinning) closePanel('wheel'); };
    $('btn-close-gift').onclick = () => closePanel('gift');
    $('gift-collect').onclick = () => collectGift(1);
    $('gift-double').onclick = () => Ads.showRewarded(watched => { if (watched) collectGift(2); });
    // the ad buttons follow whether an ad is ready, and the clocks run
    setInterval(() => {
        if ($('wheel').classList.contains('show')) renderWheel();
        if ($('gift').classList.contains('show') && !giftToday().claimed) {
            const adReady = inApp && Ads.rewardedReady();
            $('gift-double').style.display = adReady ? '' : 'none';
        }
    }, 1500);

    // for meta.js, tests and the console
    window.Bonus = { refresh, onMenuOpen, onGameOver, openWheel, openGift, wheelState, giftToday, pickSlice, wheelSlices, gifts,
        get spinning() { return spinning; }, AD_SPINS };
    refresh();
    if (Meta.menuOpen) onMenuOpen();
})();
