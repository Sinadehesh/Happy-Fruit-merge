# Happy Fruit Merge

A simple physics drop-and-merge game (Suika-style) built with HTML5 Canvas + [Matter.js](https://brm.io/matter-js/), based on `development_plan.md`.

## Layout
Styled after Block Blast: your best score with a crown at the top left, the big current score in the middle (it counts up as you score), a gear at the top right for the settings panel (modes, car style, Reverse, Restart), the dark grid board, and the next item below it. The panel and buttons come from the UI sheet (`assets/ui/source_sheet.jpg`, cut with `tools/cut_boxes.py`, which now removes any plain background colour).

## Combos, effects and sound
- Every drop that leads to a merge keeps your combo going; two drops in a row without a merge break it (Block Blast rule). Combos multiply points (x1.2 per step, up to x3) and show "COMBO xN"; combos of 3, 5, 7, 10 and 15 show SWEET! YUMMY! JUICY! TASTY! DELICIOUS! (also when you make the biggest item).
- `fx.js` draws the merge bursts, rings, flying candy pieces, combo labels and praise words with the art in `assets/fx` (cut from the combo sheets).
- `sound.js` plays recorded sound effects (`assets/sfx`, all CC0: Kenney's Interface Sounds, plus OpenGameArt bubble and mouth pops; see `assets/sfx/CREDITS.txt`; prepared with `tools/prep_sound.py`) and real background songs by Kevin MacLeod (incompetech.com, CC BY 4.0, credited in the settings and `assets/music/CREDITS.txt`): Carefree, Easy Lemon, Wallpaper and Monkeys Spinning Monkeys. In the settings, Sound switches the effects on and off and Music steps through the songs and off.
- The narrator (`assets/voice`, made with ElevenLabs, prepared with `tools/prep_voice.py`) calls out the combo words, matching the word on screen: SWEET! (combo 3), JUICY! (5), DELICIOUS! (7), AMAZING! (10) and INCREDIBLE! (15 and every 5 after). He says CONGRATULATIONS! for the biggest item, "New high score!" when you beat your best and "Game over" when the jar fills. Each step up the ladder is a little warmer, louder and punchier, and the music dips while he talks. The AMAZING!, INCREDIBLE! and CONGRATULATIONS! word art is drawn by `tools/word_art.py` in the style of the other words.
- `haptics.js` vibrates the phone: a light tick when you pick up and drop a fruit and when it lands, a buzz on every merge (stronger for bigger items, with a second pulse from a 3-merge combo on), and longer patterns for praise words, the biggest item, a new best and game over. Android phones get the full patterns (`navigator.vibrate`). iPhones don't let websites vibrate; on iOS 18 or newer a hidden switch gives a single light tick instead. Vibration can be switched off in the settings.

## How to play
- Pick a mode in the settings (gear): **🍓 Fruit**, **🐷 Animals**, **🚗 Cars** or **🍬 Sweets** (or open `index.html?mode=fruit` / `?mode=animal` / `?mode=cars` / `?mode=sweets`). Rocks is now its own game, Gem Jar (below); old `?mode=rocks` links open it.
- Touch the box (or below it) and the item pops a little bigger and follows your finger, with a dashed line showing where it will fall. Let go to drop it. **Next** shows what comes after it.
- The game is saved as you play (one save per mode), so closing or reloading brings you back exactly where you were. Restart in the settings starts over.
- Two identical items touching merge into the next one:
  - Fruit: Seed → Sprout → Strawberry → Tomato → Corn → Carrot → Cabbage → Pumpkin → Watermelon → Golden Apple → Giant Sun
  - Animals: Egg → Chick → Chicken → Piglet → Pig → Calf → Cow → Horse → Alpaca → Bull → Unicorn
  - Rocks (12 levels, in Gem Jar): Pebble → Sandstone → Coal → Malachite → Rose Quartz → Amethyst Geode → Turquoise → Gold Nugget → Ruby → Opal → Star Sapphire → Diamond
  - Sweets (12 levels): Jelly Bean → Gummy Bear → Peppermint → Marshmallow → Macaron → Chocolate Truffle → Cupcake → Donut → Ice Cream → Caramel Pudding → Lollipop → Celebration Cake
  - Cars (12 levels, 3 art styles to pick from with 🎨 Original / Flat / Candy): Toyota Corolla → Fiat 500 → VW Bus → Jeep Wrangler → Ford Mustang → Toyota Supra → Nissan GT-R → Mercedes G-Class → Porsche 911 → Lamborghini Aventador → Ferrari LaFerrari → Bugatti Chiron
- Tap **Reverse** in the settings to flip the sizes: level 1 is the biggest and every merge makes a smaller item. Tap it again to go back. Reverse has its own best score.
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
python3 tools/make_shapes.py shapes.js assets/farm/[01]*.png assets/barn/[01]*.png assets/cars*/[01]*.png assets/rocks/[01]*.png assets/sweets/[01]*.png assets/crystal/[01]*.png
```

# Gem Jar (`/gems/`)

The Rocks set as its own game: drop gems in the jar, merge two of a kind into a better one, and make the diamond before the jar fills up. Working store title: **Gem Jar: Jewel Merge Puzzle**.

- Same engine, art, sounds, vibration and saving as Happy Fruit Merge. `config.js` says which game a page is: `gems/index.html` sets `window.GAME_SETUP` (fixed `rocks` item set, its own save slot `gemJar.*`, combo words SWEET! at 3, AMAZING! at 6 and INCREDIBLE! at 10, then every 5).
- Its own amethyst colours, and Settings only has Reverse, Sound, Music, Vibration and Restart.
- **Daily Challenge** (top bar, star button; a red dot until today's is done): one special game a day with the same drops and the same goal for everyone that day, both picked from the date. Goals are things like "Make a Ruby", "Make 2 Amethyst Geodes", "Score 4,000" or "Get a 6x combo". Finishing it the first time that day gives 1 Zap (3 on every 7th day in a row) and keeps a streak. It has its own save and best score, can be replayed, and the X in the top bar goes back to the main game, which is kept as it was.
- **Zap booster** (the lightning bolt by NEXT, with how many you have): tap it, then tap any gem, and lightning strikes it away. You start with 2 and earn more from the Daily Challenge; in the Android app, when you have none, the badge says AD and watching a rewarded ad gives one.
- Both are switched on by `daily: true` and `boosters: true` in the gem page's `GAME_SETUP`, so Happy Fruit Merge could have them too.
- **Gem sets** (Settings > Gems): the same game with another look, set in the gem page's `GAME_SETUP.skins`, opening in order. Rocks & Gems is always open. Each next set opens by making the gems in `GAME_SETUP.unlocks`, counted from when the set before it opened (every game counts, daily ones too). Locked sets show their 12 gems greyed out and, instead of words, pictures of the gems to make with counts; the game-over panel shows the same for the next set. A simulated 22 hours of play made about 49 Gold Nuggets, 13 Rubies and 1 Opal an hour, so the sets ask for 40 Gold Nuggets and 12 Rubies (about 1 hour), then 25 Rubies and 2 Opals (about 2 hours), 50 and 4 (4 hours), 100 and 8 (8 hours) and 200 and 16 (16 hours). **Crystal Cave** (`assets/crystal`, mode `crystal`) is the first. Picking a set reloads the page and the game in progress goes on with the new look. Prompts for 4 more sets (Ocean Jewels, Royal Treasury, Cosmic Gems, Volcano Gems) are in `ASSET_PROMPTS.md`; each new set is added to `MODES` in `game.js`, to `skins` in `tools/make_gems_page.py` and to `GEM_SETS` in `tools/build_gem_android.py`.
- Cutting tools for gem art: `tools/cut_light.py` (pale or clear items, whose light outline lets the background leak in) and `tools/cut_glow.py` (a saturated item with a baked-in glow: solid body, see-through halo, cropped so the body fills the sprite).
- The best score and game in progress from the old Rocks mode are carried over the first time it opens.
- `gems/index.html` is built from `index.html` by `python3 tools/make_gems_page.py`; run it again after changing `index.html`.

## Gem Jar for Android

- **Google Play:** upload `gems/GemJar.aab` (App Bundle, https://sinadehesh.github.io/Happy-Fruit-merge/gems/GemJar.aab).
- **Install directly:** `gems/GemJar.apk` (https://sinadehesh.github.io/Happy-Fruit-merge/gems/GemJar.apk).
- The files there are version 1.0 (code 1), with no ads. Version 1.1 (code 2), with ads and the No Ads purchase, is built once the AdMob IDs are in `android/gemjar/admob.properties`.
- Package `com.sinadehesh.gemjar`, Android 7 and up, targeting Android 16 (API 36) as Google Play requires for new apps and updates.
- **Privacy policy** (for the Play listing and AdMob): `gems/privacy.html` (https://sinadehesh.github.io/Happy-Fruit-merge/gems/privacy.html).

### How the app makes money

- **Banner** under the game: the large adaptive banner on tall phones, the regular one on short phones so the jar stays big.
- **Full-screen ad between games** (on Play Again), at most one a minute, never in the middle of a game.
- **Keep Going:** when the jar fills up, the player can choose to watch a rewarded ad to clear the top of the jar and carry on with the same game and score, once a game.
- **No Ads** ($5.99, a one-time Google Play purchase, product ID `remove_ads`): switches the banner and full-screen ads off for good and comes back on a new phone or after reinstalling. Keep Going stays on offer, since the player chooses to watch it. The price is set in Play Console (Monetize, Products, In-app products); the button shows Google Play's price in the player's currency.
- **Consent:** Google's consent message (UMP) is shown where the law asks for it (EU, UK, some US states). Settings then has a Privacy button to change the choice.
- The game is fair: difficulty never depends on ads or on the player.
- On the website none of this applies: the web page keeps its placeholder ad breaks.

### Building

- `python3 tools/build_gem_android.py <version name> <version code>` packs the gem page and only the files it uses (plus Matter.js and the Poppins font, so it plays offline), makes the launcher icons from the diamond, then builds and signs with Gradle (`android/gradlew`, Gradle 9.8.2, Android Gradle plugin 9.5.0; Google Mobile Ads 25.5.0, User Messaging Platform 4.0.0, Play Billing 9.1.0). It installs the Android SDK pieces it needs the first time.
- **AdMob IDs:** `android/gemjar/admob.properties` (app ID, and the banner, interstitial and rewarded ad units). While it is empty, Google's test ads are used and only a `GemJar-<version>-TEST-ADS.apk` is made, never a Play bundle.
- **Signing:** set `GEMJAR_KEYSTORE` and `GEMJAR_KEYSTORE_PASS`. The keystore is kept out of the repo (`.gitignore`). On Google Play it is the upload key; every update must be signed with it and have a higher version code.
- Android source: `android/gemjar` (manifest, theme, `MainActivity.java`: the game window, ads, consent and billing). The game talks to it through `window.AndroidApp` (see `ads.js`).

# Zombie Bomber (`/bomber/`)
A second game built on the same drop-and-merge engine: https://sinadehesh.github.io/Happy-Fruit-merge/bomber/

**300 levels.** Switch between two modes any time with the **MERGE | BOMB** buttons:
- **Merge**: tap the bomb bay to drop bombs. Two of the same merge into a bigger bomb (Firecracker → Cherry Bomb → Grenade → Dynamite → TNT Barrel → Cluster Bomb → Aerial Bomb → Napalm → Bunker Buster → Thermobaric → Mega Nuke → Black Hole). If the bay overflows it switches to Bomb for you.
- **Bomb**: tap a bomb in the bay and the plane drops it. Bigger bombs have a much bigger blast. The red marker on the ground shows where a bomb would land right now. When the bay is empty it switches back to Merge.

Zombies walk toward your base the whole time and soldiers on the base shoot at them. Only the number, speed and crowding of zombies grow with the level. There are 12 zombie types: Walker, Runner, Brute and the Zombie King (every 5 levels) show up in the first 10 levels; after that a new type is discovered every 20 levels (Trooper 20, Sprinter 40, Bloater 60, Screamer 80, Hulk 100, Ghoul 120, Juggernaut 140, Titan 160).

**Upgrade shop.** Zombies drop coins. After each level the shop shows 4 upgrades: Soldiers (more soldiers, each level a new look), Weapons (damage and fire rate), Base (more HP) and Bombs (bigger bombs to drop, bigger blasts). Prices go up with each level. Your level, coins and upgrades are saved in the browser; losing retries the same level and keeps the coins.

Art lives in `assets/bomber/`: bombs, all 12 zombies (`zombies/` for the first 4, `zombies2/` for the 8 later ones), soldier bullets, UI icons and buttons, the plane and two backgrounds (the 🌆 button switches between them and the original drawn one). Soldiers (8 looks, each with its own projectile and muzzle flash from `assets/bomber/shots`) and the base (4 stages) follow the shop upgrades. Anything that can't load is drawn in code instead. Sheets are cut with `tools/cut_flood.py` (whole sheets; also removes enclosed gaps like between legs or inside windows; `native` keeps relative sizes) and `tools/cut_boxes.py` (named boxes). Bomb hitboxes are their sprite outlines (`bomber/shapes.js`, from `tools/make_shapes.py`); `tools/soft_glow.py` re-cuts glowing items like the Black Hole bomb with a soft halo. Asset prompts are in `bomber/ASSET_PROMPTS.md`.
