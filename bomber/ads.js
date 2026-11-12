// --- ZOMBIE BOMBER: ADS AND PURCHASES ---
// Ads and purchases run in the Android app only: AdMob ads and Google Play purchases are handled by the
// app (android/bomber, MainActivity) and reached through window.AndroidApp. On the website there are no
// ads, no ad offers and nothing to buy. Add #adtest to the page's address to try all of it on the web,
// with stand-in ads and pretend purchases.
//
// The plan: as many ads as players are happy to watch, and as few as possible they have to.
//   Rewarded ads, always the player's choice, at the moments they're worth the most:
//     revive   the base falls: repair it and keep fighting (once a level)
//     double   level cleared: double the coins from that level
//     coins    upgrade shop: free coins, once a visit
//     boost    upgrade shop: start the next level with a big bomb in the bay
//     and, sharing one "bonus" ad unit:
//     offline  double the coins the soldiers collected while you were away
//     daily    double the daily reward
//     wheel    another spin of the lucky wheel (up to 5 a day)
//     booster  a free Air Strike or Freeze when you're out of them (2 a level)
//     crate    open a golden supply crate
//   A full-screen ad only between levels, when PLAY is pressed in the shop: not before level 4, at
//   most once every 2.5 minutes, and not within 2.5 minutes of a rewarded ad, so players who choose
//   rewarded ads see fewer of the ones they don't choose. Never during a level.
//   A banner across the top of the screen, away from the bomb bay where the fingers are.
// Purchases (Google Play):
//   remove_ads     "No Ads", one time: the banner and the full-screen ads off for good. The rewarded
//                  offers stay, since the player always chooses them.
//   starter_pack   one time: gems, boosters and coins
//   gems_1 .. 4    packs of gems, as often as wanted
// What a purchase gives is decided in meta.js (Meta.purchased); nothing random is ever sold.

const Ads = (() => {
    const App = window.AndroidApp || null;
    const TEST = !App && /(^|[#&])adtest(&|$)/.test(location.hash);
    const FULLSCREEN_FROM_LEVEL = 4;
    const FULLSCREEN_GAP_MS = 150 * 1000;
    const STUCK_MS = 180 * 1000;           // if the app never says an ad is over, carry on anyway
    // which of the app's rewarded ad units serves each offer
    const UNIT = { revive: 'revive', double: 'double', coins: 'coins', boost: 'boost', offline: 'bonus', daily: 'bonus', wheel: 'bonus', booster: 'bonus', crate: 'bonus' };
    const UNITS = ['revive', 'double', 'coins', 'boost', 'bonus'];
    const PRODUCTS = ['starter_pack', 'gems_1', 'gems_2', 'gems_3', 'gems_4'];
    const TEST_PRICES = { starter_pack: '$1.99', gems_1: '$0.99', gems_2: '$4.99', gems_3: '$9.99', gems_4: '$19.99' };

    let lastFullscreen = Date.now();       // the clock starts at launch: no full-screen ad straight away
    let showing = null;                    // { id, kind } while an ad is on screen
    let nextId = 1;
    let testAdFree = false;
    try { testAdFree = localStorage.getItem('zombieBomber.testAdFree') === '1'; } catch (e) {}

    // Calls into the app cross threads, so their answers are kept for a second instead of asked every frame
    const cache = { at: 0, adFree: false, price: '', privacy: false, ready: {}, prices: {} };
    const ask = (name, ...args) => { try { return App[name](...args); } catch (e) { return undefined; } };
    function refresh(force) {
        if (!App) return;
        const now = Date.now();
        if (!force && now - cache.at < 1000) return;
        cache.at = now;
        cache.adFree = !!ask('isAdFree');
        cache.price = ask('noAdsPrice') || '';
        cache.privacy = !!ask('privacyOptionsRequired');
        for (const u of UNITS) cache.ready[u] = !!ask('rewardedReady', u);
        for (const p of PRODUCTS) cache.prices[p] = ask('productPrice', p) || '';
    }
    const listeners = [];
    // the app says: No Ads was bought, restored or refunded, or Google Play's prices are known now
    window.onAdFreeChanged = () => { refresh(true); listeners.forEach(f => { try { f(); } catch (e) {} }); };

    // The app says a gem pack or the starter pack has been paid for. It is given once (its token is
    // remembered in the save), then the app is told to use it up so it can be bought again.
    window.onPurchase = (id, token) => {
        if (typeof save === 'undefined' || typeof Meta === 'undefined' || !save.tokens) return;   // not loaded yet: the app offers it again
        if (!save.tokens.includes(token)) {
            save.tokens.push(token);
            if (save.tokens.length > 40) save.tokens.shift();
            Meta.purchased(id);
            writeSave();
        }
        if (App) ask('consumePurchase', token);
    };

    function begin(kind, done) {
        const id = nextId++;
        showing = { id, kind };
        const end = result => {
            if (!showing || showing.id !== id) return;   // already over (the safety timer, or a late answer)
            showing = null;
            lastFullscreen = Date.now();
            refresh(true);
            done(result);
        };
        setTimeout(() => end(false), STUCK_MS);
        return end;
    }

    // ---------- the stand-in ad for #adtest ----------
    function testAd(kind, end) {
        const box = document.createElement('div');
        box.setAttribute('role', 'dialog');
        box.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
            'background:#05040a;color:#fff;font:600 18px system-ui,sans-serif;text-align:center;padding:24px';
        const label = document.createElement('div');
        const close = document.createElement('button');
        close.style.cssText = 'font:600 16px system-ui,sans-serif;padding:10px 22px;border-radius:20px;border:1px solid #777;background:#222;color:#fff';
        box.append(label, close);
        document.body.appendChild(box);
        const rewarded = kind === 'rewarded', length = rewarded ? 5 : 3;
        let left = length;
        const paint = () => {
            label.textContent = `TEST AD · ${rewarded ? 'REWARDED' : 'BETWEEN LEVELS'} · ${left}s`;
            close.textContent = left > 0 ? (rewarded ? 'Skip (no reward)' : 'Close') : (rewarded ? 'Collect reward' : 'Close');
        };
        const shut = result => { clearInterval(timer); box.remove(); end(result); };
        const timer = setInterval(() => { left = Math.max(0, left - 1); paint(); }, 1000);
        close.onclick = () => shut(rewarded ? left === 0 : true);
        paint();
    }

    return {
        /** Are there ads here at all (the app, or #adtest on the web)? */
        enabled: () => !!App || TEST,
        isTest: () => TEST,
        /** No Ads bought: no banner, no full-screen ads. */
        adFree() { refresh(); return App ? cache.adFree : TEST && testAdFree; },
        isShowing: () => !!showing,
        /** Is a rewarded ad loaded for this offer, ready to show? */
        rewardedReady(placement) {
            if (showing) return false;
            refresh();
            return App ? !!cache.ready[UNIT[placement]] : TEST;
        },
        /** Shows a rewarded ad; done(true) once the player has watched it through, done(false) otherwise. */
        showRewarded(placement, done) {
            if (!this.rewardedReady(placement)) { done(false); return; }
            const end = begin('rewarded', watched => done(!!watched));
            if (App) {
                window.onRewardedDone = watched => { window.onRewardedDone = null; end(!!watched); };
                ask('showRewardedAd', UNIT[placement]);
            } else testAd('rewarded', end);
        },
        /** Between levels: maybe a full-screen ad, then done() (straight away when none is due). */
        betweenLevels(level, done) {
            const due = level >= FULLSCREEN_FROM_LEVEL && Date.now() - lastFullscreen >= FULLSCREEN_GAP_MS;
            if (!this.enabled() || this.adFree() || showing || !due) { done(); return; }
            const end = begin('fullscreen', () => done());
            if (App) {
                window.onNativeAdDone = () => { window.onNativeAdDone = null; end(true); };
                ask('showFullscreenAd');
            } else testAd('fullscreen', end);
        },
        /** "No Ads" in the player's currency, from Google Play ("" until it has answered). */
        noAdsPrice() { refresh(); return App ? cache.price : TEST ? '$4.99' : ''; },
        buyNoAds() {
            if (App) { ask('buyNoAds'); return; }
            if (!TEST) return;
            testAdFree = true;
            try { localStorage.setItem('zombieBomber.testAdFree', '1'); } catch (e) {}
            window.onAdFreeChanged();
        },
        /** Is there a store that takes money here (the app, or #adtest on the web)? */
        storeEnabled: () => !!App || TEST,
        /** A gem pack's or the starter pack's price in the player's currency ("" until Google Play has answered). */
        price(id) { refresh(); return App ? cache.prices[id] || '' : TEST ? TEST_PRICES[id] || '' : ''; },
        /** Starts a purchase; when it's paid for, the app calls window.onPurchase. */
        buy(id) {
            if (App) { ask('buyProduct', id); return; }
            if (TEST) setTimeout(() => window.onPurchase(id, 'test-' + Date.now() + '-' + Math.random()), 300);
        },
        /** The game has loaded: the app hands over anything paid for but not yet given. */
        gameReady() { if (App) ask('gameReady'); },
        /** Asks, once, whether the app may send a reminder when the next daily reward is ready. */
        askReminders() { if (App) ask('enableReminders'); },
        /** What a reminder should say when it shows: kind is 'daily' (the next day) or 'back' (three days on). */
        reminderText(kind, title, text) { if (App) ask('setReminderText', kind, title, text); },
        /** Where the law asks for it (EU, UK, some US states): a way to change the ad consent choice. */
        privacyRequired() { refresh(); return App ? cache.privacy : false; },
        showPrivacy() { if (App) ask('showPrivacyOptions'); },
        onChange(f) { listeners.push(f); }
    };
})();
