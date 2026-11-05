// --- HAPPY FRUIT MERGE ---
// Drop fruit, merge two of the same into the next one, and don't let the box fill up.

const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Vertices = Matter.Vertices;

const GAME_WIDTH = 450;
const GAME_HEIGHT = 640;   // 20% shorter than the original 800
const DANGER_Y = 150;      // keep in sync with .danger-line in index.html
const DROP_TIERS = 5;      // random drops come from the 5 smallest items

// Modes, picked with ?mode=fruit / ?mode=animal / ?mode=cars / ?mode=rocks / ?mode=sweets
// (cars-flat, cars-candy are other car art styles).
// Sprite index = tier.
// `tiers` is the size (radius) of each tier; its length is the number of merge levels.
const ELEVEN_TIERS = [20, 30, 40, 55, 70, 85, 100, 120, 145, 170, 200];
const CAR_TIERS = [22, 30, 40, 52, 64, 78, 92, 108, 125, 145, 168, 195];
const CAR_SPRITES = ['01_toyota_corolla', '02_fiat_500', '03_vw_bus', '04_jeep_wrangler', '05_ford_mustang', '06_toyota_supra', '07_nissan_gtr', '08_mercedes_g_class', '09_porsche_911', '10_lamborghini_aventador', '11_ferrari_laferrari', '12_bugatti_chiron'];
const MODES = {
    'fruit': {
        background: '#e8f8f5',
        tiers: ELEVEN_TIERS,
        sprites: [
            'assets/farm/01_seed.png', 'assets/farm/02_sprout.png', 'assets/farm/03_strawberry.png',
            'assets/farm/04_tomato.png', 'assets/farm/05_corn.png', 'assets/farm/06_carrot.png',
            'assets/farm/07_cabbage.png', 'assets/farm/08_pumpkin.png', 'assets/farm/09_watermelon.png',
            'assets/farm/10_golden_apple.png', 'assets/farm/11_sunflower.png'
        ]
    },
    'animal': {
        background: '#fdedec',
        tiers: ELEVEN_TIERS,
        sprites: [
            'assets/barn/01_egg.png', 'assets/barn/02_chick.png', 'assets/barn/03_chicken.png',
            'assets/barn/04_piglet.png', 'assets/barn/05_pig.png', 'assets/barn/06_calf.png',
            'assets/barn/08_cow.png', 'assets/barn/09_horse.png', 'assets/barn/10_alpaca.png',
            'assets/barn/11_bull.png', 'assets/barn/12_unicorn.png'
        ]
    },
    'cars': {
        background: '#eaf2f8',
        tiers: CAR_TIERS,
        sprites: CAR_SPRITES.map(name => `assets/cars/${name}.png`)
    },
    'cars-flat': {
        background: '#eaf2f8',
        tiers: CAR_TIERS,
        sprites: CAR_SPRITES.map(name => `assets/cars_flat/${name}.png`)
    },
    'cars-candy': {
        background: '#fdf2f8',
        tiers: CAR_TIERS,
        sprites: CAR_SPRITES.map(name => `assets/cars_candy/${name}.png`)
    },
    'rocks': {
        background: '#f4ecf7',
        // rocks fill their whole picture, so they're drawn a bit smaller than the fruit for the same level
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: [
            'assets/rocks/01_pebble.png', 'assets/rocks/02_sandstone.png', 'assets/rocks/03_coal.png',
            'assets/rocks/04_malachite.png', 'assets/rocks/05_rose_quartz.png', 'assets/rocks/06_amethyst_geode.png',
            'assets/rocks/07_turquoise.png', 'assets/rocks/08_gold_nugget.png', 'assets/rocks/09_ruby.png',
            'assets/rocks/10_opal.png', 'assets/rocks/11_star_sapphire.png', 'assets/rocks/12_diamond.png'
        ]
    },
    // Gem Jar's unlockable gem sets (GAME.skins): same sizes and levels as rocks, another look
    'crystal': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: [
            'assets/crystal/01_frosted_quartz.png', 'assets/crystal/02_clear_quartz.png', 'assets/crystal/03_citrine.png',
            'assets/crystal/04_fluorite.png', 'assets/crystal/05_celestite.png', 'assets/crystal/06_pink_spinel.png',
            'assets/crystal/07_lapis_lazuli.png', 'assets/crystal/08_fire_agate.png', 'assets/crystal/09_bismuth.png',
            'assets/crystal/10_watermelon_tourmaline.png', 'assets/crystal/11_ametrine.png', 'assets/crystal/12_crystal_heart.png'
        ]
    },
    'sweets': {
        background: '#fdf2f8',
        // like rocks, sweets fill most of their picture
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: [
            'assets/sweets/01_jelly_bean.png', 'assets/sweets/02_gummy_bear.png', 'assets/sweets/03_peppermint.png',
            'assets/sweets/04_marshmallow.png', 'assets/sweets/05_macaron.png', 'assets/sweets/06_chocolate_truffle.png',
            'assets/sweets/07_cupcake.png', 'assets/sweets/08_donut.png', 'assets/sweets/09_ice_cream.png',
            'assets/sweets/10_caramel_pudding.png', 'assets/sweets/11_lollipop.png', 'assets/sweets/12_celebration_cake.png'
        ]
    }
};
const params = new URLSearchParams(location.search);
// Rocks became its own game (gems/): old links go there
if (!GAME.mode && params.get('mode') === 'rocks') location.replace('gems/' + (params.get('size') ? '?size=' + params.get('size') : ''));
const MODE = GAME.mode || (MODES[params.get('mode')] ? params.get('mode') : 'fruit');
// Gem sets (GAME.skins): the same game and saves with another look. The first is always open; the others
// open by finishing Daily Challenges. The chosen one is remembered.
const DAILIES_DONE = (() => { try { return (JSON.parse(localStorage.getItem(`${GAME.id}.daily`)) || {}).total || 0; } catch (e) { return 0; } })();
const SKINS = (GAME.skins || []).filter(sk => MODES[sk.id]);
const SKIN = (() => {
    if (!SKINS.length) return null;
    let id = null;
    try { id = localStorage.getItem(`${GAME.id}.skin`); } catch (e) {}
    return SKINS.find(sk => sk.id === id && DAILIES_DONE >= (sk.dailies || 0)) || SKINS[0];
})();
const SPRITES = MODES[SKIN ? SKIN.id : MODE].sprites;
// Daily Challenge (GAME.daily, opened with ?daily): one special game a day, see DAILY CHALLENGE below
const DAILY = !!GAME.daily && params.has('daily');

// Reverse size (?size=reverse): the higher the level, the smaller the item.
// (Not in the Daily Challenge, which is the same game for everyone.)
// Not a plain flip of the normal sizes, which would make the dropped items nearly box-wide:
// level 1 starts at a normal drop size and each level shrinks by the same ratio down to the last.
const REVERSE = params.get('size') === 'reverse' && !DAILY;
const REVERSE_LARGEST = 80;
const REVERSE_SMALLEST = 18;
function reverseTiers(count) {
    return Array.from({ length: count }, (_, i) =>
        Math.round(REVERSE_LARGEST * Math.pow(REVERSE_SMALLEST / REVERSE_LARGEST, i / (count - 1))));
}
const TIERS = REVERSE ? reverseTiers(MODES[MODE].tiers.length) : MODES[MODE].tiers;
const SPRITE_SIZE = 256;   // px, every sprite is a 256x256 square
const SPRITE_FIT = 1.08;   // draw slightly bigger than the collider so art touches neighbours
SPRITES.forEach(src => { const img = new Image(); img.src = src; }); // preload

function spriteScale(radius) {
    return (radius * 2 * SPRITE_FIT) / SPRITE_SIZE;
}

// Drops are random; in the Daily Challenge they are the same sequence for everyone that day (seeded by the date)
function localDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const TODAY = localDate(0), YESTERDAY = localDate(-1);
const DAY_SEED = +TODAY.replace(/-/g, '');
// mulberry32: small and fast, and its whole state is one number, saved with the game
function seededRandom(seed) {
    let a = seed >>> 0;
    const next = () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.getState = () => a;
    next.setState = st => { a = st >>> 0; };
    return next;
}
const dropRandom = DAILY ? seededRandom(DAY_SEED) : Math.random;

// Game state
let isGameOver = false;
let currentTier = randomDropTier();
let nextTier = randomDropTier();
let dropX = GAME_WIDTH / 2;

// A game that used to be a mode of another one (GAME.oldId) keeps its best score and game in progress,
// copied over once
if (GAME.oldId) try {
    const done = `${GAME.id}.carriedOver`;
    if (!localStorage.getItem(done)) {
        ['', '.reverse'].forEach(r => [[`${GAME.oldId}.best.${MODE}${r}`, `${GAME.id}.best${r}`],
                                       [`${GAME.oldId}.save.${MODE}${r}`, `${GAME.id}.save.${MODE}${r}`]].forEach(([from, to]) => {
            if (localStorage.getItem(from) !== null && localStorage.getItem(to) === null) localStorage.setItem(to, localStorage.getItem(from));
        }));
        localStorage.setItem(done, '1');
    }
} catch (e) {}

// Score: Suika-style triangular points for every merge, best kept across games
const BEST_KEY = DAILY ? `${GAME.id}.best.daily`
    : (GAME.mode || MODE === 'fruit' ? `${GAME.id}.best` : `${GAME.id}.best.${MODE}`) + (REVERSE ? '.reverse' : '');
let score = 0;
let bestScore = 0;
try { bestScore = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) {}
const startBest = bestScore;   // best before this game; the shown best counts up with the score once beaten
let isNewBest = false;
let shownScore = 0;            // the big score counts up to `score` (Block Blast style)

// UI Elements
const board = document.getElementById('board');
const scoreEl = document.getElementById('score-val');
const bestEl = document.getElementById('best-val');
const nextImg = document.getElementById('next-img');
const dropGuide = document.getElementById('drop-guide');
const aimLine = document.getElementById('aim-line');

function randomDropTier() {
    return Math.floor(dropRandom() * DROP_TIERS);
}

// Combo (Block Blast rule): every merge adds 1; dropping COMBO_BREAK items in a row without
// any merge breaks it. Long combos earn more points and show praise words.
const COMBO_BREAK = 2;
// combo count -> praise step (GAME.praise / GAME.praiseAt in config.js); after the last step, every 5 merges
let combo = 0, dropsWithoutMerge = 0;
const LAST_PRAISE = GAME.praiseAt[GAME.praiseAt.length - 1];
const praiseFor = n => GAME.praiseAt.includes(n) ? GAME.praiseAt.indexOf(n)
    : (n > LAST_PRAISE && (n - LAST_PRAISE) % 5 === 0 ? GAME.praise.length - 1 : undefined);
const comboMultiplier = () => 1 + 0.2 * (Math.min(combo, 11) - 1);   // x1, x1.2 ... x3

function addScore(tier) {
    const points = Math.round((tier * (tier + 1) / 2) * 10 * comboMultiplier());
    score += points;
    if (score > bestScore) {
        isNewBest = true;
        bestScore = score;
        try { localStorage.setItem(BEST_KEY, bestScore); } catch (e) {}
    }
    return points;
}

// Count the big score up toward the real score; the best (crown) follows once it's beaten
function tickScore() {
    if (shownScore < score) {
        shownScore = Math.min(score, shownScore + Math.max(1, Math.ceil((score - shownScore) * 0.12)));
        scoreEl.textContent = shownScore;
        scoreEl.classList.add('bump');
        clearTimeout(tickScore.unbump);
        tickScore.unbump = setTimeout(() => scoreEl.classList.remove('bump'), 90);
        if (shownScore > startBest) {
            if (!tickScore.crowned) {   // first time past the old best: bounce the crown
                tickScore.crowned = true;
                if (startBest > 0) { Sound.play('newBest'); Haptics.play('newBest'); }
                document.getElementById('best-box').classList.add('new-best');
            }
            bestEl.textContent = shownScore;
        }
    }
    requestAnimationFrame(tickScore);
}

// "+30" rising from where the merge happened
function showPop(x, y, points) {
    const pop = document.createElement('div');
    pop.className = 'pop';
    pop.textContent = `+${points}`;
    pop.style.left = `${(x / GAME_WIDTH) * 100}%`;
    pop.style.top = `${(y / GAME_HEIGHT) * 100}%`;
    pop.style.fontSize = `${18 + Math.min(points, 600) / 25}px`;
    board.appendChild(pop);
    setTimeout(() => pop.remove(), 950);
}

function updateUI() {
    nextImg.src = SPRITES[nextTier];

    // The fruit you're about to drop hangs at the top, following the pointer
    const scale = board.clientWidth / GAME_WIDTH;
    const r = TIERS[currentTier] * SPRITE_FIT;
    dropGuide.style.backgroundImage = `url('${SPRITES[currentTier]}')`;
    dropGuide.style.width = `${r * 2 * scale}px`;
    dropGuide.style.top = `${(spawnY(currentTier) - r) * scale}px`;
    dropGuide.style.left = `${dropX * scale}px`;
    aimLine.style.left = `${dropX * scale}px`;
    aimLine.style.top = `${(spawnY(currentTier) + r) * scale}px`;
}

function spawnY(tier) {
    return TIERS[tier] + 10;
}

function clampX(x, tier) {
    return Math.max(TIERS[tier], Math.min(GAME_WIDTH - TIERS[tier], x));
}

// --- WORLD ---

// Extra solver iterations so heavy piles don't sink into each other
const engine = Engine.create({ positionIterations: 20, velocityIterations: 12 });
const render = Render.create({
    element: board,
    engine: engine,
    options: { width: GAME_WIDTH, height: GAME_HEIGHT, wireframes: false, background: '#00000000' }  // the board's grid shows through
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

const wallOptions = { isStatic: true, render: { fillStyle: '#34495e' } };
const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 25, GAME_WIDTH, 50, wallOptions);
const leftWall = Bodies.rectangle(-25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);
const rightWall = Bodies.rectangle(GAME_WIDTH + 25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);
Composite.add(engine.world, [ground, leftWall, rightWall]);

let dangerTimer = 0;

Events.on(engine, 'beforeUpdate', () => {
    if (isGameOver) return;
    let isAnyBodyAboveLine = false;

    Composite.allBodies(engine.world).forEach(body => {
        if (body.isGrowing) {
            const growthStep = body.targetRadius / 30;
            let newRadius = body.currentRadius + growthStep;
            if (newRadius >= body.targetRadius) {
                const scale = body.targetRadius / body.currentRadius;
                Body.scale(body, scale, scale);
                body.currentRadius = body.targetRadius;
                body.isGrowing = false;
                syncSprite(body);
            } else {
                const scale = newRadius / body.currentRadius;
                Body.scale(body, scale, scale);
                body.currentRadius = newRadius;
                syncSprite(body);
            }
        }

        // Fallback for a drop wedged against a wall: once it has fallen for a second and stopped, it counts as landed
        if (body.isDropping) {
            body.dropAge = (body.dropAge || 0) + 1;
            if (body.dropAge > 60 && body.speed < 0.3) body.isDropping = false;
        }

        // Touching or crossing the line is fine; you lose only when a landed item is
        // entirely above it (its lowest point is above the line)
        if (body.tier !== undefined && !body.isGrowing && !body.isDropping) {
            if (body.bounds.max.y < DANGER_Y) {
                if (Math.abs(body.velocity.y) < 2 && Math.abs(body.velocity.x) < 2) {
                    isAnyBodyAboveLine = true;
                }
            }
        }
    });

    if (isAnyBodyAboveLine) {
        dangerTimer++;
        if (dangerTimer > 180) {
            isGameOver = true;
            clearSave();   // the next visit starts a fresh game
            document.getElementById('go-score').textContent = score;
            document.getElementById('go-best-val').textContent = bestScore;
            document.getElementById('go-new').style.display = isNewBest ? 'block' : 'none';
            document.getElementById('gameover').classList.add('show');
            // in the app: once a game, the player may watch an ad to keep going
            document.getElementById('revive').style.display = !revived && Ads.canRevive() ? 'block' : 'none';
            Sound.play('gameOver');
            Haptics.play('gameOver');
        }
    } else {
        dangerTimer = 0;
    }
});

// --- INPUT ---
// Touch (or press) anywhere on the board or below it: the fruit pops a little bigger and follows your
// finger, with a guide line showing where it will fall. Letting go drops it. A hovering mouse just moves it.

function pointerToGameX(e) {
    const rect = board.getBoundingClientRect();
    return (e.clientX - rect.left) * (GAME_WIDTH / rect.width);
}

const playArea = document.getElementById('app');
let holding = null;   // pointer id of the finger holding the fruit

function setHeld(on) {
    dropGuide.classList.toggle('held', on);
    aimLine.classList.toggle('show', on);
}

// sound can only start after the first tap
document.addEventListener('pointerdown', () => Sound.unlock(), { capture: true });

playArea.addEventListener('pointerdown', (e) => {
    if (holding !== null || isGameOver || Ads.isShowing() || e.target.closest('.topbar, #btn-zap')) return;
    if (zapArmed) { zapAt(e); return; }   // Zap booster: this tap picks the gem to strike
    holding = e.pointerId;
    try { playArea.setPointerCapture(e.pointerId); } catch (err) {}   // keep following outside the board
    dropX = clampX(pointerToGameX(e), currentTier);
    setHeld(true);
    Haptics.play('pickup');
    updateUI();
});

playArea.addEventListener('pointermove', (e) => {
    if (holding !== null ? e.pointerId !== holding : e.pointerType !== 'mouse') return;
    dropX = clampX(pointerToGameX(e), currentTier);
    updateUI();
});

playArea.addEventListener('pointerup', (e) => {
    if (e.pointerId !== holding) return;
    holding = null;
    setHeld(false);
    if (isGameOver || Ads.isShowing()) return;
    dropX = clampX(pointerToGameX(e), currentTier);
    dropFruit();
});

playArea.addEventListener('pointercancel', (e) => {
    if (e.pointerId === holding) { holding = null; setHeld(false); }
});

function dropFruit() {
    Sound.play('drop');
    Haptics.play('drop');
    if (++dropsWithoutMerge > COMBO_BREAK) combo = 0;

    spawnItem(dropX, spawnY(currentTier), currentTier, false);

    currentTier = nextTier;
    nextTier = randomDropTier();
    dropX = clampX(dropX, currentTier);
    updateUI();

    Ads.onDrop();
}

// --- MERGING ---

// A dropped item lands when it touches the floor or an item that has already landed.
// Only landed items may merge, so spamming drops can't merge items in mid-air at the top.
function isLanded(body) {
    return body === ground || (body.tier !== undefined && !body.isDropping);
}
function landed(body) {
    body.isDropping = false;
    Sound.play('land', body.tier);
    Haptics.play('land', body.tier);
}

function handleCollisions(event) {
    if (isGameOver) return;
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        if (bodyA.isDropping && isLanded(bodyB)) landed(bodyA);
        if (bodyB.isDropping && isLanded(bodyA)) landed(bodyB);
        if (bodyA.isDropping || bodyB.isDropping) continue;

        if (bodyA.tier === undefined || bodyB.tier === undefined) continue;
        if (bodyA.tier !== bodyB.tier || bodyA.tier >= TIERS.length - 1) continue;
        if (bodyA.isMerging || bodyB.isMerging) continue;
        bodyA.isMerging = true;
        bodyB.isMerging = true;

        const mergedTier = bodyA.tier + 1;
        combo++;
        dropsWithoutMerge = 0;
        const points = addScore(mergedTier);
        dailyOnMerge(mergedTier);

        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;
        showPop(midX, midY, points);
        FX.merge(midX, midY, TIERS[mergedTier], combo);
        Sound.play('pop', mergedTier);
        if (combo >= 2) Sound.play('combo', combo - 2);
        Haptics.play('merge', mergedTier, combo);
        // the praise word, its voice and its buzz come together; the narrator says one line at a time,
        // so in a fast chain a word may wait for the one before it to finish (see Sound)
        const level = praiseFor(combo);
        if (mergedTier === TIERS.length - 1) Sound.play('maxMerge', () => { FX.praise(4, true); Haptics.play('maxMerge'); });
        else if (level !== undefined) Sound.play('praise', level, () => { FX.praise(level); Haptics.play('praise', level); });

        Composite.remove(engine.world, [bodyA, bodyB]);
        spawnItem(midX, midY, mergedTier, true);
    }
}
// collisionActive too: two drops that met in mid-air may merge once they're resting on the pile
Events.on(engine, 'collisionStart', handleCollisions);
Events.on(engine, 'collisionActive', handleCollisions);

function spawnItem(x, y, tier, animateGrowth) {
    const targetRadius = TIERS[tier];
    const startRadius = animateGrowth ? Math.max(targetRadius * 0.3, 10) : targetRadius;
    const scale = spriteScale(startRadius);

    // Hitbox = the sprite's own outline (shapes.js), so items touch where the art touches.
    // Matter centres the body on the outline's centroid; offset the sprite to match.
    const outline = SHAPES[SPRITES[tier]].map(([px, py]) => ({ x: px, y: py }));
    const centre = Vertices.centre(outline);
    const body = Bodies.fromVertices(x, y, [outline.map(p => ({ x: p.x * scale, y: p.y * scale }))], {
        restitution: 0.15,
        friction: 0.5,
        density: 0.001 * (tier + 1),
        slop: 0.01,
        render: { sprite: { texture: SPRITES[tier], xScale: scale, yScale: scale } },
        tier: tier
    });
    // Set after creation: Matter rewrites sprite offsets from the hitbox bounds while creating the body
    body.render.sprite.xOffset = centre.x / SPRITE_SIZE;
    body.render.sprite.yOffset = centre.y / SPRITE_SIZE;

    if (animateGrowth) Body.setVelocity(body, { x: 0, y: 2 }); // slight downward push (dev plan §4)
    body.isDropping = !animateGrowth; // merge results are already in the pile
    body.isGrowing = animateGrowth;
    body.currentRadius = startRadius;
    body.targetRadius = targetRadius;

    Composite.add(engine.world, body);
    return body;
}

function syncSprite(body) {
    const scale = spriteScale(body.currentRadius);
    body.render.sprite.xScale = scale;
    body.render.sprite.yScale = scale;
}

// --- RESTART & ADS ---

document.getElementById('btn-restart').addEventListener('click', () => {
    Ads.showInterstitial(() => { clearSave(); location.reload(); });
});

// Keep going (Android app): the player chose to watch a rewarded ad, so the top of the jar is cleared
// with a burst and the same game goes on, score and all. Once a game.
document.getElementById('btn-revive').addEventListener('click', () => {
    Ads.showRewarded(watched => { if (watched) revive(); });
});

function revive() {
    revived = true;
    const clearAbove = DANGER_Y + 130;   // everything reaching into the top part of the jar
    Composite.allBodies(engine.world).filter(b => b.tier !== undefined && b.bounds.min.y < clearAbove).forEach(b => {
        FX.merge(b.position.x, b.position.y, TIERS[b.tier], 0);
        Composite.remove(engine.world, b);
    });
    isGameOver = false;
    dangerTimer = 0;
    saving = true;
    document.getElementById('gameover').classList.remove('show');
    Sound.play('praise', 2);
    Haptics.play('praise', 2);
    saveGame();
}

// --- SAVE ---
// The game in progress is saved in the browser (one save per mode, and per Reverse setting) about
// every second and when the page is hidden or closed, so it comes back exactly where you left it.
const SAVE_KEY = DAILY ? `${GAME.id}.save.daily` : `${GAME.id}.save.${MODE}${REVERSE ? '.reverse' : ''}`;
let saving = true;
let revived = false;   // used the "keep going" ad this game

function saveGame() {
    if (!saving || isGameOver) return;
    const items = Composite.allBodies(engine.world)
        .filter(b => b.tier !== undefined && !b.isMerging)
        .map(b => [b.tier, +b.position.x.toFixed(1), +b.position.y.toFixed(1), +b.angle.toFixed(3)]);
    const data = { v: 1, score, current: currentTier, next: nextTier, combo, dropsWithoutMerge, revived, items };
    if (DAILY) Object.assign(data, { date: TODAY, rng: dropRandom.getState(), made, maxCombo });
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}

function clearSave() {
    saving = false;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

function loadGame() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    if (!data || data.v !== 1 || !Array.isArray(data.items)) return;
    if (DAILY && data.date !== TODAY) return;   // yesterday's daily game: today's starts fresh
    const okTier = t => Number.isInteger(t) && t >= 0 && t < TIERS.length;
    for (const [tier, x, y, angle] of data.items) {
        if (!okTier(tier)) continue;
        const body = spawnItem(x, y, tier, false);
        Body.setAngle(body, angle || 0);
        body.isDropping = false;   // it was already in the pile
    }
    score = shownScore = Math.max(0, data.score | 0);
    scoreEl.textContent = score;
    isNewBest = score > 0 && score >= bestScore;
    if (okTier(data.current)) currentTier = data.current;
    if (okTier(data.next)) nextTier = data.next;
    combo = data.combo | 0;
    dropsWithoutMerge = data.dropsWithoutMerge | 0;
    revived = !!data.revived;
    if (DAILY) {
        if (Number.isInteger(data.rng)) dropRandom.setState(data.rng);
        if (Array.isArray(data.made)) data.made.forEach((n, t) => { if (t < made.length) made[t] = n | 0; });
        maxCombo = data.maxCombo | 0;
    }
}

setInterval(saveGame, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);

// Physics is paused while an ad is on screen
Ads.init({
    onPause: () => Runner.stop(runner),
    onResume: () => Runner.run(runner, engine)
});

// Mode links keep the size setting; the size button flips it and keeps the mode
const sizeQuery = REVERSE ? '&size=reverse' : '';
document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === MODE.split('-')[0]);
    btn.href = `?mode=${btn.dataset.mode}${sizeQuery}`;
});
// Car art style picker, only shown while playing Cars
const carStyles = document.getElementById('car-styles');   // not on a single-game page (gems/)
if (carStyles) {
    carStyles.style.display = MODE.startsWith('cars') ? 'flex' : 'none';
    carStyles.querySelectorAll('a').forEach(btn => {
        btn.classList.add('grey');
        btn.classList.toggle('active', btn.dataset.style === MODE);
        if (btn.dataset.style === MODE) btn.classList.remove('grey');
        btn.href = `?mode=${btn.dataset.style}${sizeQuery}`;
    });
}
const sizeBtn = document.getElementById('btn-size');
sizeBtn.classList.toggle('active', REVERSE);
if (DAILY) sizeBtn.style.display = 'none';
sizeBtn.href = location.pathname + (GAME.mode ? (REVERSE ? '' : '?size=reverse') : `?mode=${MODE}${REVERSE ? '' : '&size=reverse'}`);

// Settings panel (gear)
const settings = document.getElementById('settings');
document.getElementById('btn-settings').addEventListener('click', () => { settings.classList.add('show'); Runner.stop(runner); });
document.getElementById('btn-close-settings').addEventListener('click', () => { settings.classList.remove('show'); Runner.run(runner, engine); });
settings.addEventListener('click', (e) => { if (e.target === settings) document.getElementById('btn-close-settings').click(); });
document.getElementById('btn-new-game').addEventListener('click', () => { clearSave(); location.reload(); });
// Sound / music switches (green = on, grey = off)
function audioButtons() {
    const p = Sound.prefs();
    document.getElementById('btn-sfx').className = `pill ${p.sfx ? 'green' : 'grey'}`;
    document.getElementById('btn-sfx').textContent = `Sound ${p.sfx ? 'On' : 'Off'}`;
    const song = Sound.songTitle();
    document.getElementById('btn-music').className = `pill ${song ? 'green' : 'grey'}`;
    document.getElementById('btn-music').textContent = song ? '♪ Music On' : 'Music Off';
    document.getElementById('song-name').textContent = song ? `♪ "${song}" Kevin MacLeod (incompetech.com), CC BY 4.0` : 'Tap Music to pick a song';
}
document.getElementById('btn-sfx').addEventListener('click', () => { Sound.setSfx(!Sound.prefs().sfx); Sound.play('tap'); audioButtons(); });
document.getElementById('btn-music').addEventListener('click', () => { Sound.unlock(); Sound.nextMusic(); Sound.play('tap'); audioButtons(); });
document.querySelectorAll('#settings a, #settings button').forEach(b => b.addEventListener('pointerdown', () => { Sound.play('tap'); Haptics.play('tap'); }));
// Vibration switch (hidden where the browser can't vibrate at all)
const vibeBtn = document.getElementById('btn-vibe');
function vibeButton() {
    vibeBtn.className = `pill ${Haptics.isOn() ? 'green' : 'grey'}`;
    vibeBtn.textContent = `Vibration ${Haptics.isOn() ? 'On' : 'Off'}`;
}
if (!Haptics.supported) vibeBtn.style.display = 'none';
vibeBtn.addEventListener('click', () => { Haptics.setOn(!Haptics.isOn()); Haptics.play('merge', 4, 3); vibeButton(); });
audioButtons();
vibeButton();
FX.init(board);

// --- DAILY CHALLENGE ---
// One special game a day (GAME.daily; the Daily button opens it): the same drops and the same goal for
// everyone that day, picked from the date. Reaching the goal the first time that day gives Zaps
// (3 on every 7th day in a row) and keeps the streak going. Its game and best score are kept apart
// from the main game, and it can be replayed as often as you like.
const DAILY_KEY = `${GAME.id}.daily`;
const made = new Array(TIERS.length).fill(0);   // items made in today's daily game, per level
let maxCombo = 0;
const tierName = t => SPRITES[t].split('/').pop().replace(/^\d+_|\.png$/g, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const aOrAn = name => (/^[AEIOU]/.test(name) ? 'an ' : 'a ') + name;
const short = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);

const GOAL = (() => {
    const pick = seededRandom(DAY_SEED * 7919 + 13);
    const top = TIERS.length - 1;
    const goals = [
        ...[6, 7, 8, 9].map(t => ({ kind: 'make', tier: Math.min(t, top - 2), count: 1 })),
        ...[5, 6].map(t => ({ kind: 'make', tier: t, count: 2 })),
        ...[2500, 4000, 6000].map(n => ({ kind: 'score', target: n })),
        ...[5, 6, 8].map(n => ({ kind: 'combo', target: n }))
    ];
    return goals[Math.floor(pick() * goals.length)];
})();
function goalText(g) {
    if (g.kind === 'make') return g.count === 1 ? `Make ${aOrAn(tierName(g.tier))}` : `Make ${g.count} ${tierName(g.tier)}s`;
    if (g.kind === 'score') return `Score ${g.target.toLocaleString()}`;
    return `Get a ${g.target}x combo`;
}
function goalProgress(g) {   // [have, need]
    if (g.kind === 'make') return [made[g.tier], g.count];
    if (g.kind === 'score') return [score, g.target];
    return [maxCombo, g.target];
}
function dailyState() {
    try { return JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch (e) { return {}; }
}
const doneToday = () => dailyState().lastDone === TODAY;

function dailyOnMerge(tier) {
    if (!DAILY) return;
    made[tier]++;
    maxCombo = Math.max(maxCombo, combo);
    dailyCheck();
}

function dailyCheck() {
    if (!DAILY) return;
    updateGoal();
    if (doneToday()) return;
    const [have, need] = goalProgress(GOAL);
    if (have < need) return;
    const st = dailyState();
    st.streak = st.lastDone === YESTERDAY ? (st.streak || 0) + 1 : 1;
    st.lastDone = TODAY;
    st.total = (st.total || 0) + 1;
    try { localStorage.setItem(DAILY_KEY, JSON.stringify(st)); } catch (e) {}
    const reward = st.streak % 7 === 0 ? 3 : 1;
    addZaps(reward);
    updateGoal();
    Sound.play('maxMerge', () => { FX.praise(4, true); Haptics.play('maxMerge'); });
    showToast(`Daily Challenge done! +${reward} Zap${reward > 1 ? 's' : ''}`);
    const opened = SKINS.find(sk => sk.dailies === st.total);
    if (opened) setTimeout(() => showToast(`New gems unlocked: ${opened.name}!`), 2600);
}

function updateGoal() {
    const box = document.getElementById('goal');
    if (doneToday()) {
        const streak = dailyState().streak || 1;
        box.classList.add('done');
        document.getElementById('goal-text').textContent = 'Done!';
        document.getElementById('goal-progress').textContent = streak > 1 ? `${streak} days in a row` : 'Come back tomorrow';
    } else {
        const [have, need] = goalProgress(GOAL);
        document.getElementById('goal-text').textContent = goalText(GOAL);
        document.getElementById('goal-progress').textContent = GOAL.kind === 'score' ? `${short(Math.min(have, need))}/${short(need)}` : `${Math.min(have, need)}/${need}`;
    }
}

function initDaily() {
    if (!GAME.daily) return;
    if (DAILY) {
        document.getElementById('best-box').style.display = 'none';
        document.getElementById('goal').style.display = '';
        const exit = document.getElementById('btn-exit-daily');
        exit.style.display = '';
        exit.addEventListener('click', () => { saveGame(); location.href = location.pathname; });
        updateGoal();
    } else {
        const btn = document.getElementById('btn-daily');
        btn.style.display = '';
        btn.classList.toggle('done', doneToday());
        btn.addEventListener('click', () => { saveGame(); location.href = location.pathname + '?daily'; });
    }
}

// --- ZAP BOOSTER ---
// Lightning that strikes one gem you choose and clears it away (GAME.boosters). You start with 2, earn
// more from the Daily Challenge, and in the Android app can watch an ad for one when you run out.
const ZAP_KEY = `${GAME.id}.zaps`;
const zapBtn = document.getElementById('btn-zap');
let zaps = 2;
try { const v = localStorage.getItem(ZAP_KEY); if (v !== null) zaps = Math.max(0, parseInt(v, 10) || 0); } catch (e) {}
let zapArmed = false;

function storeZaps() { try { localStorage.setItem(ZAP_KEY, zaps); } catch (e) {} }
function addZaps(n) { zaps = Math.min(99, zaps + n); storeZaps(); zapUI(); }
function zapUI() {
    zapBtn.classList.toggle('armed', zapArmed);
    zapBtn.classList.toggle('empty', zaps === 0);
    document.getElementById('zap-count').textContent = zaps > 0 ? zaps : (Ads.rewardedReady() ? 'AD' : '0');
}
function setZapArmed(on) {
    zapArmed = on;
    zapUI();
    if (on) showToast('Tap a gem to zap it');
}

zapBtn.addEventListener('click', () => {
    if (isGameOver || Ads.isShowing()) return;
    Sound.play('tap');
    if (zapArmed) { setZapArmed(false); return; }
    if (zaps > 0) { setZapArmed(true); return; }
    if (Ads.rewardedReady()) Ads.showRewarded(watched => { if (watched) { addZaps(1); setZapArmed(true); } });
    else showToast(GAME.daily ? 'Finish the Daily Challenge for more Zaps' : 'No Zaps left');
});

// a tap on the board while armed: the gem under the finger (or the nearest one within a finger's width)
function zapAt(e) {
    const rect = board.getBoundingClientRect();
    const p = { x: (e.clientX - rect.left) * (GAME_WIDTH / rect.width), y: (e.clientY - rect.top) * (GAME_HEIGHT / rect.height) };
    const items = Composite.allBodies(engine.world).filter(b => b.tier !== undefined && !b.isMerging);
    let target = Matter.Query.point(items, p)[0];
    if (!target) {
        let nearest = 24;
        for (const b of items) {
            const gap = Math.hypot(b.position.x - p.x, b.position.y - p.y) - TIERS[b.tier];
            if (gap < nearest) { nearest = gap; target = b; }
        }
    }
    if (!target) { showToast('Tap a gem to zap it'); return; }
    FX.zap(target.position.x, target.position.y, TIERS[target.tier]);
    Composite.remove(engine.world, target);
    Sound.play('pop', Math.max(6, target.tier));
    Sound.play('combo', 6);
    Haptics.play('merge', 9, 0);
    zaps--;
    storeZaps();
    setZapArmed(false);
    saveGame();
}

function initZap() {
    if (!GAME.boosters) return;
    zapBtn.style.display = '';
    zapUI();
    setInterval(zapUI, 2000);   // the "AD" badge follows whether a rewarded ad is ready
}

// --- GEM SETS SCREEN ---
// Settings > Gems: every set with its 12 gems, the one in use, and what opens the locked ones.
// Picking a set reloads the page: the game in progress goes on with the new look.
const collection = document.getElementById('collection');
function renderSets() {
    const done = dailyState().total || 0;
    const list = document.getElementById('sets');
    list.innerHTML = '';
    for (const sk of SKINS) {
        const need = sk.dailies || 0, open = done >= need, inUse = sk === SKIN;
        const card = document.createElement('div');
        card.className = 'set-card' + (open ? '' : ' locked') + (inUse ? ' in-use' : '');
        const head = document.createElement('div');
        head.className = 'set-head';
        const name = document.createElement('b');
        name.textContent = sk.name;
        const state = document.createElement('span');
        state.textContent = inUse ? 'In use' : open ? '' : `Finish ${need} Daily Challenge${need > 1 ? 's' : ''} (${Math.min(done, need)}/${need})`;
        head.append(name, state);
        const gems = document.createElement('div');
        gems.className = 'set-gems';
        MODES[sk.id].sprites.forEach(src => { const im = document.createElement('img'); im.src = src; im.alt = ''; gems.append(im); });
        card.append(head, gems);
        if (open && !inUse) {
            const use = document.createElement('button');
            use.className = 'pill small green';
            use.textContent = 'Use';
            use.addEventListener('click', () => {
                try { localStorage.setItem(`${GAME.id}.skin`, sk.id); } catch (e) {}
                saveGame();
                location.reload();
            });
            card.append(use);
        }
        list.append(card);
    }
}
function initSkins() {
    if (SKINS.length < 2) return;
    const btn = document.getElementById('btn-gems');
    btn.style.display = '';
    btn.addEventListener('click', () => { settings.classList.remove('show'); renderSets(); collection.classList.add('show'); });
    document.getElementById('btn-close-collection').addEventListener('click', () => { collection.classList.remove('show'); settings.classList.add('show'); });
}

// short message over the board
const toastEl = document.getElementById('toast');
function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;   // restart the animation
    toastEl.classList.add('show');
}

bestEl.textContent = bestScore;
loadGame();
initDaily();
initZap();
initSkins();
window.addEventListener('resize', updateUI);
updateUI();
tickScore();
