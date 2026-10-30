# Happy Fruit Merge

A simple physics drop-and-merge game (Suika-style) built with HTML5 Canvas + [Matter.js](https://brm.io/matter-js/), based on `development_plan.md`.

## How to play
- Pick a mode at the top: **🍓 Fruit**, **🐷 Animals**, **🚗 Cars**, **⛏️ Rocks** or **🍬 Sweets** (or open `index.html?mode=fruit` / `?mode=animal` / `?mode=cars` / `?mode=rocks` / `?mode=sweets`).
- Tap/click the box to drop the item shown at the top. **Next** shows what comes after it.
- Two identical items touching merge into the next one:
  - Fruit: Seed → Sprout → Strawberry → Tomato → Corn → Carrot → Cabbage → Pumpkin → Watermelon → Golden Apple → Giant Sun
  - Animals: Egg → Chick → Chicken → Piglet → Pig → Calf → Cow → Horse → Alpaca → Bull → Unicorn
  - Rocks (12 levels): Pebble → Sandstone → Coal → Malachite → Rose Quartz → Amethyst Geode → Turquoise → Gold Nugget → Ruby → Opal → Star Sapphire → Diamond
  - Sweets (12 levels): Jelly Bean → Gummy Bear → Peppermint → Marshmallow → Macaron → Chocolate Truffle → Cupcake → Donut → Ice Cream → Caramel Pudding → Lollipop → Celebration Cake
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
python3 tools/make_shapes.py shapes.js assets/farm/[01]*.png assets/barn/[01]*.png assets/cars*/[01]*.png assets/rocks/[01]*.png assets/sweets/[01]*.png
```

# Zombie Bomber (`/bomber/`)
A second game built on the same drop-and-merge engine: https://sinadehesh.github.io/Happy-Fruit-merge/bomber/

**300 levels.** Each level alternates two phases until the horde is gone:
1. **Merge** (15–18 seconds): tap the bomb bay to drop bombs. Two of the same merge into a bigger bomb (Firecracker → Cherry Bomb → Grenade → Dynamite → TNT Barrel → Cluster Bomb → Aerial Bomb → Napalm → Bunker Buster → Thermobaric → Mega Nuke → Black Hole). If the bay overflows, the phase ends early.
2. **Bombs away**: tap a bomb in the bay and the plane drops it. Bigger bombs have a much bigger blast. The red marker on the ground shows where a bomb would land right now.

Zombies walk toward your base the whole time and soldiers on the base shoot at them. Only the number, speed and crowding of zombies grow with the level. There are 12 zombie types: Walker, Runner, Brute and the Zombie King (every 5 levels) show up in the first 10 levels; after that a new type is discovered every 20 levels (Trooper 20, Sprinter 40, Bloater 60, Screamer 80, Hulk 100, Ghoul 120, Juggernaut 140, Titan 160).

**Armory.** Zombies drop loot. After each level the loot goes into the Armory, a second merge box (Bolt → Gear → Battery → Ammo → Toolbox → Medkit → Helmet → Gold Bar → Medal → Trophy). The first time you make each loot level you unlock a permanent upgrade: more soldiers, more base HP, faster and stronger soldiers, bigger bomb drops, bigger blasts. Your level, armory and loot are saved in the browser; losing retries the same level and keeps the loot.

Art lives in `assets/bomber/`: bombs, all 12 zombies (`zombies/` for the first 4, `zombies2/` for the 8 later ones), soldier bullets, UI icons and buttons, the plane and two backgrounds (the 🌆 button switches between them and the original drawn one). Anything without art yet (soldiers, base, loot) is drawn in code, and so is any image that can't load. Sheets are cut with `tools/cut_flood.py` (whole sheets) and `tools/cut_boxes.py` (named boxes). Bomb hitboxes are their sprite outlines (`bomber/shapes.js`, from `tools/make_shapes.py`); `tools/soft_glow.py` re-cuts glowing items like the Black Hole bomb with a soft halo. Asset prompts are in `bomber/ASSET_PROMPTS.md`.
