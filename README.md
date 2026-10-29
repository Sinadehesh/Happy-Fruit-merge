# Happy Fruit Merge

A simple physics drop-and-merge game (Suika-style) built with HTML5 Canvas + [Matter.js](https://brm.io/matter-js/), based on `development_plan.md`.

## How to play
- Pick a mode at the top: **🍓 Fruit**, **🐷 Animals**, **🚗 Cars** or **⛏️ Rocks** (or open `index.html?mode=fruit` / `?mode=animal` / `?mode=cars` / `?mode=rocks`).
- Tap/click the box to drop the item shown at the top. **Next** shows what comes after it.
- Two identical items touching merge into the next one:
  - Fruit: Seed → Sprout → Strawberry → Tomato → Corn → Carrot → Cabbage → Pumpkin → Watermelon → Golden Apple → Giant Sun
  - Animals: Egg → Chick → Chicken → Piglet → Pig → Calf → Cow → Horse → Alpaca → Bull → Unicorn
  - Rocks (12 levels): Pebble → Sandstone → Coal → Malachite → Rose Quartz → Amethyst Geode → Turquoise → Gold Nugget → Ruby → Opal → Star Sapphire → Diamond
  - Cars (12 levels, 3 art styles to pick from with 🎨 Original / Flat / Candy): Toyota Corolla → Fiat 500 → VW Bus → Jeep Wrangler → Ford Mustang → Toyota Supra → Nissan GT-R → Mercedes G-Class → Porsche 911 → Lamborghini Aventador → Ferrari LaFerrari → Bugatti Chiron
- Tap **↕️ Reverse** to flip the sizes: level 1 is the biggest and every merge makes a smaller item. Tap it again to go back. Reverse has its own best score.
- Items only merge after they land, so dropping fast doesn't merge things at the top.
- Items may touch or cross the red dashed line. If an item has landed completely above it for 3 seconds, the box is full and it's game over.

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

## Hitboxes
Each item's hitbox is its sprite's own outline (in `shapes.js`), so items rest against each other where the art touches instead of overlapping. If you change or add sprites, regenerate it with:

```
python3 tools/make_shapes.py shapes.js assets/farm/[01]*.png assets/barn/[01]*.png assets/cars*/[01]*.png assets/rocks/[01]*.png
```
