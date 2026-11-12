package com.sinadehesh.zombiebomber;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.DisplayCutout;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
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
import com.android.billingclient.api.ConsumeParams;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import org.json.JSONObject;

/**
 * Zombie Bomber: one full-screen window running the web game packed in the app (assets/www), with
 * AdMob ads: a banner across the top of the screen (away from the bomb bay, where the fingers are),
 * a full-screen ad between levels, and rewarded ads the player can choose to watch (repair the base,
 * double the coins, free coins, a head start, and a shared "bonus" unit for the smaller offers: the
 * wheel, the daily reward, coins collected while away, a free booster, a golden crate).
 *
 * Google Play purchases: a one-time "No Ads" that switches the banner and the full-screen ads off for
 * good (the rewarded offers stay, since the player always chooses them), and things bought again and
 * again: gem packs and the starter pack. What those give is decided by the game (meta.js); this class
 * tells the game a purchase is paid for, and uses it up once the game says it has been given.
 *
 * If the player agrees, a reminder notification when the next daily reward is ready (ReminderReceiver).
 *
 * When each ad may show is decided by the game (bomber/ads.js): this class keeps the ads loaded, shows
 * them when asked, and keeps its own minimum gap between full-screen ads as a safety net.
 *
 * The game is served on the address Android sets aside for app files, so it works offline and
 * everything it uses (saving the game, sounds) works as on the website. The page talks to this class
 * through window.AndroidApp (see Bridge).
 */
public class MainActivity extends Activity implements PurchasesUpdatedListener {
    private static final String TAG = "ZombieBomber";
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/bomber/index.html";
    private static final String BG = "#120d22";

    /** The one-time product to create in Play Console (Monetize > Products > In-app products), $4.99. */
    static final String NO_ADS_PRODUCT = "remove_ads";
    /** Products that can be bought again (used up once given): create them in Play Console too. */
    static final List<String> CONSUMABLES = Arrays.asList("starter_pack", "gems_1", "gems_2", "gems_3", "gems_4");
    /** Never two full-screen ads within 2 minutes, whatever the game asks (the game itself waits 2.5). */
    private static final long MIN_FULLSCREEN_GAP_MS = 120_000;
    /** AdMob's loaded ads expire after an hour: older ones are thrown away and loaded again. */
    private static final long AD_MAX_AGE_MS = 55 * 60_000;

    /** The rewarded offers in the game, each its own AdMob ad unit so each can be followed in AdMob. */
    private static final String[][] REWARDED_UNITS = {
        { "revive", BuildConfig.REWARDED_REVIVE_ID },   // the base falls: repair it and keep fighting
        { "double", BuildConfig.REWARDED_DOUBLE_ID },   // level cleared: double its coins
        { "coins", BuildConfig.REWARDED_COINS_ID },     // upgrade shop: free coins
        { "boost", BuildConfig.REWARDED_BOOST_ID },     // upgrade shop: start the next level with a big bomb
        { "bonus", BuildConfig.REWARDED_BONUS_ID },     // the smaller offers: wheel, daily x2, away x2, booster, golden crate
    };

    /** A rewarded ad unit and the ad loaded for it. */
    private static final class RewardedSlot {
        final String placement, unitId;
        volatile RewardedAd ad;
        volatile long loadedAt;
        boolean loading;
        int failures;
        RewardedSlot(String placement, String unitId) { this.placement = placement; this.unitId = unitId; }
    }
    private final Map<String, RewardedSlot> rewarded = new HashMap<>();

    private final Handler main = new Handler(Looper.getMainLooper());
    private WebView web;
    private FrameLayout bannerSlot;
    private AdSize bannerSize;
    private AdView banner;
    private InterstitialAd interstitial;
    private long interstitialLoadedAt;
    private boolean loadingInterstitial;
    private int interstitialFailures;
    private long lastFullscreenAt;

    private SharedPreferences prefs;
    private ConsentInformation consent;
    private final AtomicBoolean adsStarted = new AtomicBoolean(false);
    private BillingClient billing;
    private volatile ProductDetails noAdsProduct;
    private final Map<String, ProductDetails> products = new ConcurrentHashMap<>();

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        prefs = getSharedPreferences("zombiebomber", MODE_PRIVATE);
        for (String[] u : REWARDED_UNITS) rewarded.put(u[0], new RewardedSlot(u[0], u[1]));

        // the banner on top, the game below it; all kept clear of a camera notch
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

        // The banner's room is kept from the start, so the game doesn't jump when the first ad arrives.
        // A thin strip of the background under it keeps the ad apart from the game's own buttons.
        bannerSize = pickBannerSize();
        bannerSlot = new FrameLayout(this);
        bannerSlot.setBackgroundColor(Color.parseColor(BG));
        column.addView(bannerSlot, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, bannerSlotHeight()));

        web = new WebView(this);
        setUpWebView();
        column.addView(web, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

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
        s.setDomStorageEnabled(true);                 // the saved game and settings
        s.setMediaPlaybackRequiresUserGesture(false); // sound from the first tap
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
                if (path == null || path.equals("/")) path = "/bomber/index.html";
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

        /** A full-screen ad between levels; the game is told window.onNativeAdDone() when it's over (or if none). */
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

        /** True when a rewarded ad for this offer ("revive", "double", "coins", "boost") is loaded. */
        @JavascriptInterface public boolean rewardedReady(String placement) {
            RewardedSlot s = rewarded.get(placement);
            if (s == null || s.ad == null) return false;
            if (System.currentTimeMillis() - s.loadedAt > AD_MAX_AGE_MS) {   // too old to show: load a fresh one
                s.ad = null;
                main.post(() -> loadRewarded(s));
                return false;
            }
            return true;
        }

        /** Shows it; the game is told window.onRewardedDone(true) if the player watched it through, else false. */
        @JavascriptInterface public void showRewardedAd(final String placement) {
            runOnUiThread(new Runnable() { @Override public void run() { showRewarded(placement); } });
        }

        @JavascriptInterface public boolean testAds() { return BuildConfig.TEST_ADS; }

        /** A gem pack's or the starter pack's price in the player's currency, or "" before Google Play has said. */
        @JavascriptInterface public String productPrice(String id) {
            ProductDetails p = products.get(id);
            if (p == null) return "";
            ProductDetails.OneTimePurchaseOfferDetails o = p.getOneTimePurchaseOfferDetails();
            return o == null ? "" : o.getFormattedPrice();
        }

        /** Starts buying a gem pack or the starter pack; once paid for, the game is told window.onPurchase(id, token). */
        @JavascriptInterface public void buyProduct(final String id) {
            runOnUiThread(new Runnable() { @Override public void run() { launchPurchase(id); } });
        }

        /** The game has given what was bought: use the purchase up, so it can be bought again. */
        @JavascriptInterface public void consumePurchase(final String token) {
            runOnUiThread(new Runnable() { @Override public void run() { consume(token); } });
        }

        /** The game has loaded: hand over anything paid for but not yet given. */
        @JavascriptInterface public void gameReady() {
            runOnUiThread(new Runnable() {
                @Override public void run() { if (billing != null && billing.isReady()) checkOwnedPurchases(); }
            });
        }

        /** The player collected a daily reward: from now on, remind them when the next one is ready (asks once). */
        @JavascriptInterface public void enableReminders() {
            runOnUiThread(new Runnable() { @Override public void run() { turnOnReminders(); } });
        }

        /** What a reminder says when it shows; kind is "daily" (the next day) or "back" (three days on). */
        @JavascriptInterface public void setReminderText(String kind, String title, String text) {
            if (title == null || text == null || title.isEmpty() || text.isEmpty()) return;
            int n = "daily".equals(kind) ? 1 : "back".equals(kind) ? 2 : 0;
            if (n == 0) return;
            prefs.edit()
                .putString(ReminderReceiver.TITLE + n, title.length() > 80 ? title.substring(0, 80) : title)
                .putString(ReminderReceiver.TEXT + n, text.length() > 300 ? text.substring(0, 300) : text)
                .apply();
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
            for (RewardedSlot s : rewarded.values()) loadRewarded(s);
        }))).start();
    }

    /** After a failed load: try again in 30 s, then 1, 2, 4 and at most 5 minutes (no-fill is common, and passes). */
    private void retryLater(int failures, Runnable load) {
        long delay = Math.min(300_000L, 30_000L << Math.min(4, Math.max(0, failures - 1)));
        main.postDelayed(load, delay);
    }

    // the large banner earns more; on a short phone it would squeeze the game, so the regular one there
    @SuppressWarnings("deprecation")   // the regular-size adaptive banner, still served; Google now prefers the large one
    private AdSize pickBannerSize() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int widthDp = (int) (dm.widthPixels / dm.density), heightDp = (int) (dm.heightPixels / dm.density);
        return heightDp >= 760 ? AdSize.getLargeAnchoredAdaptiveBannerAdSize(this, widthDp)
                               : AdSize.getPortraitAnchoredAdaptiveBannerAdSize(this, widthDp);
    }

    private int bannerSlotHeight() {
        if (adFree()) return 0;
        return bannerSize.getHeightInPixels(this) + Math.round(3 * getResources().getDisplayMetrics().density);
    }

    private void loadBanner() {
        if (adFree() || banner != null) return;
        banner = new AdView(this);
        banner.setAdUnitId(BuildConfig.BANNER_ID);
        banner.setAdSize(bannerSize);
        bannerSlot.addView(banner, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER_HORIZONTAL | Gravity.TOP));
        banner.loadAd(new AdRequest.Builder().build());   // the banner refreshes itself (set the rate in AdMob)
    }

    private void setBannerRoom() {
        ViewGroup.LayoutParams lp = bannerSlot.getLayoutParams();
        lp.height = bannerSlotHeight();
        bannerSlot.setLayoutParams(lp);
    }

    private void loadInterstitial() {
        if (adFree() || interstitial != null || loadingInterstitial) return;
        loadingInterstitial = true;
        InterstitialAd.load(this, BuildConfig.INTERSTITIAL_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) {
                loadingInterstitial = false; interstitialFailures = 0;
                interstitial = ad; interstitialLoadedAt = System.currentTimeMillis();
            }
            @Override public void onAdFailedToLoad(LoadAdError error) {
                loadingInterstitial = false;
                Log.w(TAG, "full-screen ad: " + error.getMessage());
                retryLater(++interstitialFailures, MainActivity.this::loadInterstitial);
            }
        });
    }

    private void showInterstitial() {
        long now = System.currentTimeMillis();
        InterstitialAd ad = interstitial;
        if (ad != null && now - interstitialLoadedAt > AD_MAX_AGE_MS) { interstitial = null; ad = null; }
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

    private void loadRewarded(final RewardedSlot slot) {
        if (slot.ad != null || slot.loading || !adsStarted.get()) return;
        slot.loading = true;
        RewardedAd.load(this, slot.unitId, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(RewardedAd ad) {
                slot.loading = false; slot.failures = 0;
                slot.loadedAt = System.currentTimeMillis(); slot.ad = ad;
            }
            @Override public void onAdFailedToLoad(LoadAdError error) {
                slot.loading = false;
                Log.w(TAG, "rewarded ad (" + slot.placement + "): " + error.getMessage());
                retryLater(++slot.failures, () -> loadRewarded(slot));
            }
        });
    }

    private void showRewarded(String placement) {
        final RewardedSlot slot = rewarded.get(placement);
        RewardedAd ad = slot == null ? null : slot.ad;
        if (ad == null || System.currentTimeMillis() - slot.loadedAt > AD_MAX_AGE_MS) {
            rewardedDone(false);
            if (slot != null) { slot.ad = null; loadRewarded(slot); }
            return;
        }
        slot.ad = null;
        lastFullscreenAt = System.currentTimeMillis();   // no full-screen ad right after this one
        final boolean[] earned = { false };
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { rewardedDone(earned[0]); loadRewarded(slot); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { rewardedDone(false); loadRewarded(slot); }
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
            if (value) {   // bought: the banner and the full-screen ads go away, and the game gets the room
                if (banner != null) { banner.destroy(); bannerSlot.removeAllViews(); banner = null; }
                interstitial = null;
            } else if (adsStarted.get()) {   // refunded: the banner and full-screen ads come back
                loadBanner();
                loadInterstitial();
            }
            setBannerRoom();
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
                loadProducts();
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

    /** Asks Google Play for the products (No Ads, the gem packs, the starter pack) and their prices. */
    private void loadProducts() {
        if (billing == null) return;
        List<QueryProductDetailsParams.Product> wanted = new ArrayList<>();
        List<String> ids = new ArrayList<>(CONSUMABLES);
        ids.add(NO_ADS_PRODUCT);
        for (String id : ids) {
            wanted.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        }
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(wanted).build(), (result, details) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
            for (ProductDetails p : details.getProductDetailsList()) products.put(p.getProductId(), p);
            noAdsProduct = products.get(NO_ADS_PRODUCT);
            tellGame("window.onAdFreeChanged && window.onAdFreeChanged()");   // the prices are known now
        });
    }

    private void launchNoAdsPurchase() { launchPurchase(NO_ADS_PRODUCT); }

    private void launchPurchase(String id) {
        ProductDetails p = products.get(id);
        if (p == null || billing == null) { loadProducts(); return; }
        BillingFlowParams.ProductDetailsParams.Builder item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(p);
        ProductDetails.OneTimePurchaseOfferDetails offer = p.getOneTimePurchaseOfferDetails();
        if (offer != null && offer.getOfferToken() != null) item.setOfferToken(offer.getOfferToken());
        billing.launchBillingFlow(this, BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(Collections.singletonList(item.build())).build());
    }

    /** Uses up a gem pack or starter pack purchase the game has given, so it can be bought again. */
    private void consume(String token) {
        if (billing == null || token == null || token.isEmpty()) return;
        billing.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(),
            (result, t) -> Log.i(TAG, "purchase used up: " + result.getResponseCode()));
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) handlePurchases(purchases, false);
        else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) checkOwnedPurchases();
    }

    /**
     * Completed purchases. "No Ads" is granted here and confirmed to Google Play (unconfirmed ones are
     * refunded after 3 days). A gem pack or the starter pack is handed to the game, which gives it once
     * (it remembers the purchase's token) and then asks for it to be used up; until then Google Play
     * keeps reporting it, so nothing paid for is lost if the app closes in between.
     */
    private void handlePurchases(List<Purchase> purchases, boolean fullList) {
        boolean owned = false;
        for (Purchase p : purchases) {
            if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
            if (p.getProducts().contains(NO_ADS_PRODUCT)) {
                owned = true;
                if (!p.isAcknowledged()) {
                    billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                        r -> Log.i(TAG, "purchase confirmed: " + r.getResponseCode()));
                }
                continue;
            }
            for (String id : p.getProducts()) {
                if (!CONSUMABLES.contains(id)) continue;
                tellGame("window.onPurchase && window.onPurchase(" + JSONObject.quote(id) + "," + JSONObject.quote(p.getPurchaseToken()) + ")");
            }
        }
        if (owned) setAdFree(true);
        else if (fullList) setAdFree(false);
    }

    // ---------- reminders ----------

    /**
     * Reminders are off until the player has collected a daily reward. Then, each time the game is left,
     * two are set: one for the next day, when the next daily reward is ready, and one three days on.
     * Coming back cancels them, so a player who plays every day never sees one. On Android 13 and up
     * the system asks first, once; on older Android the player can switch them off in Settings.
     */
    private void turnOnReminders() {
        prefs.edit().putBoolean("reminders", true).apply();
        if (Build.VERSION.SDK_INT >= 33 && !prefs.getBoolean("askedNotifications", false)
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            prefs.edit().putBoolean("askedNotifications", true).apply();
            requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 7);
        }
    }

    private PendingIntent reminderIntent(int kind) {
        Intent i = new Intent(this, ReminderReceiver.class).putExtra(ReminderReceiver.KIND, kind);
        return PendingIntent.getBroadcast(this, kind, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * When a reminder should show: about `hours` from now, but never on the day the game was left (the
     * daily reward is new each day, at midnight, so the reminder would be wrong) and only between 9 in
     * the morning and 9 at night; otherwise the next 9 in the morning.
     */
    static long reminderTime(long now, int hours) {
        Calendar left = Calendar.getInstance();
        left.setTimeInMillis(now);
        Calendar at = Calendar.getInstance();
        at.setTimeInMillis(now + hours * 3_600_000L);
        boolean sameDay = at.get(Calendar.YEAR) == left.get(Calendar.YEAR) && at.get(Calendar.DAY_OF_YEAR) == left.get(Calendar.DAY_OF_YEAR);
        int hour = at.get(Calendar.HOUR_OF_DAY);
        if (!sameDay && hour >= 9 && hour < 21) return at.getTimeInMillis();
        if (sameDay || hour >= 21) at.add(Calendar.DAY_OF_YEAR, 1);
        at.set(Calendar.HOUR_OF_DAY, 9);
        at.set(Calendar.MINUTE, 0);
        at.set(Calendar.SECOND, 0);
        at.set(Calendar.MILLISECOND, 0);
        return at.getTimeInMillis();
    }

    private void setReminders(boolean on) {
        try {
            AlarmManager alarms = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarms == null) return;
            long now = System.currentTimeMillis();
            for (int kind = 1; kind <= 2; kind++) {
                PendingIntent pi = reminderIntent(kind);
                alarms.cancel(pi);
                // about the time given, when the phone is next awake: no exact-alarm permission needed
                if (on) alarms.set(AlarmManager.RTC, reminderTime(now, kind == 1 ? 20 : 72), pi);
            }
            if (!on) {
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) nm.cancelAll();
            }
        } catch (RuntimeException e) {
            Log.w(TAG, "reminders: " + e.getMessage());
        }
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

    // Leaving the app pauses the page (the game saves as it goes)
    @Override
    protected void onPause() {
        if (banner != null) banner.pause();
        web.onPause();
        if (prefs.getBoolean("reminders", false)) setReminders(true);
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        if (banner != null) banner.resume();
        hideSystemBars();
        setReminders(false);
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
        main.removeCallbacksAndMessages(null);
        if (banner != null) banner.destroy();
        if (billing != null) billing.endConnection();
        web.destroy();
        super.onDestroy();
    }
}
