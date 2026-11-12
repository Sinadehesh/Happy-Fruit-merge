package com.sinadehesh.gemjar;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.DisplayCutout;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Gem Jar: one full-screen window running the web game packed in the app (assets/www), with
 * AdMob ads: a banner under the game, a full-screen ad between games, and a rewarded ad the player
 * can choose to watch when the jar fills up, to clear the top and keep going. A one-time "No Ads"
 * purchase through Google Play switches the banner and the full-screen ads off for good; the
 * rewarded "keep going" ad stays on offer, since the player always chooses to watch it.
 *
 * The game is served on the address Android sets aside for app files, so it works offline and
 * everything it uses (fetching sounds, saving the game) works as on the website. The page talks
 * to this class through window.AndroidApp (see Bridge, and ads.js in the game).
 */
public class MainActivity extends Activity implements PurchasesUpdatedListener {
    private static final String TAG = "GemJar";
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/index.html";
    private static final String BG = "#4b2f9c";

    /** The one-time product to create in Play Console (Monetize > Products > In-app products). */
    static final String NO_ADS_PRODUCT = "remove_ads";
    /** At most one full-screen ad a minute, however fast games end. */
    private static final long MIN_FULLSCREEN_GAP_MS = 60_000;

    private WebView web;
    private FrameLayout bannerSlot;
    private AdView banner;
    private volatile boolean bannerWanted;   // the page asks for the banner only off the board (menu, map)
    private boolean activityResumed;
    private InterstitialAd interstitial;
    private boolean loadingInterstitial;
    private volatile RewardedAd rewarded;
    private boolean loadingRewarded;
    private long lastFullscreenAt;

    private SharedPreferences prefs;
    private ConsentInformation consent;
    private final AtomicBoolean adsStarted = new AtomicBoolean(false);
    private BillingClient billing;
    private volatile ProductDetails noAdsProduct;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        prefs = getSharedPreferences("gemjar", MODE_PRIVATE);

        // the game on top, the banner below it (only on the menu and the map, never during a game);
        // all kept clear of a camera notch
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor(BG));
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                int l = 0, t = 0, r = 0, b = 0;
                if (Build.VERSION.SDK_INT >= 28) {
                    DisplayCutout c = insets.getDisplayCutout();
                    if (c != null) { l = c.getSafeInsetLeft(); t = c.getSafeInsetTop(); r = c.getSafeInsetRight(); b = c.getSafeInsetBottom(); }
                }
                v.setPadding(l, t, r, b);
                return insets;
            }
        });
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        root.addView(column, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        web = new WebView(this);
        setUpWebView();
        column.addView(web, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        bannerSlot = new FrameLayout(this);
        bannerSlot.setBackgroundColor(Color.parseColor(BG));
        bannerSlot.setVisibility(View.GONE);   // until the page asks for it
        column.addView(bannerSlot, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        setContentView(root);
        hideSystemBars();
        if (state == null || web.restoreState(state) == null) web.loadUrl(HOME);

        startBilling();
        askConsentThenStartAds();
    }

    // ---------- the game ----------

    private void setUpWebView() {
        web.setBackgroundColor(Color.parseColor(BG));
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                 // best score, saved game, settings
        s.setMediaPlaybackRequiresUserGesture(false); // music
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);                           // the layout is sized by the game, not the phone's font size
        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!HOST.equals(url.getHost())) return null;
                String path = url.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                String type = mimeType(path);
                try {
                    InputStream in = getAssets().open("www" + path);
                    return new WebResourceResponse(type, type.startsWith("text/") || type.endsWith("javascript") ? "utf-8" : null, in);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost());   // stay inside the game
            }
        });
    }

    private static String mimeType(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    /** Runs a line of JavaScript in the game. */
    private void tellGame(final String js) {
        runOnUiThread(new Runnable() {
            @Override public void run() { if (web != null) web.evaluateJavascript(js, null); }
        });
    }

    /** What the game can call, as window.AndroidApp.<name>(). Called on a background thread. */
    private class Bridge {
        @JavascriptInterface public boolean isAdFree() { return adFree(); }

        /** The "No Ads" price in the player's currency, or "" before Google Play has said. */
        @JavascriptInterface public String noAdsPrice() {
            ProductDetails p = noAdsProduct;
            if (p == null) return "";
            ProductDetails.OneTimePurchaseOfferDetails o = p.getOneTimePurchaseOfferDetails();
            return o == null ? "" : o.getFormattedPrice();
        }

        @JavascriptInterface public void buyNoAds() {
            runOnUiThread(new Runnable() { @Override public void run() { launchNoAdsPurchase(); } });
        }

        /** A full-screen ad between games; the game is told window.onNativeAdDone() when it's over (or if none). */
        @JavascriptInterface public void showFullscreenAd() {
            runOnUiThread(new Runnable() { @Override public void run() { showInterstitial(); } });
        }

        /** True where the law asks for a way to change ad consent (EU, UK, some US states). */
        @JavascriptInterface public boolean privacyOptionsRequired() {
            return consent != null && consent.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
        }

        @JavascriptInterface public void showPrivacyOptions() {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    UserMessagingPlatform.showPrivacyOptionsForm(MainActivity.this, formError -> {
                        if (formError != null) Log.w(TAG, "privacy options: " + formError.getMessage());
                        if (consent.canRequestAds()) startAds();
                    });
                }
            });
        }

        /** True when a "watch an ad to keep going" ad is loaded and can be offered. */
        @JavascriptInterface public boolean rewardedReady() { return rewarded != null; }

        /** Shows it; the game is told window.onRewardedDone(true) if the player watched it through, else false. */
        @JavascriptInterface public void showRewardedAd() {
            runOnUiThread(new Runnable() { @Override public void run() { showRewarded(); } });
        }

        @JavascriptInterface public boolean testAds() { return BuildConfig.TEST_ADS; }

        /** The page shows the banner only off the board (the home menu, the Gem Mine map), never during a game. */
        @JavascriptInterface public void setBannerVisible(boolean on) {
            bannerWanted = on;
            runOnUiThread(new Runnable() { @Override public void run() { applyBanner(); } });
        }
    }

    // ---------- ad consent, then ads ----------

    private void askConsentThenStartAds() {
        consent = UserMessagingPlatform.getConsentInformation(this);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        consent.requestConsentInfoUpdate(this, params,
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(this, formError -> {
                if (formError != null) Log.w(TAG, "consent form: " + formError.getMessage());
                if (consent.canRequestAds()) startAds();
            }),
            requestError -> Log.w(TAG, "consent info: " + requestError.getMessage()));
        // consent given on an earlier launch: ads can start straight away
        if (consent.canRequestAds()) startAds();
    }

    private void startAds() {
        if (!adsStarted.compareAndSet(false, true)) return;
        new Thread(() -> MobileAds.initialize(this, status -> runOnUiThread(() -> {
            loadBanner();
            loadInterstitial();
            loadRewarded();
        }))).start();
    }

    @SuppressWarnings("deprecation")   // the regular-size banner, still served; Google now prefers the large one
    private void loadBanner() {
        if (adFree() || banner != null) return;
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int widthDp = (int) (dm.widthPixels / dm.density), heightDp = (int) (dm.heightPixels / dm.density);
        banner = new AdView(this);
        banner.setAdUnitId(BuildConfig.BANNER_ID);
        // the large banner earns more, but on a short phone it would squeeze the jar: the regular one there
        banner.setAdSize(heightDp >= 720 ? AdSize.getLargeAnchoredAdaptiveBannerAdSize(this, widthDp)
                                         : AdSize.getPortraitAnchoredAdaptiveBannerAdSize(this, widthDp));
        bannerSlot.addView(banner, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER_HORIZONTAL));
        banner.loadAd(new AdRequest.Builder().build());
        applyBanner();
    }

    // The banner shows only where the page asks for it (off the board) and while the app is in front; while it
    // is hidden it is paused, so it doesn't refresh. Hiding it gives the game the whole screen.
    private void applyBanner() {
        boolean show = bannerWanted && banner != null && !adFree();
        bannerSlot.setVisibility(show ? View.VISIBLE : View.GONE);
        if (banner == null) return;
        if (show && activityResumed) banner.resume(); else banner.pause();
    }

    private void loadInterstitial() {
        if (adFree() || interstitial != null || loadingInterstitial) return;
        loadingInterstitial = true;
        InterstitialAd.load(this, BuildConfig.INTERSTITIAL_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) { loadingInterstitial = false; interstitial = ad; }
            @Override public void onAdFailedToLoad(LoadAdError error) {
                loadingInterstitial = false;
                Log.w(TAG, "full-screen ad: " + error.getMessage());
            }
        });
    }

    private void showInterstitial() {
        long now = System.currentTimeMillis();
        InterstitialAd ad = interstitial;
        if (adFree() || ad == null || now - lastFullscreenAt < MIN_FULLSCREEN_GAP_MS) {
            adDone();
            loadInterstitial();
            return;
        }
        interstitial = null;
        lastFullscreenAt = now;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { adDone(); loadInterstitial(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { adDone(); loadInterstitial(); }
        });
        ad.show(this);
    }

    private void adDone() { tellGame("window.onNativeAdDone && window.onNativeAdDone()"); }

    private void loadRewarded() {
        if (rewarded != null || loadingRewarded) return;
        loadingRewarded = true;
        RewardedAd.load(this, BuildConfig.REWARDED_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(RewardedAd ad) { loadingRewarded = false; rewarded = ad; }
            @Override public void onAdFailedToLoad(LoadAdError error) {
                loadingRewarded = false;
                Log.w(TAG, "rewarded ad: " + error.getMessage());
            }
        });
    }

    private void showRewarded() {
        RewardedAd ad = rewarded;
        if (ad == null) { rewardedDone(false); loadRewarded(); return; }
        rewarded = null;
        lastFullscreenAt = System.currentTimeMillis();   // no full-screen ad right after this one
        final boolean[] earned = { false };
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { rewardedDone(earned[0]); loadRewarded(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { rewardedDone(false); loadRewarded(); }
        });
        ad.show(this, reward -> earned[0] = true);
    }

    private void rewardedDone(boolean earned) {
        tellGame("window.onRewardedDone && window.onRewardedDone(" + earned + ")");
    }

    // ---------- "No Ads" purchase ----------

    private boolean adFree() { return prefs.getBoolean("adFree", false); }

    private void setAdFree(boolean value) {
        if (value == adFree()) return;
        prefs.edit().putBoolean("adFree", value).apply();
        runOnUiThread(() -> {
            if (value) {   // bought: every ad goes away
                if (banner != null) { banner.destroy(); bannerSlot.removeAllViews(); banner = null; }
                applyBanner();
                interstitial = null;
            } else if (adsStarted.get()) {   // refunded: the banner and full-screen ads come back
                loadBanner();
                loadInterstitial();
            }
        });
        tellGame("window.onAdFreeChanged && window.onAdFreeChanged()");
    }

    private void startBilling() {
        billing = BillingClient.newBuilder(this)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    Log.w(TAG, "billing: " + result.getDebugMessage());
                    return;
                }
                checkOwnedPurchases();
                loadNoAdsProduct();
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    /** Restores "No Ads" on a new phone or after reinstalling, and notices a refund. */
    private void checkOwnedPurchases() {
        billing.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (result, purchases) -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) handlePurchases(purchases, true);
            });
    }

    private void loadNoAdsProduct() {
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(NO_ADS_PRODUCT).setProductType(BillingClient.ProductType.INAPP).build()))
            .build();
        billing.queryProductDetailsAsync(params, (result, details) -> {
            List<ProductDetails> list = details.getProductDetailsList();
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && !list.isEmpty()) {
                noAdsProduct = list.get(0);
                tellGame("window.onAdFreeChanged && window.onAdFreeChanged()");   // the price is known now
            }
        });
    }

    private void launchNoAdsPurchase() {
        ProductDetails p = noAdsProduct;
        if (p == null || billing == null) { loadNoAdsProduct(); return; }
        BillingFlowParams.ProductDetailsParams.Builder item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(p);
        ProductDetails.OneTimePurchaseOfferDetails offer = p.getOneTimePurchaseOfferDetails();
        if (offer != null && offer.getOfferToken() != null) item.setOfferToken(offer.getOfferToken());
        billing.launchBillingFlow(this, BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(Collections.singletonList(item.build())).build());
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) handlePurchases(purchases, false);
        else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) checkOwnedPurchases();
    }

    /** Grants "No Ads" for a completed purchase and confirms it to Google Play (unconfirmed ones are refunded after 3 days). */
    private void handlePurchases(List<Purchase> purchases, boolean fullList) {
        boolean owned = false;
        for (Purchase p : purchases) {
            if (!p.getProducts().contains(NO_ADS_PRODUCT) || p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
            owned = true;
            if (!p.isAcknowledged()) {
                billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                    r -> Log.i(TAG, "purchase confirmed: " + r.getResponseCode()));
            }
        }
        if (owned) setAdFree(true);
        else if (fullList) setAdFree(false);
    }

    // ---------- window ----------

    // full screen: status and navigation bars hidden, a swipe from the edge shows them for a moment
    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    // Leaving the app pauses the page: the music stops and the game saves (it also saves every second)
    @Override
    protected void onPause() {
        activityResumed = false;
        if (banner != null) banner.pause();
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        activityResumed = true;
        applyBanner();
        hideSystemBars();
        if (billing != null && billing.isReady()) checkOwnedPurchases();   // e.g. a purchase finished while away
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    // Back goes to the home screen without closing the game (Android 7 to 12; newer Android does this itself)
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() { moveTaskToBack(true); }

    @Override
    protected void onDestroy() {
        if (banner != null) banner.destroy();
        if (billing != null) billing.endConnection();
        web.destroy();
        super.onDestroy();
    }
}
