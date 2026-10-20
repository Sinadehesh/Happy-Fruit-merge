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
