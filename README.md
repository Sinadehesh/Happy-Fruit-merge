# Happy Fruit Merge

A physics merge game (Suika-style) built with HTML5 Canvas + [Matter.js](https://brm.io/matter-js/), based on `development_plan.md`.

## How to play
- Tap/click the **Farm** board to drop a seed (costs 1 ✨ Fertilizer).
- Two identical items touching merge into the next one:
  Seed → Sprout → Strawberry → Tomato → Corn → Carrot → Cabbage → Pumpkin → Watermelon → Golden Apple → Giant Sun.
- The **Barn** works the same way with 🌿 Feed: Egg → Chick → Chicken → Piglet → Pig → Calf → Cow → Horse → Alpaca → Bull → Unicorn.
- Farm merges earn 🌾 Wheat, Barn merges earn 💩 Raw Fertilizer. Sell it, buy more Fertilizer, unlock higher tiers and new boards in the **Shop**.
- Deliver items to the **Town** folks for money and hearts.
- Don't let items stay above the red dashed line for 3 seconds.

## Run locally
Any static server works, e.g. `python3 -m http.server` and open http://localhost:8000.

## Assets
`assets/farm/` holds the 12 sprites cut from `assets/farm/source_sheet.webp`
(`00_seed_bag.png` is the logo; `01`–`11` are the farm tiers).
`assets/barn/` holds the animals cut from `assets/barn/source_sheet.webp`
(`00_feed_bush.png` is the Feed icon; `07_highland_calf.png` is a spare not used in the chain).

## Score
Every merge adds points (bigger items are worth more). Your best score is saved in the browser and shown next to the current score.

## Ads
`ads.js` shows an ad break every 25 drops (or at the next drop after 2 minutes) and again when you press **Play Again**. Physics is paused while it is on screen. Change `AD_EVERY_DROPS`, `AD_EVERY_MS` and `AD_CLOSE_DELAY_S` at the top of `ads.js`.

Until an ad network is connected it shows a placeholder ad. To show real ads on the web, sign up for Google AdSense, apply for [H5 Games Ads](https://developers.google.com/ad-placement), and add their snippet to `<head>` in `index.html`:

```html
<script async data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<script>
  window.adsbygoogle = window.adsbygoogle || [];
  var adBreak = adConfig = function(o) { adsbygoogle.push(o); };
</script>
```

`ads.js` detects `adBreak` and uses it automatically. For the Android/iOS build (Capacitor) the same `showInterstitial()` hook can call the AdMob plugin instead.
