# Happy Fruit Merge

A simple physics drop-and-merge game (Suika-style) built with HTML5 Canvas + [Matter.js](https://brm.io/matter-js/), based on `development_plan.md`.

## How to play
- Pick a mode at the top: **🍓 Fruit** or **🐷 Animals** (or open `index.html?mode=fruit` / `?mode=animal`).
- Tap/click the box to drop the item shown at the top. **Next** shows what comes after it.
- Two identical items touching merge into the next one:
  - Fruit: Seed → Sprout → Strawberry → Tomato → Corn → Carrot → Cabbage → Pumpkin → Watermelon → Golden Apple → Giant Sun
  - Animals: Egg → Chick → Chicken → Piglet → Pig → Calf → Cow → Horse → Alpaca → Bull → Unicorn
- Items only merge after they land, so dropping fast doesn't merge things at the top.
- If items stay above the red dashed line for 3 seconds the box is full and it's game over.

## Run locally
Any static server works, e.g. `python3 -m http.server` and open http://localhost:8000.

## Assets
`assets/farm/` holds the 12 sprites cut from `assets/farm/source_sheet.webp`
(`00_seed_bag.png` is the logo; `01`–`11` are the farm tiers).
`assets/barn/` holds the animals cut from `assets/barn/source_sheet.webp`
(`00_feed_bush.png` and `07_highland_calf.png` are spares not used in the game).

## Score
Every merge adds points (bigger items are worth more). Your best score is saved in the browser (separately for each mode) and shown next to the current score.

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
