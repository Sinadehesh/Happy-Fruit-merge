# Happy Fruit Merge

A simple physics drop-and-merge game (Suika-style) built with HTML5 Canvas + [Matter.js](https://brm.io/matter-js/), based on `development_plan.md`.

## Layout
Styled after Block Blast: your best score with a crown at the top left, the big current score in the middle (it counts up as you score), a gear at the top right for the settings panel (modes, car style, Reverse, Restart), the dark grid board, and the next item below it. The panel and buttons come from the UI sheet (`assets/ui/source_sheet.jpg`, cut with `tools/cut_boxes.py`, which now removes any plain background colour).

## Combos, effects and sound
- Every drop that leads to a merge keeps your combo going; two drops in a row without a merge break it (Block Blast rule). Combos multiply points (x1.2 per step, up to x3) and show "COMBO xN"; combos of 3, 5, 7, 10 and 15 show SWEET! YUMMY! JUICY! TASTY! DELICIOUS! (also when you make the biggest item).
- `fx.js` draws the merge bursts, rings, flying candy pieces, combo labels and praise words with the art in `assets/fx` (cut from the combo sheets).
- `sound.js` plays recorded sound effects (`assets/sfx`, all CC0: Kenney's Interface Sounds, plus OpenGameArt bubble and mouth pops; see `assets/sfx/CREDITS.txt`; prepared with `tools/prep_sound.py`) and real background songs by Kevin MacLeod (incompetech.com, CC BY 4.0, credited in the settings and `assets/music/CREDITS.txt`): Carefree, Easy Lemon, Wallpaper and Monkeys Spinning Monkeys. In the settings, Sound switches the effects on and off and Music steps through the songs and off.
- The narrator (`assets/voice`, made with ElevenLabs, prepared with `tools/prep_voice.py`) calls out the combo words, matching the word on screen: SWEET! (combo 3), JUICY! (5), DELICIOUS! (7), AMAZING! (10) and INCREDIBLE! (15 and every 5 after). He says CONGRATULATIONS! for the biggest item, "New high score!" when you beat your best and "Game over" when the jar fills. Each step up the ladder is a little warmer, louder and punchier, and the music dips while he talks. The AMAZING!, INCREDIBLE! and CONGRATULATIONS! word art is drawn by `tools/word_art.py` in the style of the other words. He speaks a quarter less than the game asks: every 4th combo word or "Game over" stays silent (the word still shows), and the **Voice** switch in the settings turns him off completely.
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
- **Gem sets** (Settings > Gems): the same game with another look, set in the gem page's `GAME_SETUP.skins`, opening in order. Rocks & Gems is always open. Each next set opens by making the gems in `GAME_SETUP.unlocks`, counted from when the set before it opened (every game counts, daily ones too). Locked sets show their 12 gems greyed out and, instead of words, pictures of the gems to make with counts; the game-over panel shows the same for the next set. A simulated 22 hours of play made about 49 Gold Nuggets, 13 Rubies and 1 Opal an hour, so the sets ask for 40 Gold Nuggets and 12 Rubies (about 1 hour), then 25 Rubies and 2 Opals (about 2 hours), 50 and 4 (4 hours), 100 and 8 (8 hours) and 200 and 16 (16 hours). The sets that open by making gems, in order: **Crystal Cave** (`assets/crystal`), **Ocean Jewels** (`assets/ocean`), **Royal Treasury** (`assets/royal`), **Cosmic Gems** (`assets/cosmic`) and **Volcano Gems** (`assets/volcano`). Five more open with stars in the Gem Mine (`mineStars` in the gem page's `GAME_SETUP.skins`, 60 stars in all for now): **Pixel Treasure** at 18 (about half the stages), **Odd Shapes** at 30, **Cyber Circuit** at 40, **Neon Nights** at 48 and **Gem Pets** at 55 (nearly every stage with 3 stars). Their cards show the pickaxe and the stars so far, the Gem Mine map says which set opens next, and the stage win that reaches a set shows it on the panel. Picking a set reloads the page and the game in progress goes on with the new look. All the gems are cut by `python3 tools/cut_sets.py`, which lists where each set's gems come from (its sheet, kept in the set's folder, and the gems made again in `assets/fixes`) and cuts them cleanly with `tools/gemcut.py`: the background is all the white the outside can reach (so the white in notches, between parts and in every step of pixel art goes too, along with faint pencil lines and the light pockets they wall off), the edge pixels are un-mixed from that white, so nothing white or pale is left around a gem on the dark jar, a white highlight line that touches the edge stays part of the gem, and glowing gems get a see-through halo. Gems drawn inside a dark outline all round with light marks outside it (all of Pixel Treasure, two others) are cut to their outline (`outline` in the set's entry). A new set is added there, to `MODES` in `game.js`, to `skins` in `tools/make_gems_page.py`, to `GEM_SETS` in `tools/build_gem_android.py`, and to the hitboxes with `tools/make_shapes.py` (the command is at the top of that file).
- Cutting tools for gem art: `tools/cut_light.py` (pale or clear items, whose light outline lets the background leak in) and `tools/cut_glow.py` (a saturated item with a baked-in glow: solid body, see-through halo, cropped so the body fills the sprite).
- The best score and game in progress from the old Rocks mode are carried over the first time it opens.
- `gems/index.html` is built from `index.html` by `python3 tools/make_gems_page.py`; run it again after changing `index.html`.

### Levels, quests, Gem Rush, the home menu and the tutorial (`meta.js`)

Switched on by `meta: true`, `menu: true` and `rush: true` in the gem page's `GAME_SETUP`.

- **200 levels.** 1 XP per point scored, plus bonuses (Daily Challenge 10,000, quests 3,000 to 20,000, Gem Rush stars). Measured play scores about 250,000 points an hour, and the curve (`xpFor`) puts Level 2 in the first game, Level 10 at about an hour, Level 50 at about 22 hours and Level 200 at about 300. The level and its XP bar are in the top bar (tap it for the home menu); the bar glows when the next level is close.
- **Level rewards:** 1 Zap a level (2 every 5th, 3 every 10th), a Star every 10th once the Star booster is open, a 1 in 4 chance of a lucky bonus Zap, and a new title every 10 levels (Pebble Picker, Rock Hound, Stone Polisher … Gem Grandmaster, Gem Legend at 200). A level up shows LEVEL UP! in the game; after the game a card lists the rewards, and in the app a rewarded ad can double them.
- **Opens with levels:** Daily Challenge, Gem Mine and Daily Gift (Level 2), Quests and Lucky Wheel (3), Gem Rush (4), Undo booster (5), Star booster (6), and jar colours: Ocean 5, Mint 8, Sunset 12, Rose 16, Midnight 22, Gold 30, Aurora 40, Candy 55, Cosmos 75, Lava 100, Royal 140, Diamond 200.
- **Opens with challenges:** Ember colours (3 stars in a Gem Rush), Frost (the Daily Challenge 7 days in a row), Lagoon (25 quests), and the gem sets (by making gems, above).
- **Quests:** three at a time (easy, medium, hard), new ones every 8 hours with a countdown: make gems (shown as pictures), score in one game or in all, combos, games played, Gem Rush stars. Targets come from measured play (easy about 10 minutes, hard about an hour). Rewards are Zaps, Stars and XP; finished ones left unclaimed still pay out when the quests change. In the app a rewarded ad can double a reward or swap a quest once.
- **Gem Rush:** 90 seconds from an empty jar; the clock starts with the first touch and ticks for the last 10 seconds. Stars at 8,000 / 11,500 / 14,000 points (from 300 measured runs), each with XP and boosters. In the app a rewarded ad gives 15 more seconds, once a run. Its own best score; not saved.
- **Star booster** (left of NEXT): tap it, then a gem, and the gem becomes the next level. Lifted gems don't count toward gem sets or the Daily Challenge.
- **Undo booster** (beside the Star, `game.js`): takes back the last drop. The jar, the score and the gem in hand go back to the moment before it (in the Daily Challenge the same drops come again); what the drop already earned in XP, quests and gem sets stays. You start with one; more come from the Lucky Wheel and the Daily Gift, and in the app an ad gives one when you are out. Not in Gem Rush or the Gem Mine.
- **Daily Gift** (`bonus.js`; the gift beside Play, and it opens by itself once a day on the menu): seven days shown up front, a bigger gift each day in a row (Zaps, XP, a Star, an Undo; Day 7 is 3 Zaps, 2 Stars and 20,000 XP), then round again. Missing a day starts it at Day 1. In the app an ad doubles the gift, and after one missed day an ad keeps the place.
- **Lucky Wheel** (`bonus.js`; the wheel beside Play): eight slices of the same size, and a spin picks one with the same chance, one in eight (the test picks 80,000 times: 12.5% each). Zaps, XP, a Star, an Undo, and 20,000 XP as the big one. One free spin a day; in the app up to 5 more a day, each for an ad the player chooses. The prize is given when the spin starts, so closing the app can't lose it.
- **2x XP** (app only, `meta.js`): an ad the player chooses doubles all XP for 10 minutes. Offered on the menu (beside the gear, where the time left then shows) and after a game when no other ad is offered there; a badge on the level chip counts down while it runs.
- After a game the panel says when the Daily Gift or the free spin is waiting.
- **Home menu** (first screen when the game opens, and Home in the settings and after a game): level, title and XP, the GEM JAR logo, the best score, a big Play button and tiles for Daily, Gem Rush, Quests and the Collection, with red dots for something new, slowly floating gems, and what opens next. The layout follows the golden ratio: logo and actions split 38.2 / 61.8, Play is 61.8% wide, tiles are 1.618 wide for 1 tall, spacing and type step through 8, 13, 21, 34, 55.
- **Tutorial** on the first game: hold to pick up, slide and let go, drop on its twin to merge, combos, the line. It can be skipped.
- **Engagement, kept fair:** endowed progress and early wins, a goal gradient (the bar and "XP to Level n"), features opening one at a time, a variable lucky bonus, unfinished quests and the next gem set in view, the peak-end rule (each game ends on XP gained and the best gem made), streaks and time windows. Timers are real, nothing is rigged, rewards are what they say, and the ads are the ones the player chooses plus the full-screen ad between games (at most once a minute).

### Gem Mine: stages (`mine.js`)

Switched on by `mine: true` in the gem page's `GAME_SETUP`; opens at Level 2. A trial of 20 stages, with crates and jar shapes.

- **A stage** (`?mine=N`) is a goal, a number of drops and a starting jar. Goals: make gems (shown as pictures), break crates, or score; all of a stage's goals must be met. The top bar shows the stage, the goals with counts, the drops left and the stars still possible; the tray shows the next gem and the one after it.
- **Crates** are fixed in place. A merge touching a crate, or happening close to it (bigger merges reach further), breaks it; a strong crate (metal corners) cracks on the first merge and breaks on the second. The Zap breaks a crate too. Gems land on crates and beams like on the floor.
- **Jar shapes:** a shelf, two shelves, pegs, a divider, a slope, a funnel, a bowl (beams and pegs in `JARS`). Some stages start with gems already in the jar (stage 7: break the crates and two geodes roll together). Gems made from those don't count toward gem sets or quests, so stages can't be farmed for them.
- **Fair:** every try of a stage drops the same gems in the same order, and nothing changes with how a player is doing.
- **Stars:** 1 for clearing a stage, 2 and 3 for clearing it with drops to spare. Each new star gives 1,000 XP. Stage 10 (strong crates) gives 2 Zaps the first time; stage 20, the boss, gives 3 Zaps, a Star and the **Copper** jar colour.
- **Drops and star lines are measured, not guessed:** `tools/calibrate_mine.js` lets a bot play every stage 80 times fast-forward (a drop every 1.5 to 2.5 seconds, onto the best matching gem or the lowest spot near a crate, no boosters) and sets the drops so the bot wins a target share of its tries: about 97% on stage 1, a saw shape after (harder up to each boss, easier after it), about 60% on stage 10 and 50% on the boss, plus 3 spare drops on stages 1 to 5 and 2 after for people still learning. `VERIFY=1` replays with the real drops: 93 to 100% wins on most stages, 63% on stage 16, 72% on 19, 48% on the boss.
- **The map** (the Gem Mine tile on the home menu) goes down into the mine: the entrance at the top, stages along a trail, a wooden frame and depth sign every 5 stages (10 m a stage), a crowned button for each boss, stars under each cleared stage, the current one glowing. Tapping a stage shows its card: goals, drops, jar shape, tip, first-clear rewards, Play.
- **End of a try:** STAGE CLEAR! with stars, XP and rewards, then Next or the Map; or OUT OF DROPS (or the jar is full) with how close the goals were, then Retry or the Map.
- **In the app:** out of drops, a rewarded ad for 5 more drops, once a try; before a boss, a rewarded ad for a free Zap; the full-screen ad between stages from stage 4 on (at most once a minute, never during a stage). The jar filling up offers Keep Going as in the main game.
- **Art:** the crates, splinters, stage buttons, pickaxe icon, lanterns, the map background, the mine entrance, the plank (shelves, posts and slopes), the peg and the signpost at the bottom of the map are cut from the sheets in `assets/mine/source/` and `assets/fixes/` by `tools/cut_mine_art.py`, with the clean cut. The map background and the plank are made to repeat without a seam: the two ends are joined along the line where they match best. The prompts, with template sheets in `assets/mine/sheets/`, are in `ASSET_PROMPTS.md`. The crate sounds are CC0 (see `assets/sfx/CREDITS.txt`).

## Gem Jar for Android

- **Google Play:** upload `gems/GemJar.aab` (App Bundle, https://sinadehesh.github.io/Happy-Fruit-merge/gems/GemJar.aab).
- **Install directly:** `gems/GemJar.apk` (https://sinadehesh.github.io/Happy-Fruit-merge/gems/GemJar.apk).
- The files there are version 1.2 (code 3): real AdMob ads (the app and its three ad units, a banner, an interstitial and a rewarded ad, are in `android/gemjar/admob.properties`) and the No Ads purchase (product `remove_ads`, made in Play Console after the first upload).
- **Test build:** `gems/GemJar-test.apk` (https://sinadehesh.github.io/Happy-Fruit-merge/gems/GemJar-test.apk) is the same 1.1 with Google's test ads (marked "Test Ad"), for trying the ads on your own phone without touching real ones; it is never uploaded to Google Play.
- Package `com.sinadehesh.gemjar`, Android 7 and up, targeting Android 16 (API 36) as Google Play requires for new apps and updates.
- **Store listing** (name, short and full description, within Play's limits): `android/store/listing.md`. The 8 phone screenshots (1080 x 1920) are in `android/store/screenshots/`, made by `python3 tools/make_store_screens.py <TitanOne.ttf>` from real screens of the game that `tools/store_capture.js` takes (`android/store/captures/`): a headline, the screen, and gems from the sets around it. The game's web page is https://www.sinadehesh.com/apps/gemjar/ (`site/apps/gemjar/` in the Flora repository).
- **Feature graphic** for the Play listing (1024 x 500): `android/store/feature_graphic.png`, made by `python3 tools/make_feature_graphic.py` from the jar picture in `assets/fixes` and the GEM JAR logo. The app icon for the listing is `android/store/icon_512.png`.
- **Privacy policy** (for the Play listing and AdMob): https://www.sinadehesh.com/gemjar/privacy/ (the sinadehesh.com website, `site/gemjar/privacy/` in the Flora repository), with the same text at `gems/privacy.html`.
- **app-ads.txt** (AdMob's check that the ads are yours): https://www.sinadehesh.com/app-ads.txt (`site/app-ads.txt` in the Flora repository). AdMob reads it from the plain domain, sinadehesh.com (the portfolio site on Cloudflare), so that address has to serve it or redirect to it; the Play listing's website is https://www.sinadehesh.com.

### How the app makes money

- **Banner** under the game: the large adaptive banner on tall phones, the regular one on short phones so the jar stays big.
- **Full-screen ad between games** (on Play Again), at most one a minute, never in the middle of a game.
- **Keep Going:** when the jar fills up, the player can choose to watch a rewarded ad to clear the top of the jar and carry on with the same game and score, twice a game at most (the second is marked as the last chance).
- **More ads the player chooses** (all rewarded, never forced): a booster (Zap, Star or Undo) when out of them, 15 more seconds in Gem Rush, 5 more drops and a Zap before a boss in the Gem Mine, doubling a level-up's or a quest's rewards, swapping a quest, up to 5 extra spins of the Lucky Wheel a day, doubling the Daily Gift or keeping its streak after one missed day, and 2x XP for 10 minutes. One ad offer at a time on the game-over panel.
- **No Ads** ($5.99, a one-time Google Play purchase, product ID `remove_ads`): switches the banner and full-screen ads off for good and comes back on a new phone or after reinstalling. Keep Going stays on offer, since the player chooses to watch it. The price is set in Play Console (Monetize, Products, In-app products); the button shows Google Play's price in the player's currency.
- **Consent:** Google's consent message (UMP) is shown where the law asks for it (EU, UK, some US states). Settings then has a Privacy button to change the choice.
- The game is fair: difficulty never depends on ads or on the player.
- On the website none of this applies: the web page keeps its placeholder ad breaks (between games at most once a minute, like the app).

### Building

- `python3 tools/build_gem_android.py <version name> <version code>` packs the gem page and only the files it uses (plus Matter.js and the Poppins font, so it plays offline), makes the launcher icons from the diamond, then builds and signs with Gradle (`android/gradlew`, Gradle 9.8.2, Android Gradle plugin 9.5.0; Google Mobile Ads 25.5.0, User Messaging Platform 4.0.0, Play Billing 9.1.0). It installs the Android SDK pieces it needs the first time.
- **AdMob IDs:** `android/gemjar/admob.properties` (app ID, and the banner, interstitial and rewarded ad units). While it is empty, Google's test ads are used and only a `GemJar-<version>-TEST-ADS.apk` is made, never a Play bundle.
- **Signing:** set `GEMJAR_KEYSTORE` and `GEMJAR_KEYSTORE_PASS`. The keystore is kept out of the repo (`.gitignore`). On Google Play it is the upload key; every update must be signed with it and have a higher version code.
- Android source: `android/gemjar` (manifest, theme, `MainActivity.java`: the game window, ads, consent and billing). The game talks to it through `window.AndroidApp` (see `ads.js`).

# Zombie Bomber (`/bomber/`)
A second game built on the same drop-and-merge engine: https://sinadehesh.github.io/Happy-Fruit-merge/bomber/

**300 levels.** Zombies walk down the road at your base and you blow them up:
- **Tap the bomb bay** to drop a bomb in. Two of the same merge into a bigger bomb (Firecracker → Cherry Bomb → Grenade → Dynamite → TNT Barrel → Cluster Bomb → Aerial Bomb → Napalm → Bunker Buster → Thermobaric → Mega Nuke → Black Hole). Merges in quick succession are combos. If the bay fills past the striped line, the dropper jams until you throw some bombs out.
- **Drag any bomb up out of the bay** onto the battlefield and let go: it's lobbed right there and blows up. While you hold it, a ring on the ground shows the blast and a counter shows how many zombies it would kill. Bigger bombs blast wider and harder, and blowing up several zombies at once (DOUBLE KILL … MONSTER KILL) pays bonus coins.
- **The big bombs have tricks**: the Cluster Bomb splits into 5 bomblets, Napalm leaves a wall of fire, the Bunker Buster digs in and erupts, the Thermobaric goes off twice, the Mega Nuke makes a mushroom cloud and the Black Hole pulls the horde together before it explodes. The title screen shows the bombs you've discovered.

Each level comes in waves (2 to 5, the last one is the biggest, red arrows warn of the next one) and the soldiers on the base shoot too. A zombie that reaches the base pounds on it until it dies; if the base runs out of health the level is lost (the coins you picked up are kept). Later levels have more zombies, tougher and faster, in bigger packs. There are 12 zombie types: Walker, Runner, Brute and the Zombie King (a boss every 5 levels, leading the final wave; one more King every 60 levels) show up in the first 10 levels; after that a new type is discovered every 20 levels (Trooper 20, Sprinter 40, Bloater 60, Screamer 80, Hulk 100, Ghoul 120, Juggernaut 140, Titan 160). Bloaters burst when they die and hurt the zombies around them, Screamers make the zombies near them faster, and Troopers and Juggernauts are armored against bullets.

**Things that change from level to level.** The scenery changes every 20 levels: 15 zones, each one of the 3 skies in one of 5 kinds of light (dusk, night, toxic, blood-red, ash). The zone's name is shown when you reach it, and a row of dots between levels shows how far through it you are. Every 5th level from level 8 (8, 13, 18, …) is a special level, taking turns: **Coin Rush** (every zombie drops 3x coins), **The Swarm** (1.9x as many zombies, small kinds only, half as tough) and **Armored Column** (0.6x as many, twice as tough). A **win streak** adds 5% to a level's coins for each level cleared in a row, up to 25%; losing a level ends it (repairing the base keeps it).

**Boosters and supply crates.** From level 3 there are two buttons at the top right of the battlefield: **Air Strike** (the plane dives in and bombs the whole road) and **Freeze** (every zombie stands still for 6 seconds). You start with one of each and get more from rewards and the store. On most levels the plane also parachutes in a **supply crate**: tap it within 9 seconds for coins, a booster or gems.

**Reasons to come back** (`bomber/meta.js`). These open up one by one over the first levels, so a new player isn't shown everything at once: crates at level 2; boosters, the daily reward and the store at 3; missions and coins-while-away at 4; the wheel at 5; achievements at 6. They sit in a row of buttons at the top of the title screen and the between-levels screen, with a red dot when there's something to collect.
- **Gems** are the second currency. Earned from achievements, missions, the daily reward, the wheel, crates, each Zombie King level beaten for the first time (3) and each zone finished (10). Spent in the store on boosters and coins, or on repairing the base (20).
- **Daily reward:** 7 days that grow (day 7 is the jackpot), then round again. Missing a day doesn't lose your place.
- **Daily missions:** 3 a day (the same 3 all day), each paying coins and a gem, and a bonus chest for doing all three.
- **Lucky wheel:** one free spin a day. 8 slices, each as likely as the next, and the slice under the pointer is the one that pays.
- **Coins while away:** the soldiers collect coins while the game is closed, for up to 8 hours (more soldiers collect more). Coming back in the middle of a level counts too; the "welcome back" panel waits for the shop.
- **Achievements:** 12, each with 3 to 6 steps, paying gems.
- Rewards are counted in "levels' worth of coins", so they stay worth having at any level.

**Upgrade shop.** Zombies drop coins, and every level cleared pays a bonus plus coins for each bomb still in the bay (they pop one by one). After each level, or after losing one, the shop shows 4 upgrades: Soldiers (more soldiers, each level a new look, 8 levels), Weapons (damage and fire rate, 12 levels), Base (more HP, 20 levels) and Bombs (bigger bombs to drop and more bomb damage, 16 levels). Prices go up with each level. Soldiers only get stronger through upgrades while zombies get tougher every level, so the later levels are won with the bombs you merge.

The first game shows a short tutorial. Big hits come with screen shake, a short freeze and flashes, the last zombie of a level goes down in slow motion, zombies fly when they're blown up, and sounds are synthesized (no files); Android phones also vibrate. The screen height follows the phone's shape, so the game fills the screen. Your level, coins, upgrades and discovered bombs are saved in the browser.

Art lives in `assets/bomber/`: bombs, all 12 zombies (`zombies/` for the first 4, `zombies2/` for the 8 later ones), soldier bullets, UI icons and buttons, the plane and two sky backgrounds (the zones use them and a third sky drawn in code). Soldiers (8 looks, each with its own projectile and muzzle flash from `assets/bomber/shots`) and the base (4 stages) follow the shop upgrades. Anything that can't load is drawn in code instead. Sheets are cut with `tools/cut_flood.py` (whole sheets; also removes enclosed gaps like between legs or inside windows; `native` keeps relative sizes) and `tools/cut_boxes.py` (named boxes). Bomb hitboxes are their sprite outlines (`bomber/shapes.js`, from `tools/make_shapes.py`); `tools/soft_glow.py` re-cuts glowing items like the Black Hole bomb with a soft halo. Asset prompts are in `bomber/ASSET_PROMPTS.md`.

## Zombie Bomber for Android

- Package `com.sinadehesh.zombiebomber`, Android 7 and up, targeting Android 16 (API 36) as Google Play requires.
- **Build:** `python3 tools/build_bomber_android.py <version name> <version code>` packs the bomber page and only the files it uses (plus Matter.js and the Luckiest Guy font, so it plays offline), makes the launcher icons from the TNT bomb (and the 512 px store icon, `android/build-bomber/store_icon_512.png`; a copy for the Play listing is in `android/store/bomber/icon_512.png`), then builds and signs with Gradle. Output in `android/build-bomber/`: `ZombieBomber-<version>.aab` to upload to Google Play and `ZombieBomber-<version>.apk` to install directly. The Android SDK set-up is shared with the Gem Jar build.
- **AdMob IDs:** `android/bomber/admob.properties` (the app and its 7 ad units, below). While any is empty, Google's test ads are used and only a `ZombieBomber-<version>-TEST-ADS.apk` is made, never a Play bundle.
- **Signing:** `BOMBER_KEYSTORE` and `BOMBER_KEYSTORE_PASS` (key alias `BOMBER_KEY_ALIAS`, default `zombiebomber`), or Gem Jar's `GEMJAR_KEYSTORE` and `GEMJAR_KEYSTORE_PASS` to use the same upload key for both apps, which Google Play allows. Every update must be signed with the same key and have a higher version code.
- Android source: `android/bomber` (manifest, theme, `MainActivity.java`: the game window, ads, consent and billing; `ReminderReceiver.java`: the daily-reward reminder). The game talks to it through `window.AndroidApp`; `bomber/ads.js` decides when each ad may show, and `bomber/meta.js` what each purchase gives.
- **Privacy policy** (for the Play listing and AdMob): `bomber/privacy.html`, https://sinadehesh.github.io/Happy-Fruit-merge/bomber/privacy.html.
- **app-ads.txt:** the one Gem Jar uses (https://www.sinadehesh.com/app-ads.txt) covers this app too, since both are in the same AdMob account. Set the Play listing's website to https://www.sinadehesh.com so AdMob can find it.

### How the app makes money

The rule: as many ads as players are happy to watch, and as few as possible they have to.

- **Rewarded ads, always the player's choice,** at the moments they're worth the most. Each has a button marked ▶ AD:
  - **Repair the base:** when the base falls, repair it to 60% health with a blast that throws back the zombies at the gate, and keep fighting. Once a level, with a 9-second countdown.
  - **x2 coins:** on the level-cleared screen, double every coin from that level. "No thanks" appears a second later.
  - **Free coins:** in the upgrade shop, once a visit (most of a level's worth).
  - **Head start:** in the shop, start the next level with a big bomb already in the bay (4 sizes above your smallest drop, 5 before a boss).
  - And five smaller offers that share one "bonus" ad unit: **another wheel spin** (up to 5 a day), **x2 daily reward**, **x2 coins collected while away**, a **free Air Strike or Freeze** when you're out of them (2 a level; it's used straight away), and opening a **golden supply crate** (about 3 in 10 crates from level 4, worth much more than a plain one).
- **Full-screen ad between levels,** when PLAY is pressed in the shop: never during a level, none before level 4, at most one every 2.5 minutes, and none within 2.5 minutes of a rewarded ad, so players who choose rewarded ads see fewer of the ones they don't choose. Retrying after a loss never shows one. The app keeps its own 2-minute minimum as a safety net.
- **Banner across the top of the screen,** away from the bomb bay where the fingers are (an accidental tap on a banner is against AdMob's rules). Its room is kept from the start so the game doesn't jump when an ad arrives; the large adaptive banner on tall phones, the regular one on short phones.
- **Gems for money** (the store's GEMS tab): four gem packs (`gems_1` to `gems_4`: 80, 500, 1,200 and 3,000 gems) and a one-time **starter pack** (`starter_pack`: 300 gems, 5 Air Strikes, 5 Freezes and 5 levels' worth of coins, about twice what the same money buys in gem packs). Running out of gems while buying something opens the gem packs. The starter pack is offered once, on reaching level 7, and stays in the store. A purchase is given once (the game remembers its token) and then used up, so a pack can be bought again and nothing paid for is lost if the app closes in between. Gems live in the game saved on the phone (the store says so), so unlike No Ads they don't follow the player to a new phone.
- **Nothing random is sold:** wheel spins and crates are free or for a rewarded ad, never for gems or money, so there are no paid loot boxes.
- **No Ads** ($4.99, a one-time Google Play purchase, product ID `remove_ads`): switches the banner and the full-screen ads off for good and gives the game the banner's room. It comes back on a new phone or after reinstalling. The rewarded offers stay, since the player chooses them. The NO ADS button (title screen and shop) shows Google Play's price in the player's currency.
- Ads that fail to load are tried again after 30 s, then 1, 2, 4 and at most 5 minutes. Loaded ads older than 55 minutes are replaced (AdMob's expire after an hour).
- **Consent:** Google's consent message (UMP) where the law asks for it (EU, UK, some US states); the title screen then has a PRIVACY button to change the choice.
- **Reminders:** after the player collects their first daily reward the app asks, once, whether it may send notifications (Android 13 and up; on older Android they are allowed unless switched off in Settings). From then on, leaving the game sets two reminders: one for the next day (about 20 hours on) and one 3 days on. Coming back cancels them, so someone who plays every day never sees one. A reminder never shows on the day the game was left (the daily reward is new at midnight, so it would be wrong) or outside 9:00 to 21:00; it waits for the next 9:00 instead. What it says is worked out by the game when it is left, so it is true when it shows: the day's reward by name, the coins the soldiers will have collected and the free spin, each only if the player has unlocked it. No server and no push messaging: the app sets them itself.
- On the website there are no ads, no ad offers and nothing to buy with money; everything else works the same. Add `#adtest` to the address (`bomber/#adtest`) to try every offer with stand-in ads and pretend purchases.

### Setting up AdMob and Google Play

1. **AdMob:** Apps > Add app > Android, "Zombie Bomber" (link it to the Play listing once it's published). Then create these 7 ad units and put their IDs, and the app ID, in `android/bomber/admob.properties`:

| Ad unit (suggested name) | Format | Where it shows | Key |
|---|---|---|---|
| ZB Top banner | Banner | Across the top of the screen | `banner_id` |
| ZB Between levels | Interstitial | When PLAY is pressed in the shop (from level 4, at most every 2.5 min) | `interstitial_id` |
| ZB Repair base | Rewarded | The base falls: repair it and keep fighting | `rewarded_revive_id` |
| ZB Double coins | Rewarded | Level cleared: x2 coins | `rewarded_double_id` |
| ZB Free coins | Rewarded | Upgrade shop: free coins | `rewarded_coins_id` |
| ZB Head start | Rewarded | Upgrade shop: start the next level with a big bomb | `rewarded_boost_id` |
| ZB Bonus | Rewarded | Wheel spins, x2 daily reward, x2 coins while away, free booster, golden crate | `rewarded_bonus_id` |

   For the rewarded units, the reward amount and item in AdMob don't matter (any, e.g. 1 "Reward"): the game decides what each gives. Each offer has its own unit so AdMob shows how each one does.
2. **Google Play Console:** create the app (package `com.sinadehesh.zombiebomber`), upload the first `.aab`, then Monetize > Products > In-app products > Create product, for each of these 6 (Play fills in other currencies from the price):

| Product ID | Name | Price | What it gives |
|---|---|---|---|
| `remove_ads` | No Ads | $4.99 | No banner and no ads between levels, for good |
| `starter_pack` | Starter Pack | $1.99 | 300 gems, 5 Air Strikes, 5 Freezes, coins (once per player) |
| `gems_1` | 80 Gems | $0.99 | 80 gems |
| `gems_2` | 500 Gems | $4.99 | 500 gems |
| `gems_3` | 1,200 Gems | $9.99 | 1,200 gems |
| `gems_4` | 3,000 Gems | $19.99 | 3,000 gems |

   The IDs must match exactly. The amounts are set in `bomber/meta.js` (`GEM_PACKS`, `starterPack`); if you change a price a lot, change the amount to match. Add the privacy policy link, and fill in Data safety from the privacy policy (AdMob collects the device's advertising ID, rough location from the IP address, app interactions and diagnostics; purchases are handled by Google Play; nothing is collected by the game itself). The game has in-app purchases and ads, so tick both on the listing.
