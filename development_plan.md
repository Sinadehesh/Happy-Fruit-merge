# Merge Farmstead - Master Development Guide

## 1. Game Concept
"Merge Farmstead" (Working Title) is a physics-based, dual-merge puzzle game. It leverages the addictive mechanics of "Fruit Merge" (Suika Game) but introduces a unique interlocking economy to drive player retention and monetization. 
Players manage two areas:
1. **The Farm:** Merge crops to earn "Animal Feed".
2. **The Barn:** Use "Animal Feed" to drop livestock, merging them to earn "Coins" for upgrades.

## 2. Tech Stack
- **Engine:** HTML5 Canvas + JavaScript.
- **Physics:** Matter.js (handles gravity, circular collisions, and restitution).
- **Deployment:** GitHub Actions + Capacitor (to compile the web game into an Android APK / iOS app).
- **Assets:** Generated via Google AI Image Generator.

## 3. The 11-Tier Chains (The Evolution Paths)
Both the Farm and Barn require exactly 11 tiers (as discovered in the Fruit Merge analysis).

### The Farm Chain (Generates Feed)
1. Seed (Smallest)
2. Sprout
3. Strawberry
4. Tomato
5. Corn
6. Carrot
7. Cabbage
8. Pumpkin
9. Watermelon
10. Golden Apple
11. Giant Sun (Largest - Game winning crop)

### The Barn Chain (Generates Coins)
1. Egg (Smallest)
2. Chick
3. Chicken
4. Piglet
5. Pig
6. Calf
7. Cow
8. Horse
9. Bear
10. Elephant
11. Blue Whale (Largest - Game winning animal)

## 4. Core Physics Rules (From Cocos Creator Analysis)
- **Colliders:** 100% Circle-based.
- **Restitution (Bounciness):** Low, but non-zero. Items should not bounce like pinballs, but should roll off each other when dropped off-center.
- **Growth Delay:** When a merge occurs, the new item takes 0.5 seconds to "grow" into its full size. This settling delay is critical for triggering unpredictable chain reactions.
- **Spawning:** New merged items spawn at the exact midpoint of the two colliding items, with a slight downward velocity.

## 5. Development Phases

### Phase 1: Core Physics & Engine Setup (Current Step)
- Set up `index.html` and `game.js`.
- Implement Matter.js.
- Create the static boundaries (walls and floor).
- Implement mouse/touch input to drop basic circles with gravity.
- Implement basic collision detection and the merge logic (if two identical circles touch, delete both and spawn the next size up).

### Phase 2: Assets & Visuals Setup
- Invoke the AI `image-generator` to create sprite sheets for the 11 Farm items and 11 Barn items.
- Style the visuals (cute, vibrant vector or clay 3D style).
- Apply the images to the Matter.js physics bodies.

### Phase 3: The Dual Economy
- Build the UI: Score, Feed counter, Coin counter, and a toggle button to switch between the Farm and the Barn.
- Program the logic: Merging in the Farm increases Feed. Dropping items in the Barn costs Feed.

### Phase 4: Polish & "Juice"
- Add the 0.5s growth animations.
- Add sound effects (popping, bouncing).
- Implement the "Game Over" red line at the top of the container.

### Phase 5: Monetization & Compilation
- Add UI hooks for Ads (e.g., "Watch Ad to clear the bottom row").
- Use GitHub Actions to compile the project into an APK.
