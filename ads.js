// --- ADS: repeating interstitial ad breaks ---
//
// An ad break shows every AD_EVERY_DROPS drops, or at the next drop once
// AD_EVERY_MS has passed since the last one, and again on "Play Again".
//
// If Google's H5 Games Ads (adBreak) is loaded on the page, real ads are shown.
// Otherwise a placeholder ad with a countdown is shown, so the flow can be
// tested before an ad account is set up. See README.md -> Ads.

const AD_EVERY_DROPS = 25;
const AD_EVERY_MS = 2 * 60 * 1000;
const AD_CLOSE_DELAY_S = 5;

const Ads = (() => {
    let dropsSinceAd = 0;
    let lastAdAt = Date.now();
    let showing = false;
    let hooks = { onPause() {}, onResume() {} };

    const overlay = document.getElementById('ad-overlay');
    const closeBtn = document.getElementById('ad-close');

    function finish(onClose) {
        showing = false;
        dropsSinceAd = 0;
        lastAdAt = Date.now();
        overlay.style.display = 'none';
        hooks.onResume();
        if (onClose) onClose();
    }

    function showPlaceholder(onClose) {
        overlay.style.display = 'flex';
        let left = AD_CLOSE_DELAY_S;
        closeBtn.disabled = true;
        closeBtn.textContent = `Close in ${left}`;
        const timer = setInterval(() => {
            left--;
            if (left > 0) {
                closeBtn.textContent = `Close in ${left}`;
            } else {
                clearInterval(timer);
                closeBtn.disabled = false;
                closeBtn.textContent = 'Close ✕';
            }
        }, 1000);
        closeBtn.onclick = () => { if (!closeBtn.disabled) finish(onClose); };
    }

    function showInterstitial(onClose) {
        if (showing) return;
        showing = true;
        hooks.onPause();

        if (typeof window.adBreak === 'function') {
            window.adBreak({
                type: 'next',
                name: 'ad-break',
                adBreakDone: () => finish(onClose)
            });
        } else {
            showPlaceholder(onClose);
        }
    }

    return {
        init(h) { hooks = Object.assign(hooks, h); },
        isShowing() { return showing; },
        showInterstitial,
        onDrop() {
            dropsSinceAd++;
            if (dropsSinceAd >= AD_EVERY_DROPS || Date.now() - lastAdAt >= AD_EVERY_MS) {
                // Let the item that was just dropped appear before the break
                setTimeout(() => showInterstitial(), 600);
            }
        }
    };
})();
