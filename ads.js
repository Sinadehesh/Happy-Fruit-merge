// --- ADS ---
//
// Only in the Android app. The web version (the game in a browser) shows no ads at all.
//
// In the Android app (window.AndroidApp, from MainActivity) the ads are real AdMob ads shown by the app, never
// while a game is being played: a banner on the home menu and the Gem Mine map, a full-screen ad only between
// games (on "Play Again", on the way home after a game, between Gem Mine stages; the app keeps them at most once
// a minute), and ads the player chooses to watch for a reward (to keep going when the jar fills up, a booster,
// a spin...). Buying "No Ads" switches off the banner and full-screen ads; the reward ads stay, since the
// player chooses to watch them.

const App = window.AndroidApp || null;

const Ads = (() => {
    let showing = false;
    let hooks = { onPause() {}, onResume() {} };

    function finish(onClose) {
        showing = false;
        hooks.onResume();
        if (onClose) onClose();
    }

    // between games: the app shows a real full-screen ad, then tells us it's over (or right away if there's
    // none); the web goes straight on
    function showInterstitial(onClose) {
        if (!App || GAME.ads === false || App.isAdFree()) { if (onClose) onClose(); return; }
        if (showing) return;
        showing = true;
        hooks.onPause();
        window.onNativeAdDone = () => { window.onNativeAdDone = null; finish(onClose); };
        App.showFullscreenAd();
    }

    return {
        init(h) { hooks = Object.assign(hooks, h); },
        isShowing() { return showing; },
        showInterstitial,
        // "Keep going" rewarded ad (Android app only; the player chooses to watch it)
        rewardedReady() { return !!(App && App.rewardedReady()); },
        canRevive() { return this.rewardedReady(); },
        showRewarded(done) {
            if (!App || showing) { done(false); return; }
            showing = true;
            hooks.onPause();
            window.onRewardedDone = watched => {
                window.onRewardedDone = null;
                showing = false;
                done(!!watched);      // the reward first (it may close a panel, like Keep Going)...
                hooks.onResume();     // ...then the game resumes, if nothing else is covering it
            };
            App.showRewardedAd();
        },
        onDrop() {}   // (no ad breaks in the middle of a game, ever)
    };
})();

// Android app: the "No Ads" purchase and the ad privacy settings, in the settings panel
if (App) {
    const row = document.getElementById('store-row');
    const buy = document.getElementById('btn-no-ads');
    const privacy = document.getElementById('btn-privacy');
    const refresh = () => {
        const owned = App.isAdFree();
        row.style.display = 'flex';
        buy.textContent = owned ? 'No Ads ✓' : ('No Ads ' + App.noAdsPrice()).trim();
        buy.classList.toggle('grey', owned);
        buy.disabled = owned;
        privacy.style.display = App.privacyOptionsRequired() ? '' : 'none';
    };
    buy.addEventListener('click', () => { if (!App.isAdFree()) App.buyNoAds(); });
    privacy.addEventListener('click', () => App.showPrivacyOptions());
    window.onAdFreeChanged = refresh;
    document.getElementById('btn-settings').addEventListener('click', refresh);
    refresh();

    // the banner: only off the board (the home menu, the Gem Mine map), never while a game is played
    if (App.setBannerVisible) window.addEventListener('load', () => {
        let shown = null;
        const offBoard = () => {
            try {
                if (window.Meta && Meta.menuOpen) return true;
                const map = document.getElementById('mine-map');
                return !!map && getComputedStyle(map).display !== 'none';
            } catch (e) { return false; }
        };
        const check = () => {
            const on = offBoard();
            if (on === shown) return;
            shown = on;
            try { App.setBannerVisible(on); } catch (e) {}
        };
        check();
        setInterval(check, 200);
    });
}
