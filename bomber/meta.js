// --- ZOMBIE BOMBER: THE META GAME ---
// What goes on around the levels and gives players reasons to come back: gems (the second currency),
// a daily reward, 3 missions a day, a lucky wheel, coins the soldiers collect while you're away,
// achievements, the boosters (Air Strike, Freeze) and the store.
//
// Loaded before bomber.js, which calls in here (Meta.ev, Meta.drawPanel, ...). Everything in here that
// draws or touches the game uses bomber.js's own helpers and state (they share the page), so it only
// runs once bomber.js has loaded. Things open up one by one in the first few levels (UNLOCK), so a new
// player isn't shown everything at once.
//
// Nothing random is ever sold: wheel spins and crates are free or for a rewarded ad, never for gems or
// money, and every slice of the wheel is as likely as the next.

const Meta = (() => {
    // ---------- TIME ----------
    const now = () => Date.now();
    const dayOf = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const today = () => dayOf(now());
    const toMidnight = () => { const d = new Date(now()); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - d.getTime(); };
    const span = ms => {
        const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60);
        return h > 0 ? `${h}H ${String(m % 60).padStart(2, '0')}M` : m > 0 ? `${m}M` : `${Math.max(1, Math.ceil(ms / 1000))}S`;
    };

    // ---------- ECONOMY ----------
    // Rewards are counted in "levels' worth of coins", so they stay worth having at any level.
    const unit = lv => Math.round((50 + 12 * lv + 0.12 * lv * lv) / 5) * 5;
    const coinsOf = (k, lv = save.level) => Math.max(5, Math.round(unit(lv) * k / 5) * 5);
    // the level at which each thing opens up
    const UNLOCK = { crate: 2, booster: 3, daily: 3, store: 3, missions: 4, offline: 4, wheel: 5, awards: 6 };
    const has = k => save.level >= UNLOCK[k];
    const gemsShown = () => has('store') || (save.gems || 0) > 0;

    const AD_SPINS = 5;                 // extra wheel spins a day, each for a rewarded ad
    const OFFLINE_CAP_H = 8;            // the soldiers collect for this many hours at most
    const BOOSTER_ADS = 2;              // free boosters for an ad, per level
    const BOOSTER_COOLDOWN = 8;         // seconds before the same booster can be used again
    const PRICES = { air1: 15, air5: 60, freeze1: 10, freeze5: 40, coins1: 25, coins2: 70 };   // in gems
    const GEM_PACKS = { gems_1: 80, gems_2: 500, gems_3: 1200, gems_4: 3000 };                  // Google Play products
    const starterPack = () => ({ gems: 300, air: 5, freeze: 5, coins: coinsOf(5) });   // about twice what the same money buys in gem packs

    // ---------- SAVE ----------
    function init() {
        const def = (k, v) => { if (save[k] === undefined || save[k] === null) save[k] = v; };
        def('gems', 0); def('streak', 0); def('starter', false); def('seen', now()); def('kingLv', 0); def('zoneLv', 0);
        save.gems = Math.max(0, Math.floor(save.gems) || 0);
        save.boost = { air: 1, freeze: 1, ...(save.boost || {}) };
        save.stats = { kills: 0, kings: 0, merges: 0, thrown: 0, multi: 0, clears: 0, perfect: 0, coins: 0, days: 0, streak: 0, air: 0, crates: 0, spins: 0, ...(save.stats || {}) };
        save.ach = save.ach || {};
        save.login = { last: '', n: 0, ...(save.login || {}) };
        save.daily = save.daily || {};
        save.flags = save.flags || {};
        save.tokens = save.tokens || [];
        if (save.level > 1 && !save.stats.clears) save.stats.clears = save.level - 1;   // players from before this existed
        newDay();
        collectAway();
        if (dailyReady()) { autoDaily = today(); queue.push({ id: 'daily' }); }
        Ads.gameReady();
    }

    // ---------- DAILY: MISSIONS, SPINS ----------
    const round5 = v => Math.round(v / 5) * 5;
    // ev: the game event that counts towards it. need: what must be unlocked for it to be picked.
    const MISSIONS = {
        kills:  { ev: 'kill',    text: m => `BLOW UP ${m.target} ZOMBIES`,            target: lv => clamp(round5(25 + lv * 4), 30, 400) },
        clears: { ev: 'clear',   text: m => `CLEAR ${m.target} LEVELS`,               target: () => 3 },
        merges: { ev: 'merge',   text: m => `MERGE BOMBS ${m.target} TIMES`,          target: lv => clamp(round5(20 + lv), 25, 80) },
        throws: { ev: 'throw',   text: m => `THROW ${m.target} BOMBS`,                target: lv => clamp(round5(12 + lv * 0.6), 15, 50) },
        multi:  { ev: 'multi3',  text: m => `GET ${m.target} TRIPLE KILLS OR BETTER`, target: () => 4 },
        stars:  { ev: 'perfect', text: m => `CLEAR ${m.target} LEVELS WITH 3 STARS`,  target: () => 2 },
        big:    { ev: 'big',     text: m => `MAKE ${m.target} ${BOMBS[m.tier].name.toUpperCase()}S`, target: () => 2 },
        coins:  { ev: 'coins',   text: m => `COLLECT ${fmt(m.target)} COINS`,         target: lv => Math.round(unit(lv) * 3 / 50) * 50 },
        crate:  { ev: 'crate',   text: m => `OPEN ${m.target} SUPPLY CRATES`,         target: () => 2 },
        boost:  { ev: 'booster', text: () => 'USE AN AIR STRIKE OR A FREEZE',         target: () => 1, ok: () => save.boost.air + save.boost.freeze > 0 },
        spin:   { ev: 'spin',    text: () => 'SPIN THE LUCKY WHEEL',                  target: () => 1, ok: () => has('wheel') }
    };

    // a new day: 3 new missions (the same 3 all day, whatever happens), the wheel's spins back
    function newDay() {
        const d = today();
        if (save.daily.date === d) return;
        const lv = save.level;
        let h = 0;
        for (const ch of d) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
        const rnd = seeded(h + 7);
        const ids = Object.keys(MISSIONS).filter(id => !MISSIONS[id].ok || MISSIONS[id].ok());
        const m = [];
        while (m.length < 3 && ids.length) {
            const id = ids.splice(Math.floor(rnd() * ids.length), 1)[0];
            m.push({ id, target: MISSIONS[id].target(lv), n: 0, got: false, coins: coinsOf(0.5, lv), gems: 1, tier: Math.min(BOMBS.length - 1, stats().dropMin + 4) });
        }
        save.daily = { date: d, m, chest: false, chestCoins: coinsOf(2, lv), spun: false, adSpins: 0 };
        writeSave();
    }

    function progress(evName, n) {
        if (!has('missions') || !save.daily.m) return;
        for (const m of save.daily.m) {
            if (MISSIONS[m.id].ev !== evName || m.n >= m.target) continue;
            m.n = Math.min(m.target, m.n + n);
            if (m.n >= m.target) { toast('MISSION DONE: ' + MISSIONS[m.id].text(m), '#7bed9f'); Sound.star(1); writeSave(); }
        }
    }

    // what the game tells us about: kills, merges, throws, coins...
    function ev(name, n = 1) {
        const st = save.stats;
        switch (name) {
            case 'kill': st.kills += n; break;
            case 'king': st.kings += n; break;
            case 'merge': st.merges += n; break;
            case 'throw': st.thrown += n; break;
            case 'coins': st.coins += n; break;
            case 'multi': st.multi = Math.max(st.multi, n); if (n >= 3) progress('multi3', 1); return;
            case 'tier': if (has('missions')) for (const m of save.daily.m || []) if (m.id === 'big' && m.tier === n) progress('big', 1); return;
            case 'lose': writeSave(); return;
        }
        progress(name, n);
    }

    function levelStart() {
        adBoosters = 0; cd.air = cd.freeze = 0;
        if (has('booster') && !save.flags.boosterHint) { save.flags.boosterHint = 1; hintT = 12; toast('NEW! TAP THE PLANE BUTTON FOR AN AIR STRIKE', '#ffd32a', 5); }
    }

    function levelCleared(lv, starCount) {
        const st = save.stats;
        st.clears++; progress('clear', 1);
        if (starCount === 3) { st.perfect++; progress('perfect', 1); }
        st.streak = Math.max(st.streak, save.streak || 0);
        // gems for beating a Zombie King's level for the first time, and for finishing a zone
        let g = 0;
        if (lv % 5 === 0 && lv > save.kingLv) { save.kingLv = lv; g += 3; }
        if (lv % ZONE_LEVELS === 0 && lv > save.zoneLv) { save.zoneLv = lv; g += 10; toast('ZONE CLEARED! +10 GEMS', '#8fe9ff', 3.5); }
        if (g && gemsShown()) flyGems(W / 2, L.battleTop + 150, g); else if (g) save.gems += g;
    }

    function enterShop() {
        newDay();
        if (dailyReady() && autoDaily !== today()) { autoDaily = today(); queue.push({ id: 'daily' }); }
        if (Ads.storeEnabled() && has('store') && !save.starter && save.level >= 7 && !save.flags.starter) { save.flags.starter = 1; queue.push({ id: 'starter' }); }
        const fresh = Object.keys(HUB).filter(k => has(k) && !save.flags['u_' + k]);
        fresh.forEach(k => { save.flags['u_' + k] = 1; });
        if (fresh.length === 1) toast('NEW: ' + HUB[fresh[0]].name + '!', '#ffd32a', 3.5);
        else if (fresh.length > 1) toast('NEW THINGS TO DO! SEE THE BUTTONS UP TOP', '#ffd32a', 4);
        queueT = 0.5;
    }

    // ---------- COINS WHILE AWAY ----------
    // The soldiers collect coins while the game is closed, for up to 8 hours.
    const awayCoins = hours => round5(unit(save.level) * 0.3 * Math.min(OFFLINE_CAP_H, hours) * (1 + 0.08 * (save.up.soldiers - 1)));
    function collectAway() {
        const away = now() - (save.seen || now());
        save.seen = now();
        if (has('offline') && away >= 5 * 60000) {
            const coins = awayCoins(away / 3600000);
            if (coins >= 5) save.away = { coins: (save.away ? save.away.coins : 0) + coins, ms: (save.away ? save.away.ms : 0) + away };
        }
        if (save.away && !queue.some(q => q.id === 'away') && !(P && P.id === 'away')) queue.unshift({ id: 'away' });
        writeSave();
    }
    function leaving() { save.seen = now(); writeSave(); reminders(); }
    function returning() {
        collectAway();   // in the middle of a level too: the "welcome back" panel waits for the shop
        if (state === 'title' || state === 'shop' || state === 'won') { newDay(); if (dailyReady() && autoDaily !== today()) { autoDaily = today(); queue.push({ id: 'daily' }); } queueT = 0.4; }
    }

    // ---------- REMINDERS (the app) ----------
    // What the app's two "come back" notifications will say. The app shows them on a later day than the
    // one the game was left on, so by then all of this is true: the next daily reward is ready, the
    // soldiers have collected their 8 hours of coins, and the wheel has its free spin back.
    const num = n => Math.floor(n).toLocaleString('en-US');
    const list = a => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
    const words = r => list([r.coins && `${num(r.coins)} coins`, r.gems && `${r.gems} gems`, r.air && (r.air > 1 ? `${r.air} Air Strikes` : 'an Air Strike'), r.freeze && (r.freeze > 1 ? `${r.freeze} Freezes` : 'a Freeze')].filter(Boolean));
    function reminderTexts() {
        const day = save.login.n % 7, reward = words(DAILY[day](save.level));
        const coins = has('offline') ? awayCoins(OFFLINE_CAP_H) + (save.away ? save.away.coins : 0) : 0;
        const more = [coins >= 5 && `your soldiers have collected ${num(coins)} coins`, has('wheel') && "there's a free spin of the wheel"].filter(Boolean);
        const waiting = ['your daily reward', coins >= 5 && `${num(coins)} coins from your soldiers`, has('wheel') && 'a free spin'].filter(Boolean);
        const sentence = str => str.charAt(0).toUpperCase() + str.slice(1) + '.';
        return {
            daily: ['Your daily reward is ready', `Day ${day + 1}: ${reward}.` + (more.length ? ' ' + sentence(list(more)) : '')],
            back: ['The horde is back', 'Your base needs you. ' + sentence(`${list(waiting)} ${waiting.length > 1 ? 'are' : 'is'} waiting`)]
        };
    }
    function reminders() {
        if (!has('daily')) return;
        const t = reminderTexts();
        Ads.reminderText('daily', t.daily[0], t.daily[1]);
        Ads.reminderText('back', t.back[0], t.back[1]);
    }

    // ---------- REWARDS ----------
    // A reward is { coins, gems, air, freeze }. Coins and gems fly to their counters from (x, y).
    function give(r, x, y, mul = 1) {
        if (r.coins) flyCoins(x, y, r.coins * mul, 0);
        if (r.gems) flyGems(x, y, r.gems * mul);
        if (r.air) save.boost.air += r.air * mul;
        if (r.freeze) save.boost.freeze += r.freeze * mul;
        writeSave();
    }
    const label = (r, mul = 1) => [r.coins && `+${fmt(r.coins * mul)} COINS`, r.gems && `+${r.gems * mul} GEMS`, r.air && `+${r.air * mul} AIR STRIKE`, r.freeze && `+${r.freeze * mul} FREEZE`].filter(Boolean).join(' · ');

    function spend(n) {
        if ((save.gems || 0) < n) {
            say(W / 2, H / 2, 'NOT ENOUGH GEMS', '#ff6b81', 24);
            Sound.error();
            // where gems are sold (the app), show them: that's what the player is after
            if (Ads.storeEnabled()) { if (P && P.id === 'store') P.tab = 1; else openPanel({ id: 'store', tab: 1 }); }
            return false;
        }
        save.gems -= n;
        writeSave();
        return true;
    }

    function crateOpened(x, y, golden) {
        const k = Math.random();
        const r = golden ? { coins: coinsOf(1.5, level), gems: 3, air: 1 }
            : k < 0.6 ? { coins: coinsOf(0.4, level) } : k < 0.8 ? { freeze: 1 } : k < 0.92 ? { air: 1 } : { gems: 2 };
        give(r, x, y);
        floatText(clamp(x, 110, W - 110), y - 26, label(r), golden ? '#ffd32a' : '#fff', golden ? 20 : 17, 1.6);
        Sound.buy();
        save.stats.crates++;
        progress('crate', 1);
    }

    // a purchase from Google Play has gone through
    function purchased(id) {
        if (GEM_PACKS[id]) give({ gems: GEM_PACKS[id] }, W / 2, H / 2);
        else if (id === 'starter_pack') { save.starter = true; give(starterPack(), W / 2, H / 2); if (P && P.id === 'starter') close(); }
        else return;
        say(W / 2, H / 2 - 50, 'THANK YOU!', '#7bed9f', 32, 2);
        Sound.win(); Haptics.buzz(60, true);
        writeSave();
    }

    // ---------- DAILY REWARD ----------
    // 7 days that grow, then round again. Missing a day doesn't lose your place.
    const DAILY = [
        lv => ({ coins: coinsOf(1, lv) }),
        () => ({ air: 1 }),
        lv => ({ coins: coinsOf(2, lv) }),
        () => ({ gems: 5 }),
        lv => ({ coins: coinsOf(3, lv), freeze: 1 }),
        () => ({ gems: 10 }),
        lv => ({ coins: coinsOf(6, lv), gems: 20, air: 2 })
    ];
    const dailyReady = () => has('daily') && save.login.last !== today();
    function claimDaily(mul, x, y) {
        if (!dailyReady()) return;
        const r = DAILY[save.login.n % 7](save.level);
        save.login.last = today(); save.login.n++; save.stats.days++;
        give(r, x, y, mul);
        say(W / 2, y - 40, label(r, mul), '#ffd32a', 18, 2);
        Sound.buy(); Haptics.buzz(30);
        reminders();
        Ads.askReminders();   // "want a reminder when the next one is ready?" (the app asks once)
    }

    // ---------- ACHIEVEMENTS ----------
    const ACH = [
        { id: 'slayer', name: 'ZOMBIE SLAYER', text: n => `BLOW UP ${fmt(n)} ZOMBIES`, stat: s => s.kills, tiers: [100, 500, 2500, 10000, 50000], gems: [5, 8, 12, 20, 40] },
        { id: 'multi', name: 'CROWD PLEASER', text: n => `BLOW UP ${n} ZOMBIES WITH ONE BOMB`, stat: s => s.multi, tiers: [5, 8, 12, 16, 20], gems: [5, 8, 10, 15, 25] },
        { id: 'levels', name: 'SURVIVOR', text: n => `CLEAR LEVEL ${n}`, stat: () => (save.won ? 300 : save.level - 1), tiers: [10, 25, 50, 100, 200, 300], gems: [5, 10, 15, 25, 40, 100] },
        { id: 'arsenal', name: 'ARSENAL', text: n => `DISCOVER ${n} KINDS OF BOMB`, stat: () => save.bestTier + 1, tiers: [5, 8, 10, 12], gems: [5, 10, 15, 30] },
        { id: 'merger', name: 'MASTER MERGER', text: n => `MERGE BOMBS ${fmt(n)} TIMES`, stat: s => s.merges, tiers: [100, 600, 3000, 12000], gems: [5, 8, 12, 25] },
        { id: 'bomber', name: 'BOMBARDIER', text: n => `THROW ${fmt(n)} BOMBS`, stat: s => s.thrown, tiers: [50, 300, 1500, 6000], gems: [5, 8, 12, 25] },
        { id: 'kings', name: 'KING SLAYER', text: n => `TAKE DOWN ${n} ZOMBIE KING${n > 1 ? 'S' : ''}`, stat: s => s.kings, tiers: [1, 5, 20, 60], gems: [5, 10, 20, 40] },
        { id: 'perfect', name: 'UNTOUCHABLE', text: n => `CLEAR ${n} LEVELS WITH 3 STARS`, stat: s => s.perfect, tiers: [10, 40, 120, 250], gems: [5, 10, 20, 40] },
        { id: 'streak', name: 'ON FIRE', text: n => `WIN ${n} LEVELS IN A ROW`, stat: s => s.streak, tiers: [5, 10, 20, 40], gems: [5, 10, 20, 40] },
        { id: 'rich', name: 'WAR CHEST', text: n => `COLLECT ${fmt(n)} COINS IN ALL`, stat: s => s.coins, tiers: [2000, 20000, 150000, 1000000], gems: [5, 10, 20, 40] },
        { id: 'days', name: 'REGULAR', text: n => `COLLECT ${n} DAILY REWARDS`, stat: s => s.days, tiers: [3, 7, 14, 30], gems: [5, 10, 20, 40] },
        { id: 'air', name: 'AIR SUPPORT', text: n => `CALL ${n} AIR STRIKES`, stat: s => s.air, tiers: [3, 15, 50], gems: [5, 10, 25] }
    ];
    const achTier = a => save.ach[a.id] || 0;                                   // how many of its steps are claimed
    const achDone = a => achTier(a) >= a.tiers.length;
    const achReady = a => !achDone(a) && a.stat(save.stats) >= a.tiers[achTier(a)];

    // ---------- THE WHEEL ----------
    // 8 slices, each as likely as the next. One free spin a day, then up to 5 more for a rewarded ad each.
    const WHEEL = [
        lv => ({ coins: coinsOf(0.5, lv) }), () => ({ gems: 2 }), lv => ({ coins: coinsOf(1, lv) }), () => ({ air: 1 }),
        lv => ({ coins: coinsOf(2, lv) }), () => ({ gems: 5 }), () => ({ freeze: 1 }), lv => ({ coins: coinsOf(4, lv) })
    ];
    const WHEEL_COLORS = ['#ff9f1a', '#3a7bd5', '#ff6b35', '#8e44ad', '#f9ca24', '#1e90ff', '#16a085', '#e84118'];
    const SLICE = Math.PI * 2 / WHEEL.length;
    const freeSpin = () => has('wheel') && !save.daily.spun;
    const adSpinsLeft = () => AD_SPINS - (save.daily.adSpins || 0);

    function spin() {
        const p = P;
        p.result = Math.floor(Math.random() * WHEEL.length);
        const land = -Math.PI / 2 - p.result * SLICE + (Math.random() - 0.5) * SLICE * 0.7;   // that slice under the pointer
        const turns = Math.ceil((p.rot - land) / (Math.PI * 2)) + 5;
        p.spin = { from: p.rot, to: land + turns * Math.PI * 2, t: 0, dur: 4.2 };
        p.won = null; p.lock = true;
        save.stats.spins++;
        progress('spin', 1);
        writeSave();
    }
    function updateWheel(rdt) {
        const p = P, s = p.spin;
        if (!s) return;
        s.t += rdt;
        const before = p.rot;
        p.rot = lerp(s.from, s.to, easeOut(s.t / s.dur));
        if (Math.floor(p.rot / SLICE) !== Math.floor(before / SLICE)) { Sound.tick(); Haptics.buzz(4); }
        if (s.t >= s.dur) {
            p.spin = null; p.lock = false;
            p.won = WHEEL[p.result](save.level); p.wonT = 0;
            give(p.won, W / 2, p.cy || H / 2);
            Sound.buy(); Haptics.buzz(40, true);
            for (let i = 0; i < 30; i++) { const a = rand(0, Math.PI * 2), sp = rand(120, 380); topParts.push({ kind: 'sparkle', x: W / 2, y: p.cy || H / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, drag: 3, life: rand(0.5, 1), t: 0, size: rand(3, 6), color: pick(['#ffd32a', '#fff', '#ff9f43', '#8fe9ff']) }); }
        }
    }

    // ---------- BOOSTERS ----------
    const BOOST = {
        air: { name: 'AIR STRIKE', desc: 'THE PLANE BOMBS THE WHOLE ROAD', price: PRICES.air1, color: '#ff9f43', use: () => callAirStrike() },
        freeze: { name: 'FREEZE', desc: 'EVERY ZOMBIE STANDS STILL FOR 6 SECONDS', price: PRICES.freeze1, color: '#8fe9ff', use: () => startFreeze() }
    };
    const cd = { air: 0, freeze: 0 };
    let adBoosters = 0, hintT = 0;
    const boosterSpot = i => ({ x: W - 32, y: L.battleTop + 38 + i * 56, r: 23 });

    function useBooster(k) {
        if (state !== 'play' || cd[k] > 0) return;
        if (save.boost[k] <= 0) { openPanel({ id: 'get', kind: k }); return; }
        if (!BOOST[k].use()) return;
        save.boost[k]--; cd[k] = BOOSTER_COOLDOWN; hintT = 0;
        if (k === 'air') save.stats.air++;
        progress('booster', 1);
        writeSave();
    }

    // ---------- PANELS ----------
    let P = null;            // the open panel: { id, t, ... }
    const queue = [];        // panels waiting their turn (coins while away, the daily reward, ...)
    let queueT = 0.8, autoDaily = '', stamp = 0, dayCheck = 0;
    let hits = [];           // what can be tapped this frame: { x, y, w, h, fn }
    const says = [], toasts = [];

    function openPanel(p) {
        P = { t: 0, rot: 0, page: 0, tab: 0, ...p };
        if (p.id && save.flags['o_' + p.id] !== 1 && HUB[p.id]) { save.flags['o_' + p.id] = 1; writeSave(); }
        if (P.id === 'awards') P.order = ACH.slice().sort((a, b) => (achReady(b) - achReady(a)) || (achDone(a) - achDone(b)));
        Sound.click();
    }
    function close() { P = null; hits = []; queueT = 0.35; }
    const modal = () => !!P;
    const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });
    const say = (x, y, str, color, size, life = 1.4) => says.push({ x, y, str, color, size, t: 0, life });
    const toast = (str, color = '#fff', life = 2.8) => { if (toasts.length < 4) toasts.push({ str, color, t: 0, life }); };

    function click(p) {
        if (P && P.t < 0.18) return true;
        for (let i = hits.length - 1; i >= 0; i--) {
            const h = hits[i];
            if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) { h.fn(); return true; }
        }
        return !!P;
    }

    function update(rdt) {
        if (P) { P.t += rdt; if (P.id === 'wheel') updateWheel(rdt); if (P.wonT !== undefined) P.wonT += rdt; }
        for (const s of says) s.t += rdt;
        for (let i = says.length - 1; i >= 0; i--) if (says[i].t >= says[i].life) says.splice(i, 1);
        if (toasts.length) { toasts[0].t += rdt; if (toasts[0].t >= toasts[0].life) toasts.shift(); }
        if (!P && state === 'play') { cd.air = Math.max(0, cd.air - rdt); cd.freeze = Math.max(0, cd.freeze - rdt); hintT = Math.max(0, hintT - rdt); }
        // one waiting panel at a time, on the title screen or between levels
        if (!P && queue.length && (state === 'title' || state === 'shop')) { queueT -= rdt; if (queueT <= 0) openPanel(queue.shift()); }
        if ((dayCheck += rdt) > 2) { dayCheck = 0; if (state !== 'play') newDay(); }
        if ((stamp += rdt) > 15) { stamp = 0; save.seen = now(); }
    }

    // ---------- DRAWING: BITS ----------
    function snowflake(x, y, r, color = '#8fe9ff') {
        ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, r * 0.2);
        for (let i = 0; i < 3; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
            for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.55, 0); ctx.lineTo(s * r * 0.85, -r * 0.3); ctx.moveTo(s * r * 0.55, 0); ctx.lineTo(s * r * 0.85, r * 0.3); }
            ctx.stroke();
        }
        ctx.restore();
    }
    function planeIcon(x, y, w) {
        if (imgReady(planeImg)) { const h = w * planeImg.naturalHeight / planeImg.naturalWidth; ctx.drawImage(planeImg, x - w / 2, y - h / 2, w, h); }
        else { ctx.fillStyle = '#e84118'; ellipse(x, y, w / 2, w / 6); ctx.fill(); ctx.fillStyle = '#ff7675'; ellipse(x - w * 0.05, y + w * 0.06, w * 0.28, w * 0.08); ctx.fill(); }
    }
    function icon(kind, x, y, s) {
        if (kind === 'coins') drawCoin(x, y, s);
        else if (kind === 'gems') drawGem(x, y, s);
        else if (kind === 'air') planeIcon(x, y, s * 2.5);
        else snowflake(x, y, s);
    }
    const parts = (r, mul = 1) => ['coins', 'gems', 'air', 'freeze'].filter(k => r[k]).map(k => ({ k, str: (k === 'coins' ? fmt(r[k] * mul) : k === 'gems' ? `${r[k] * mul}` : `x${r[k] * mul}`) }));
    // a reward on one line, centred on (cx, cy)
    function rewardRow(r, cx, cy, size = 16, mul = 1, align = 'center') {
        const ps = parts(r, mul), gap = size * 0.9, iw = size * 1.5;
        const widths = ps.map(p => iw + textWidth(p.str, size) + 3);
        const total = widths.reduce((a, b) => a + b, 0) + gap * (ps.length - 1);
        let x = align === 'left' ? cx : cx - total / 2;
        ps.forEach((p, i) => {
            icon(p.k, x + iw / 2 - 2, cy, size * (p.k === 'air' ? 0.6 : 0.62));
            text(p.str, x + iw, cy + 1, size, p.k === 'coins' ? '#ffd32a' : p.k === 'gems' ? '#8fe9ff' : '#fff', 'left');
            x += widths[i] + gap;
        });
        return total;
    }
    // a reward stacked in a tile
    function rewardStack(r, cx, cy, size = 15) {
        const ps = parts(r), step = size * 1.75, y0 = cy - (ps.length - 1) * step / 2;
        ps.forEach((p, i) => {
            const w = size * 1.4 + textWidth(p.str, size), x = cx - w / 2;
            icon(p.k, x + size * 0.6, y0 + i * step, size * (p.k === 'air' ? 0.6 : 0.66));
            text(p.str, x + size * 1.4, y0 + i * step + 1, size, p.k === 'coins' ? '#ffd32a' : p.k === 'gems' ? '#8fe9ff' : '#fff', 'left');
        });
    }

    const COLORS = { green: ['#5ee87a', '#1f9e46'], gold: ['#ffcf3f', '#ff9500'], blue: ['#5cc8ff', '#1b6fe0'], purple: ['#a98bff', '#5b3fc4'], grey: ['#7d7896', '#4a4660'], pink: ['#ff6fb5', '#c2185b'] };
    // a button that can be tapped; ad: it plays a rewarded ad (the ▶ AD mark); gems: a price in gems
    function btn(x, y, w, h, str, kind, fn, o = {}) {
        const c = COLORS[o.off ? 'grey' : kind], size = o.size || Math.min(22, h * 0.42);
        const pulse = o.pulse && !o.off ? 1 + Math.sin(time * 5) * 0.025 : 1;
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse); ctx.translate(-x - w / 2, -y - h / 2);
        button(x, y, w, h, c[0], c[1], null, size, o.off ? 0.6 : 1);
        if (o.off) ctx.globalAlpha = 0.6;
        let cx = x + w / 2;
        if (o.ad) cx -= size * 1.05;
        if (o.gems !== undefined) {
            const gw = size * 1.2 + textWidth(`${o.gems}`, size), tw = str ? textWidth(str, size) + size * 0.6 : 0, x0 = x + w / 2 - (tw + gw) / 2;
            if (str) text(str, x0, y + h / 2 + 2, size, '#fff', 'left');
            drawGem(x0 + tw + size * 0.5, y + h / 2, size * 0.5);
            text(`${o.gems}`, x0 + tw + size * 1.2, y + h / 2 + 2, size, '#fff', 'left');
        } else text(str, cx, y + h / 2 + 2, size, '#fff');
        if (o.ad) adBadge(x + w - size * 2.5, y + h / 2 + 1, size * 0.95);
        ctx.restore();
        if (!o.off && fn) hit(x, y, w, h, fn);
    }

    function panelBox(w, h, title, color = '#ffd32a') {
        hits = [];
        const x = (W - w) / 2, y = clamp((H - h) / 2 + 8, HUD_H + 4, H - h - 6);
        ctx.fillStyle = `rgba(8, 4, 16, ${0.74 * Math.min(1, P.t * 6)})`; ctx.fillRect(0, 0, W, H);
        hit(0, 0, W, H, () => {});
        const k = 0.9 + 0.1 * easeOutBack(Math.min(1, P.t / 0.22));
        ctx.save(); ctx.translate(W / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-W / 2, -(y + h / 2));
        ctx.globalAlpha = Math.min(1, P.t * 8);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; rrect(x, y + 7, w, h, 22); ctx.fill();
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#3b2b6b'); g.addColorStop(1, '#1d1436');
        ctx.fillStyle = g; rrect(x, y, w, h, 22); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 3; rrect(x, y, w, h, 22); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 16, y + 54, w - 32, 2);
        text(title, W / 2, y + 30, title.length > 16 ? 22 : 26, color);
        if (!P.must) {   // the ✕
            const cx = x + w - 28, cy = y + 28;
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; circle(cx, cy, 15); ctx.fill();
            ctx.strokeStyle = '#d6ccff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5); ctx.stroke();
            hit(cx - 22, cy - 22, 44, 44, () => { if (!P.lock) { Sound.click(); close(); } });
        }
        return { x, y, w, h };
    }
    const panelEnd = () => ctx.restore();
    function bar(x, y, w, h, frac, c0 = '#7bed9f', c1 = '#2ecc71') {
        ctx.fillStyle = '#120b22'; rrect(x - 2, y - 2, w + 4, h + 4, (h + 4) / 2); ctx.fill();
        if (frac > 0) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; rrect(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill(); }
    }
    function card(x, y, w, h, glowing) {
        ctx.fillStyle = 'rgba(10, 6, 22, 0.55)'; rrect(x, y, w, h, 14); ctx.fill();
        ctx.strokeStyle = glowing ? `rgba(255, 211, 42, ${0.6 + 0.35 * Math.sin(time * 5)})` : 'rgba(255,255,255,0.1)'; ctx.lineWidth = glowing ? 2.5 : 1.5; rrect(x, y, w, h, 14); ctx.stroke();
    }
    function tick(x, y, r) {
        ctx.fillStyle = '#2ecc71'; circle(x, y, r); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.35); ctx.stroke();
    }

    // ---------- DRAWING: THE PANELS ----------
    function drawDaily() {
        const b = panelBox(410, 446, 'DAILY REWARD'), ready = dailyReady(), cur = save.login.n % 7;
        text('A NEW REWARD EVERY DAY YOU PLAY · DAY 7 IS THE BIG ONE', W / 2, b.y + 70, 11, '#b9b2e6', 'center', '#120d22', 3);
        let todayAt = { x: W / 2, y: b.y + 200 };
        for (let i = 0; i < 7; i++) {
            const big = i === 6, row = i < 4 ? 0 : 1, col = row ? i - 4 : i;
            const tx = b.x + 17 + col * 96, ty = b.y + 88 + row * 114, tw = big ? 184 : 88, th = 106;
            const done = i < cur, isNow = i === cur && ready;
            ctx.fillStyle = done ? 'rgba(46, 204, 113, 0.18)' : isNow ? 'rgba(255, 211, 42, 0.2)' : 'rgba(10, 6, 22, 0.55)'; rrect(tx, ty, tw, th, 12); ctx.fill();
            ctx.strokeStyle = isNow ? `rgba(255, 211, 42, ${0.65 + 0.35 * Math.sin(time * 5)})` : done ? 'rgba(46, 204, 113, 0.6)' : big ? 'rgba(255, 159, 67, 0.7)' : 'rgba(255,255,255,0.12)';
            ctx.lineWidth = isNow ? 3 : 1.5; rrect(tx, ty, tw, th, 12); ctx.stroke();
            text(big ? 'DAY 7 · JACKPOT' : `DAY ${i + 1}`, tx + tw / 2, ty + 15, 11, isNow ? '#ffd32a' : big ? '#ff9f43' : '#b9b2e6', 'center', '#120d22', 3);
            ctx.save(); if (done) ctx.globalAlpha *= 0.4;
            if (big) rewardRow(DAILY[i](save.level), tx + tw / 2, ty + 60, 15); else rewardStack(DAILY[i](save.level), tx + tw / 2, ty + 60, 15);
            ctx.restore();
            if (done) tick(tx + tw - 16, ty + th - 16, 10);
            if (isNow) todayAt = { x: tx + tw / 2, y: ty + th / 2 };
            if (i === cur && !ready) text('TOMORROW', tx + tw / 2, ty + th - 12, 10, '#9fe8ff', 'center', '#120d22', 3);
        }
        const by = b.y + 326;
        if (ready) {
            const ad = Ads.rewardedReady('daily');
            if (ad) {
                btn(b.x + 20, by, 150, 54, 'CLAIM', 'green', () => claimDaily(1, todayAt.x, todayAt.y));
                btn(b.x + 182, by, 208, 54, 'CLAIM x2', 'gold', () => Ads.showRewarded('daily', w => claimDaily(w ? 2 : 1, todayAt.x, todayAt.y)), { ad: true, pulse: true });
            } else btn(b.x + 85, by, 240, 54, 'CLAIM', 'green', () => claimDaily(1, todayAt.x, todayAt.y), { pulse: true });
        } else {
            text('COME BACK TOMORROW!', W / 2, by + 16, 20, '#7bed9f');
            text(`NEXT REWARD IN ${span(toMidnight())}`, W / 2, by + 42, 13, '#b9b2e6', 'center', '#120d22', 3);
        }
        text(`${save.stats.days} COLLECTED SO FAR`, W / 2, b.y + b.h - 22, 11, '#8c85b0', 'center', null);
        panelEnd();
    }

    function drawMissions() {
        const b = panelBox(410, 470, 'DAILY MISSIONS', '#7bed9f'), ms = save.daily.m || [];
        ms.forEach((m, i) => {
            const y = b.y + 66 + i * 90, done = m.n >= m.target;
            card(b.x + 14, y, b.w - 28, 82, done && !m.got);
            if (m.got) tick(b.x + 40, y + 41, 14);
            else { ctx.fillStyle = done ? '#ffd32a' : '#4b3c80'; circle(b.x + 40, y + 41, 14); ctx.fill(); text(`${i + 1}`, b.x + 40, y + 43, 15, '#fff'); }
            const str = MISSIONS[m.id].text(m);
            text(str, b.x + 64, y + 20, str.length > 26 ? 12 : 14, m.got ? '#8c85b0' : '#fff', 'left');
            bar(b.x + 66, y + 36, 178, 12, m.n / m.target, done ? '#ffe066' : '#7bed9f', done ? '#f0a500' : '#2ecc71');
            text(`${fmt(m.n)} / ${fmt(m.target)}`, b.x + 155, y + 43, 10, '#fff', 'center', '#120d22', 2.5);
            rewardRow(m, b.x + 66, y + 66, 12, 1, 'left');
            if (m.got) text('DONE', b.x + b.w - 70, y + 42, 15, '#7bed9f');
            else btn(b.x + b.w - 122, y + 20, 98, 42, 'CLAIM', 'green', () => { m.got = true; give(m, b.x + b.w - 73, y + 41); Sound.buy(); Haptics.buzz(20); }, { off: !done, size: 16, pulse: true });
        });
        // the chest for doing all three
        const all = ms.length > 0 && ms.every(m => m.got), y = b.y + 66 + 3 * 90, chest = { coins: save.daily.chestCoins, gems: 4, air: 1 };
        card(b.x + 14, y, b.w - 28, 82, all && !save.daily.chest);
        if (!drawUi('icon_gift', b.x + 44, y + 41, 40, 40)) text('?', b.x + 44, y + 43, 24, '#ffd32a');
        text('ALL 3 DONE: BONUS CHEST', b.x + 72, y + 22, 14, '#ffd32a', 'left');
        rewardRow(chest, b.x + 72, y + 52, 13, 1, 'left');
        if (save.daily.chest) text('DONE', b.x + b.w - 70, y + 42, 15, '#7bed9f');
        else btn(b.x + b.w - 122, y + 20, 98, 42, 'OPEN', 'gold', () => { save.daily.chest = true; give(chest, b.x + b.w - 73, y + 41); say(W / 2, y - 6, label(chest), '#ffd32a', 17, 2); Sound.win(); Haptics.buzz(40, true); }, { off: !all, size: 16, pulse: true });
        text(`NEW MISSIONS IN ${span(toMidnight())}`, W / 2, b.y + b.h - 22, 12, '#b9b2e6', 'center', '#120d22', 3);
        panelEnd();
    }

    function drawWheel() {
        const b = panelBox(410, 540, 'LUCKY WHEEL', '#ff9f43'), cx = W / 2, cy = b.y + 232, R = 146, p = P;
        p.cy = cy;
        // the wheel
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; circle(cx, cy + 6, R + 10); ctx.fill();
        ctx.fillStyle = '#2a1840'; circle(cx, cy, R + 10); ctx.fill();
        ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 4; circle(cx, cy, R + 8); ctx.stroke();
        for (let i = 0; i < WHEEL.length; i++) {
            const a0 = p.rot + (i - 0.5) * SLICE;
            ctx.fillStyle = WHEEL_COLORS[i];
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + SLICE); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(26, 16, 38, 0.6)'; ctx.lineWidth = 2; ctx.stroke();
        }
        for (let i = 0; i < 16; i++) { const a = p.rot + i * Math.PI / 8; ctx.fillStyle = i % 2 ? '#fff6c0' : '#ffb142'; circle(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8), 3.2); ctx.fill(); }
        for (let i = 0; i < WHEEL.length; i++) {   // what each slice gives, kept upright
            const a = p.rot + i * SLICE, x = cx + Math.cos(a) * R * 0.66, y = cy + Math.sin(a) * R * 0.66, r = WHEEL[i](save.level), pt = parts(r)[0];
            icon(pt.k, x, y - 9, pt.k === 'air' ? 11 : 12);
            text(pt.str, x, y + 13, 14, '#fff');
        }
        ctx.fillStyle = '#1a1026'; circle(cx, cy, 24); ctx.fill();
        ctx.fillStyle = '#ffd32a'; circle(cx, cy, 19); ctx.fill();
        ctx.fillStyle = '#ff9500'; circle(cx, cy, 11); ctx.fill();
        // the pointer
        ctx.fillStyle = '#ff4757'; ctx.strokeStyle = '#1a1026'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 16, cy - R - 22); ctx.lineTo(cx + 16, cy - R - 22); ctx.lineTo(cx, cy - R + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
        // spinning, the prize, or the button
        const by = b.y + 404;
        if (p.spin) text('GOOD LUCK!', cx, by + 28, 24, '#ffd32a');
        else if (p.won && p.wonT < 1.6) { text('YOU WON', cx, by + 6, 15, '#fff'); rewardRow(p.won, cx, by + 36, 24); }
        else if (freeSpin()) btn(cx - 125, by, 250, 58, 'FREE SPIN!', 'green', () => { save.daily.spun = true; spin(); }, { pulse: true });
        else if (adSpinsLeft() > 0 && Ads.rewardedReady('wheel')) btn(cx - 125, by, 250, 58, 'SPIN AGAIN', 'gold', () => Ads.showRewarded('wheel', w => { if (w) { save.daily.adSpins = (save.daily.adSpins || 0) + 1; spin(); } }), { ad: true, pulse: true });
        else { text(adSpinsLeft() > 0 && Ads.enabled() ? 'NO AD READY RIGHT NOW' : 'COME BACK TOMORROW!', cx, by + 18, 20, '#7bed9f'); text(`FREE SPIN IN ${span(toMidnight())}`, cx, by + 44, 13, '#b9b2e6', 'center', '#120d22', 3); }
        const left = adSpinsLeft();
        text(freeSpin() ? 'ONE FREE SPIN EVERY DAY' : Ads.enabled() && left > 0 ? `${left} MORE SPIN${left > 1 ? 'S' : ''} TODAY` : 'ONE FREE SPIN EVERY DAY', cx, b.y + b.h - 44, 12, '#b9b2e6', 'center', '#120d22', 3);
        text('EVERY SLICE IS AS LIKELY AS THE NEXT', cx, b.y + b.h - 24, 10, '#8c85b0', 'center', null);
        panelEnd();
    }

    function drawAwards() {
        const b = panelBox(410, 548, 'ACHIEVEMENTS', '#ffd32a'), list = P.order || ACH, per = 4, pages = Math.ceil(list.length / per);
        P.page = clamp(P.page, 0, pages - 1);
        list.slice(P.page * per, P.page * per + per).forEach((a, i) => {
            const y = b.y + 64 + i * 104, t = achTier(a), done = achDone(a), ready = achReady(a);
            const goal = a.tiers[Math.min(t, a.tiers.length - 1)], have = a.stat(save.stats);
            card(b.x + 14, y, b.w - 28, 96, ready);
            if (!drawUi('icon_trophy', b.x + 42, y + 34, 36, 36)) text('★', b.x + 42, y + 36, 26, '#ffd32a');
            for (let s = 0; s < a.tiers.length; s++) { ctx.fillStyle = s < t ? '#ffd32a' : 'rgba(255,255,255,0.18)'; circle(b.x + 42 - (a.tiers.length - 1) * 4 + s * 8, y + 66, 2.6); ctx.fill(); }
            text(a.name, b.x + 70, y + 20, 15, '#ffd32a', 'left');
            const str = done ? 'ALL DONE!' : a.text(goal);
            text(str, b.x + 70, y + 41, str.length > 28 ? 11 : 12, '#fff', 'left', '#120d22', 3);
            bar(b.x + 72, y + 58, 170, 12, done ? 1 : have / goal, '#ffe066', '#f0a500');
            text(done ? 'COMPLETE' : `${fmt(Math.min(have, goal))} / ${fmt(goal)}`, b.x + 157, y + 65, 10, '#fff', 'center', '#120d22', 2.5);
            if (done) tick(b.x + b.w - 70, y + 48, 16);
            else btn(b.x + b.w - 126, y + 26, 102, 44, '', 'blue', () => { save.ach[a.id] = t + 1; give({ gems: a.gems[t] }, b.x + b.w - 75, y + 48); Sound.buy(); Haptics.buzz(20); }, { off: !ready, size: 17, gems: a.gems[t], pulse: true });
        });
        const py = b.y + b.h - 44;
        btn(b.x + 40, py, 60, 34, '◀', 'purple', () => { P.page--; Sound.click(); }, { off: P.page === 0, size: 16 });
        text(`${P.page + 1} / ${pages}`, W / 2, py + 18, 15, '#b9b2e6');
        btn(b.x + b.w - 100, py, 60, 34, '▶', 'purple', () => { P.page++; Sound.click(); }, { off: P.page >= pages - 1, size: 16 });
        panelEnd();
    }

    function drawStore() {
        const b = panelBox(414, 566, 'STORE', '#8fe9ff'), real = Ads.storeEnabled();
        if (!real) P.tab = 0;
        if (real) ['ITEMS', 'GEMS'].forEach((name, i) => {
            const x = b.x + 16 + i * 194, on = P.tab === i;
            ctx.fillStyle = on ? '#8fe9ff' : 'rgba(10, 6, 22, 0.55)'; rrect(x, b.y + 62, 188, 32, 16); ctx.fill();
            text(name, x + 94, b.y + 79, 15, on ? '#1a1026' : '#b9b2e6', 'center', on ? null : '#120d22');
            hit(x, b.y + 62, 188, 32, () => { P.tab = i; Sound.click(); });
        });
        const top = b.y + (real ? 104 : 66), cw = 188, gap = 10;
        const cell = (i, h) => ({ x: b.x + 14 + (i % 2) * (cw + gap), y: top + Math.floor(i / 2) * (h + gap), w: cw, h });
        if (P.tab === 0) {   // for gems: coins and boosters
            const items = [
                { r: { coins: coinsOf(3) }, cost: PRICES.coins1, name: 'BAG OF COINS' }, { r: { coins: coinsOf(10) }, cost: PRICES.coins2, name: 'CHEST OF COINS' },
                { r: { air: 1 }, cost: PRICES.air1, name: 'AIR STRIKE' }, { r: { air: 5 }, cost: PRICES.air5, name: '5 AIR STRIKES' },
                { r: { freeze: 1 }, cost: PRICES.freeze1, name: 'FREEZE' }, { r: { freeze: 5 }, cost: PRICES.freeze5, name: '5 FREEZES' }
            ];
            items.forEach((it, i) => {
                const c = cell(i, real ? 140 : 152), pt = parts(it.r)[0];
                card(c.x, c.y, c.w, c.h);
                icon(pt.k, c.x + c.w / 2, c.y + c.h * 0.27, pt.k === 'air' ? 20 : pt.k === 'freeze' ? 20 : 22);
                text(it.name, c.x + c.w / 2, c.y + c.h * 0.52, 14, '#fff');
                text(pt.k === 'coins' ? `${fmt(it.r.coins)} COINS` : pt.k === 'air' ? `YOU HAVE ${save.boost.air}` : `YOU HAVE ${save.boost.freeze}`, c.x + c.w / 2, c.y + c.h * 0.66, 11, pt.k === 'coins' ? '#ffd32a' : '#b9b2e6', 'center', '#120d22', 3);
                btn(c.x + 24, c.y + c.h - 42, c.w - 48, 34, '', 'blue', () => { if (spend(it.cost)) { give(it.r, c.x + c.w / 2, c.y + c.h * 0.3); Sound.buy(); Haptics.buzz(20); } }, { gems: it.cost, size: 16 });
            });
        } else {             // for money: the starter pack, gems, No Ads
            let y = top;
            if (!save.starter) {
                card(b.x + 14, y, b.w - 28, 112, true);
                text('STARTER PACK', b.x + 30, y + 22, 17, '#ffd32a', 'left');
                text('ONE TIME ONLY', b.x + b.w - 30, y + 22, 11, '#ff9f43', 'right', '#120d22', 3);
                rewardRow(starterPack(), b.x + 30, y + 54, 14, 1, 'left');
                btn(b.x + b.w - 150, y + 70, 124, 34, Ads.price('starter_pack') || 'BUY', 'green', () => Ads.buy('starter_pack'), { size: 16, pulse: true });
                text('THE BEST DEAL IN THE STORE', b.x + 30, y + 88, 11, '#7bed9f', 'left', '#120d22', 3);
                y += 122;
            }
            Object.keys(GEM_PACKS).forEach((id, i) => {
                const h = save.starter ? 132 : 104, c = { x: b.x + 14 + (i % 2) * (cw + gap), y: y + Math.floor(i / 2) * (h + gap), w: cw, h };
                card(c.x, c.y, c.w, c.h);
                for (let g = 0; g <= i; g++) drawGem(c.x + c.w / 2 + (g - i / 2) * 15, c.y + c.h * 0.26 + (g % 2) * 4, 11 + i);
                text(`${fmt(GEM_PACKS[id])} GEMS`, c.x + c.w / 2, c.y + c.h * 0.56, 15, '#8fe9ff');
                if (i === 3) text('BEST VALUE', c.x + c.w - 10, c.y + 13, 10, '#7bed9f', 'right', '#120d22', 3);
                btn(c.x + 28, c.y + c.h - 40, c.w - 56, 32, Ads.price(id) || 'BUY', 'green', () => Ads.buy(id), { size: 15 });
            });
            y += 2 * ((save.starter ? 132 : 104) + gap);
            if (Ads.enabled()) {
                card(b.x + 14, y, b.w - 28, 54);
                text('NO ADS', b.x + 30, y + 20, 16, '#ff9fd0', 'left');
                text('NO BANNER, NO ADS BETWEEN LEVELS', b.x + 30, y + 40, 10, '#b9b2e6', 'left', '#120d22', 3);
                if (Ads.adFree()) tick(b.x + b.w - 44, y + 27, 14);
                else btn(b.x + b.w - 150, y + 10, 124, 34, Ads.noAdsPrice() || 'BUY', 'pink', () => Ads.buyNoAds(), { size: 16 });
                y += 62;
            }
            text('GEMS ARE SAVED ON THIS DEVICE, WITH YOUR GAME', W / 2, y + 12, 10, '#8c85b0', 'center', null);
        }
        panelEnd();
    }

    function drawAway() {
        const b = panelBox(384, 330, 'WELCOME BACK!', '#7bed9f'), a = save.away || { coins: 0, ms: 0 };
        const collect = mul => { const c = a.coins; save.away = null; give({ coins: c }, W / 2, b.y + 128, mul); Sound.buy(); Haptics.buzz(30); close(); };
        text('YOUR SOLDIERS COLLECTED', W / 2, b.y + 78, 15, '#fff');
        drawCoin(W / 2 - textWidth(fmt(a.coins), 44) / 2 - 26, b.y + 126, 22);
        text(fmt(a.coins), W / 2 + 16, b.y + 128, 44, '#ffd32a');
        text(`WHILE YOU WERE AWAY FOR ${span(a.ms)}`, W / 2, b.y + 172, 13, '#b9b2e6', 'center', '#120d22', 3);
        text(`THEY COLLECT FOR UP TO ${OFFLINE_CAP_H} HOURS`, W / 2, b.y + 192, 11, '#8c85b0', 'center', null);
        const by = b.y + 222;
        if (Ads.rewardedReady('offline')) {
            btn(b.x + 20, by, 150, 56, 'COLLECT', 'green', () => collect(1));
            btn(b.x + 182, by, 182, 56, 'x2', 'gold', () => Ads.showRewarded('offline', w => collect(w ? 2 : 1)), { ad: true, pulse: true, size: 24 });
        } else btn(W / 2 - 120, by, 240, 56, 'COLLECT', 'green', () => collect(1), { pulse: true });
        panelEnd();
    }

    function drawGet() {
        const k = P.kind, B = BOOST[k], b = panelBox(360, 318, B.name, B.color);
        ctx.globalCompositeOperation = 'lighter'; glow(k === 'air' ? 'orange' : 'cyan', W / 2, b.y + 112, 70, 0.35); ctx.globalCompositeOperation = 'source-over';
        icon(k, W / 2, b.y + 112, k === 'air' ? 42 : 36);
        text(B.desc, W / 2, b.y + 172, 13, '#fff', 'center', '#120d22', 3);
        text("YOU'RE OUT OF THEM. GET ONE NOW:", W / 2, b.y + 196, 11, '#b9b2e6', 'center', '#120d22', 3);
        const got = () => { save.boost[k]++; writeSave(); Sound.buy(); close(); useBooster(k); };
        const ad = adBoosters < BOOSTER_ADS && Ads.rewardedReady('booster'), by = b.y + 222;
        if (ad) {
            btn(b.x + 18, by, 172, 58, 'FREE', 'gold', () => Ads.showRewarded('booster', w => { if (w) { adBoosters++; got(); } }), { ad: true, pulse: true });
            btn(b.x + 202, by, 140, 58, '', 'blue', () => { if (spend(B.price)) got(); }, { gems: B.price });
        } else btn(W / 2 - 110, by, 220, 58, 'BUY', 'blue', () => { if (spend(B.price)) got(); }, { gems: B.price });
        panelEnd();
    }

    function drawStarter() {
        const b = panelBox(390, 400, 'STARTER PACK', '#ffd32a'), r = starterPack();
        text('EVERYTHING TO GET YOU GOING', W / 2, b.y + 74, 13, '#b9b2e6', 'center', '#120d22', 3);
        parts(r).forEach((p, i) => {
            const x = b.x + 22 + (i % 2) * 178, y = b.y + 96 + Math.floor(i / 2) * 84;
            card(x, y, 168, 74);
            icon(p.k, x + 40, y + 37, p.k === 'air' ? 18 : 20);
            text(p.k === 'coins' ? p.str : p.k === 'gems' ? p.str : p.str, x + 76, y + 28, 22, p.k === 'coins' ? '#ffd32a' : p.k === 'gems' ? '#8fe9ff' : '#fff', 'left');
            text({ coins: 'COINS', gems: 'GEMS', air: 'AIR STRIKES', freeze: 'FREEZES' }[p.k], x + 76, y + 52, 11, '#b9b2e6', 'left', '#120d22', 3);
        });
        text('ONE TIME ONLY · THE BEST DEAL IN THE STORE', W / 2, b.y + 278, 11, '#7bed9f', 'center', '#120d22', 3);
        btn(W / 2 - 120, b.y + 298, 240, 58, Ads.price('starter_pack') || 'BUY', 'green', () => Ads.buy('starter_pack'), { pulse: true, size: 24 });
        text('IT STAYS IN THE STORE IF YOU CHANGE YOUR MIND', W / 2, b.y + b.h - 20, 10, '#8c85b0', 'center', null);
        panelEnd();
    }

    const PANELS = { daily: drawDaily, missions: drawMissions, wheel: drawWheel, awards: drawAwards, store: drawStore, away: drawAway, get: drawGet, starter: drawStarter };
    function drawSays() {
        for (const s of says) {
            const k = s.t / s.life;
            ctx.save(); ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
            const pop = k < 0.12 ? 0.5 + easeOutBack(k / 0.12) * 0.5 : 1;
            ctx.translate(clamp(s.x, 20 + textWidth(s.str, s.size) / 2, W - 20 - textWidth(s.str, s.size) / 2), s.y - k * 30); ctx.scale(pop, pop);
            text(s.str, 0, 0, s.size, s.color);
            ctx.restore();
        }
    }
    function drawPanel() {
        if (P) { PANELS[P.id](); for (const p of topParts) drawPart(p); }
        drawSays();
    }

    // ---------- DRAWING: THE HUB, BOOSTER BUTTONS, TOASTS ----------
    const HUB = {
        daily: { name: 'DAILY REWARD', short: 'DAILY', dot: () => dailyReady() },
        missions: { name: 'DAILY MISSIONS', short: 'MISSIONS', dot: () => (save.daily.m || []).some(m => m.n >= m.target && !m.got) || ((save.daily.m || []).length > 0 && save.daily.m.every(m => m.got) && !save.daily.chest) },
        wheel: { name: 'LUCKY WHEEL', short: 'WHEEL', dot: () => freeSpin() },
        awards: { name: 'ACHIEVEMENTS', short: 'AWARDS', dot: () => ACH.some(achReady) },
        store: { name: 'THE STORE', short: 'STORE', dot: () => false }
    };
    const hubShown = () => (state === 'title' || state === 'shop' || state === 'won') && Object.keys(HUB).some(has);
    const hubSpot = i => ({ x: 36 + i * 57, y: L.battleTop + 30 });

    function hubIcon(k, x, y) {
        if (k === 'daily') { if (!drawUi('icon_gift', x, y, 32, 32)) text('!', x, y + 2, 22, '#ffd32a'); }
        else if (k === 'awards') { if (!drawUi('icon_trophy', x, y, 31, 31)) text('★', x, y + 2, 22, '#ffd32a'); }
        else if (k === 'store') drawGem(x, y + 1, 14);
        else if (k === 'wheel') {
            for (let i = 0; i < 8; i++) { ctx.fillStyle = WHEEL_COLORS[i]; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 14, time * 0.6 + i * SLICE, time * 0.6 + (i + 1) * SLICE); ctx.closePath(); ctx.fill(); }
            ctx.strokeStyle = '#1a1026'; ctx.lineWidth = 2; circle(x, y, 14); ctx.stroke();
            ctx.fillStyle = '#ffd32a'; circle(x, y, 4); ctx.fill();
        } else {   // missions: a clipboard
            ctx.fillStyle = '#f3e3c3'; rrect(x - 11, y - 13, 22, 27, 3); ctx.fill();
            ctx.strokeStyle = '#1a1026'; ctx.lineWidth = 2; rrect(x - 11, y - 13, 22, 27, 3); ctx.stroke();
            ctx.fillStyle = '#8d6e63'; rrect(x - 6, y - 16, 12, 6, 2); ctx.fill();
            for (let i = 0; i < 3; i++) { ctx.fillStyle = '#2ecc71'; circle(x - 6, y - 5 + i * 7, 2); ctx.fill(); ctx.fillStyle = '#8a7a5c'; ctx.fillRect(x - 2, y - 6 + i * 7, 10, 2); }
        }
    }
    function drawHub() {
        let i = 0;
        for (const k of Object.keys(HUB)) {
            if (!has(k)) continue;
            const { x, y } = hubSpot(i++), isNew = save.flags['o_' + k] !== 1, dot = HUB[k].dot();
            const s = dot || isNew ? 1 + 0.06 * Math.sin(time * 6) : 1;
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; circle(x, y + 3, 22 * s); ctx.fill();
            const g = ctx.createLinearGradient(0, y - 22, 0, y + 22);
            g.addColorStop(0, '#5a479c'); g.addColorStop(1, '#2b1e4d');
            ctx.fillStyle = g; circle(x, y, 22 * s); ctx.fill();
            ctx.strokeStyle = dot ? '#ffd32a' : '#1a1026'; ctx.lineWidth = 2.5; circle(x, y, 22 * s); ctx.stroke();
            hubIcon(k, x, y);
            text(HUB[k].short, x, y + 31, 9, '#e6e1ff', 'center', '#120d22', 3);
            if (dot) { ctx.fillStyle = '#ff3b30'; circle(x + 16, y - 16, 8); ctx.fill(); ctx.strokeStyle = '#1a1026'; ctx.lineWidth = 2; ctx.stroke(); text('!', x + 16, y - 15, 11, '#fff', 'center', null); }
            else if (isNew) { ctx.fillStyle = '#ffd32a'; rrect(x + 2, y - 26, 30, 14, 7); ctx.fill(); text('NEW', x + 17, y - 18, 9, '#1a1026', 'center', null); }
            hit(x - 26, y - 26, 52, 64, () => openPanel({ id: k }));
        }
        if (has('store')) hit(GEM_HUD.x - 16, 4, 74, 48, () => openPanel({ id: 'store', tab: Ads.storeEnabled() ? 1 : 0 }));
    }

    function drawBoosters() {
        if (!has('booster') || tut) return;
        Object.keys(BOOST).forEach((k, i) => {
            const { x, y, r } = boosterSpot(i), n = save.boost[k], wait = cd[k] / BOOSTER_COOLDOWN;
            if (k === 'air' && hintT > 0) { ctx.strokeStyle = `rgba(255, 211, 42, ${0.5 + 0.5 * Math.sin(time * 8)})`; ctx.lineWidth = 3; circle(x, y, r + 6 + 3 * Math.sin(time * 8)); ctx.stroke(); }
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; circle(x, y + 3, r); ctx.fill();
            ctx.fillStyle = 'rgba(24, 14, 44, 0.88)'; circle(x, y, r); ctx.fill();
            ctx.strokeStyle = BOOST[k].color; ctx.lineWidth = 2.5; circle(x, y, r); ctx.stroke();
            ctx.save(); if (wait > 0 || n <= 0) ctx.globalAlpha = 0.45;
            icon(k, x, y, k === 'air' ? 15 : 13);
            ctx.restore();
            if (wait > 0) { ctx.fillStyle = 'rgba(8, 4, 16, 0.6)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * wait); ctx.closePath(); ctx.fill(); }
            ctx.fillStyle = n > 0 ? '#1a1026' : '#2ecc71'; circle(x + r - 5, y + r - 5, 10); ctx.fill();
            ctx.strokeStyle = BOOST[k].color; ctx.lineWidth = 1.5; ctx.stroke();
            text(n > 0 ? `${n}` : '+', x + r - 5, y + r - 4, 12, '#fff', 'center', null);
            hit(x - r - 5, y - r - 5, r * 2 + 10, r * 2 + 10, () => useBooster(k));
        });
    }

    function drawToasts() {
        const t = toasts[0];
        if (!t) return;
        const k = t.t / t.life, a = Math.min(1, t.t / 0.2, (t.life - t.t) / 0.3);
        const y = (state === 'play' || state === 'cleared' ? L.battleTop + 54 : L.battleBottom + 4) - (1 - easeOut(Math.min(1, t.t / 0.25))) * 14;
        const size = t.str.length > 34 ? 11 : 13, w = textWidth(t.str, size) + 30;
        ctx.save(); ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = 'rgba(12, 8, 24, 0.9)'; rrect(W / 2 - w / 2, y - 14, w, 28, 14); ctx.fill();
        ctx.strokeStyle = t.color; ctx.lineWidth = 2; rrect(W / 2 - w / 2, y - 14, w, 28, 14); ctx.stroke();
        text(t.str, W / 2, y + 1, size, t.color, 'center', '#120d22', 3);
        ctx.restore();
    }

    function beginFrame() { hits = []; }
    function drawUnder() {
        if (hubShown()) drawHub();
        if (state === 'play') drawBoosters();
        drawToasts();
    }

    return {
        init, update, modal, click, beginFrame, drawUnder, drawPanel, ev, levelStart, levelCleared, enterShop, crateOpened, purchased,
        leaving, returning, hubShown, gemsShown, unit, coinsOf,
        // for tests
        t: { get panel() { return P; }, open: openPanel, close, queue, has, newDay, dailyReady, claimDaily, spin, MISSIONS, ACH, achReady, WHEEL, useBooster, hubSpot, boosterSpot, get hits() { return hits; }, toasts, give, PRICES, GEM_PACKS, starterPack, DAILY, reminderTexts }
    };
})();
