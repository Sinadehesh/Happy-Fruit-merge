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

// Game events for the metagame (meta.js: levels, quests, Gem Rush, home menu, tutorial)
const gameEvents = {};
function onGame(name, fn) { (gameEvents[name] = gameEvents[name] || []).push(fn); }
function emitGame(name, ...args) { (gameEvents[name] || []).forEach(fn => fn(...args)); }

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
    'ocean': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_sea_glass', '02_pearl', '03_red_coral', '04_abalone', '05_amber', '06_larimar', '07_jellyfish', '08_black_pearl',
            '09_ammolite', '10_paraiba', '11_conch_pearl', '12_ocean_diamond'].map(n => `assets/ocean/${n}.png`)
    },
    'royal': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_jade', '02_carnelian', '03_citrine', '04_aquamarine', '05_amethyst_heart', '06_pink_sapphire', '07_emerald', '08_tanzanite',
            '09_ruby', '10_black_opal', '11_star_sapphire', '12_royal_diamond'].map(n => `assets/royal/${n}.png`)
    },
    'cosmic': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_moon_rock', '02_meteorite', '03_stardust', '04_comet_ice', '05_moonstone', '06_nebula', '07_saturn', '08_aurora',
            '09_sun_stone', '10_galaxy_egg', '11_black_hole', '12_star_heart'].map(n => `assets/cosmic/${n}.png`)
    },
    'volcano': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_pumice', '02_obsidian', '03_sulfur', '04_garnet', '05_blue_fire', '06_peridot', '07_fire_opal', '08_magma_glass',
            '09_sunstone', '10_molten_gold', '11_phoenix_egg', '12_dragons_eye'].map(n => `assets/volcano/${n}.png`)
    },
    // Gem Jar's sets that open with stars in the Gem Mine (GAME.skins mineStars)
    'pixel': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_pebble', '02_copper_coin', '03_slime', '04_potion', '05_heart', '06_gold_coin', '07_magic_orb', '08_emerald',
            '09_ruby', '10_chest', '11_crown', '12_pixel_diamond'].map(n => `assets/pixel/${n}.png`)
    },
    'odd': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_pillow', '02_cube', '03_pyramid', '04_cloud', '05_mushroom', '06_drop', '07_spiral_shell', '08_clover',
            '09_spinning_top', '10_bell', '11_infinity', '12_crystal_planet'].map(n => `assets/odd/${n}.png`)
    },
    'cyber': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_circuit_stone', '02_chip', '03_power_cell', '04_gear', '05_led_dome', '06_data_crystal', '07_energy_orb', '08_holo_cube',
            '09_robot_heart', '10_chrome_star', '11_processor', '12_quantum_diamond'].map(n => `assets/cyber/${n}.png`)
    },
    'neon': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_pebble', '02_heart', '03_triangle', '04_hexagon', '05_drop', '06_moon', '07_star', '08_rhombus',
            '09_cloud', '10_cats_eye', '11_crown', '12_rainbow_diamond'].map(n => `assets/neon/${n}.png`)
    },
    'pets': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_bunny', '02_chick', '03_duckling', '04_piglet', '05_frog', '06_hamster', '07_fox', '08_kitten',
            '09_whale', '10_lion_cub', '11_unicorn', '12_baby_dragon'].map(n => `assets/pets/${n}.png`)
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
// Gem sets (GAME.skins): the same game and saves with another look. The first is always open; each next one
// opens by making the gems GAME.unlocks asks for (counted from the moment the set before it opened), in order.
// The chosen set is remembered.
const UNLOCK_KEY = `${GAME.id}.unlock`;
const UNLOCK = (() => { try { return JSON.parse(localStorage.getItem(UNLOCK_KEY)) || {}; } catch (e) { return {}; } })();
UNLOCK.opened = UNLOCK.opened | 0;                                 // how many sets after the first are open
UNLOCK.made = Array.isArray(UNLOCK.made) ? UNLOCK.made : [];      // gems made toward the next one, per level
// The unlock link, to try every set without playing for it: ?unlock=all opens all the gem sets in this browser
// (UNLOCK.all), ?unlock=off closes them again; the sets earned by playing stay open and their progress is kept.
// (The app has no address bar, so it works on the web only.)
const UNLOCK_LINK = ['all', 'off'].includes(params.get('unlock')) ? params.get('unlock') : null;
if (UNLOCK_LINK) {
    UNLOCK.all = UNLOCK_LINK === 'all';
    try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(UNLOCK)); } catch (e) {}
    params.delete('unlock');
    try { history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash); } catch (e) {}
}
const SKINS = (GAME.skins || []).filter(sk => MODES[sk.id]);
// (a set with `mineStars` opens with that many stars in the Gem Mine instead, mine.js)
const skinOpen = i => UNLOCK.all ? !!SKINS[i] : SKINS[i] && SKINS[i].mineStars ? Mine.totalStars() >= SKINS[i].mineStars : i <= UNLOCK.opened;
const SKIN = (() => {
    if (!SKINS.length) return null;
    let id = null;
    try { id = localStorage.getItem(`${GAME.id}.skin`); } catch (e) {}
    return SKINS.find((sk, i) => sk.id === id && skinOpen(i)) || SKINS[0];
})();
const SPRITES = MODES[SKIN ? SKIN.id : MODE].sprites;
// A floating set (GAME.skins float: the Cosmic Gems) turns gravity around: gems are let go at the bottom of the
// jar and float up, the higher the level the faster and harder they rise (the weight below, the other way up),
// the jar fills from the top down and the line is near the bottom. In every mode (the Gem Mine's jars are turned
// upside down too). The physics is the plain game's mirror image, so it is just as hard.
const FLOAT = !!(SKIN && SKIN.float);
const DOWN = FLOAT ? -1 : 1;                        // the way gems fall: down (1) or up (-1)
const flipY = y => FLOAT ? GAME_HEIGHT - y : y;     // a height in a plain jar, measured from its top, in this jar
// Daily Challenge (GAME.daily, opened with ?daily): one special game a day, see DAILY CHALLENGE below
const DAILY = !!GAME.daily && params.has('daily');
// Gem Rush (GAME.rush, opened with ?rush): a 90-second race for points (the clock is in meta.js); not saved
const RUSH = !!GAME.rush && params.has('rush') && !DAILY;
// Gem Mine (GAME.mine, opened with ?mine=N): stage N, with its goal, drops, crates and jar shape (mine.js). Not saved.
const MINE = Mine.N;

// Reverse size (?size=reverse): the higher the level, the smaller the item.
// (Not in the Daily Challenge, which is the same game for everyone, nor in Gem Rush or the Gem Mine.)
// Not a plain flip of the normal sizes, which would make the dropped items nearly box-wide:
// level 1 starts at a normal drop size and each level shrinks by the same ratio down to the last.
const REVERSE = params.get('size') === 'reverse' && !DAILY && !RUSH && !MINE;
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
// (and in a Gem Mine stage, the same sequence on every try of that stage)
const dropRandom = DAILY ? seededRandom(DAY_SEED) : MINE ? seededRandom(Mine.seed) : Math.random;

// Game state
let isGameOver = false;
let currentTier = randomDropTier();
let nextTier = randomDropTier();
let afterTier = MINE ? randomDropTier() : 0;   // the Gem Mine shows the gem after the next one too
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
const BEST_KEY = RUSH ? `${GAME.id}.best.rush` : DAILY ? `${GAME.id}.best.daily` : MINE ? `${GAME.id}.best.mine`
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
board.classList.toggle('float', FLOAT);   // (the line, the guide and messages sit the other way up: index.html)

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
        if (shownScore > startBest && !MINE) {   // (a stage has stars, not a best score)
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

const next2Img = document.getElementById('next2-img');
function updateUI() {
    nextImg.src = SPRITES[nextTier];
    if (MINE) next2Img.src = SPRITES[afterTier];

    // The fruit you're about to drop hangs at the top (a floating set: at the bottom), following the pointer
    const scale = board.clientWidth / GAME_WIDTH;
    const r = TIERS[currentTier] * SPRITE_FIT;
    dropGuide.style.backgroundImage = `url('${SPRITES[currentTier]}')`;
    dropGuide.style.width = `${r * 2 * scale}px`;
    dropGuide.style.top = `${(spawnY(currentTier) - r) * scale}px`;
    dropGuide.style.left = `${dropX * scale}px`;
    aimLine.style.left = `${dropX * scale}px`;
    // the guide line: from the gem to the far end of the jar
    if (FLOAT) aimLine.style.height = `${Math.max(0, spawnY(currentTier) - r) * scale}px`;
    else aimLine.style.top = `${(spawnY(currentTier) + r) * scale}px`;
}

function spawnY(tier) {
    return flipY(TIERS[tier] + 10);
}

function clampX(x, tier) {
    return Math.max(TIERS[tier], Math.min(GAME_WIDTH - TIERS[tier], x));
}

// --- WORLD ---

// Extra solver iterations so heavy piles don't sink into each other
const engine = Engine.create({ positionIterations: 20, velocityIterations: 12 });
engine.gravity.y = DOWN;   // (floating sets: up)

// --- WEIGHT ---
// Every gem is heavier than the one before it, and it shows. Its mass grows with its size and density (each
// level is 1.3 to 4.4 times the one before). A dropped gem falls with a pull that grows with its level (the
// smallest drifts down a little lighter than plain gravity, bigger ones drop harder), it bounces less the
// heavier it is, and it lands with a thud, a buzz and a puff of dust that are deeper and stronger for heavier
// gems and harder landings, and a shake of the jar for the heavy ones (sound.js, haptics.js, fx.js). A gem
// already in the jar that falls into a gap lands the same way. In a floating set all of it works upward: the
// pull follows gravity, so the higher the level, the harder a gem shoots up.
const fallPull = tier => 0.8 + 0.1 * tier;                       // x gravity while a dropped gem is falling
const bounceOf = tier => Math.max(0.04, 0.24 - 0.018 * tier);     // how much it bounces (restitution)
const FULL_DROP_SPEED = 14;   // how fast a gem dropped from the top hits the floor of an empty jar, px per step
const impactOf = speed => Math.min(1.2, speed / FULL_DROP_SPEED);   // 1: a drop from the top to the floor
const KNOCK_SPEED = 3.5;      // a gem already in the jar knocking into something slower than this makes no sound
Events.on(engine, 'beforeUpdate', () => {
    const g = engine.gravity.y * engine.gravity.scale;
    for (const b of Composite.allBodies(engine.world)) {
        if (b.isDropping && b.tier !== undefined) b.force.y += b.mass * g * (fallPull(b.tier) - 1);
    }
});

// --- PULL --- (a set with pull: true in GAME.skins, the Cosmic Gems)
// Gems of the same level pull each other in, like planets, so alike gems near each other drift together, meet
// and merge. The higher the level, the stronger the pull. It falls off with the distance between them (as
// gravity does, 1 / distance squared) and reaches PULL_RANGE; gems of different levels don't pull each other.
// Each pair pulls both ways with the same force, so the jar as a whole doesn't move. Faint threads show the
// pairs that pull (fx.js).
const PULL = !!(SKIN && SKIN.pull);
const PULL_RANGE = 3.5;                       // how far the pull reaches, in touching distances (the two radii added)
const pullOf = tier => 0.5 + 0.08 * tier;     // x a gem's weight when the two touch, growing with the level
const PULL_MAX = 0.9;                         // never more than this x its weight, so a gem never flies up to another
let pullLinks = [];                           // the pairs pulling right now: [gem, gem, strength 0-1]
if (PULL) Events.on(engine, 'beforeUpdate', () => {
    pullLinks = [];
    if (isGameOver) return;
    const w = engine.gravity.scale;           // a gem's weight is its mass x this
    const gems = Composite.allBodies(engine.world).filter(b => b.tier !== undefined && !b.isMerging);
    for (let i = 0; i < gems.length; i++) {
        const a = gems[i];
        for (let j = i + 1; j < gems.length; j++) {
            const b = gems[j];
            if (a.tier !== b.tier) continue;
            const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y;
            const d = Math.hypot(dx, dy) || 1, touch = a.currentRadius + b.currentRadius;
            if (d > touch * PULL_RANGE) continue;
            const k = Math.min(PULL_MAX, pullOf(a.tier) * (touch / d) ** 2);
            const f = k * w * Math.min(a.mass, b.mass);
            a.force.x += f * dx / d; a.force.y += f * dy / d;
            b.force.x -= f * dx / d; b.force.y -= f * dy / d;
            pullLinks.push([a, b, k / PULL_MAX]);
        }
    }
});
// how fast two bodies meet, along the line between them
function meetSpeed(pair) {
    const n = pair.collision.normal, a = pair.bodyA.velocity, b = pair.bodyB.velocity;
    return Math.abs((a.x - b.x) * n.x + (a.y - b.y) * n.y);
}
// a gem landing: the sound, buzz and dust follow its level (its weight) and how hard it hit
function thud(gem, speed, scale = 1) {
    const impact = impactOf(speed) * scale;
    gem.lastThud = performance.now();
    Sound.play('land', gem.tier, impact);
    Haptics.play('land', gem.tier, impact);
    FX.thud(gem.position.x, FLOAT ? gem.bounds.min.y : gem.bounds.max.y, TIERS[gem.tier], gem.tier, impact);
}
// a gem already in the jar knocking hard into something (a big gem falling into a gap); the heavier of two
// gems makes the sound, and each gem at most every 0.35 s, so a settling pile stays quiet
function knock(a, b, speed) {
    if (speed < KNOCK_SPEED || a.isGrowing || b.isGrowing) return;
    const gem = [a, b].filter(x => x.tier !== undefined && !x.isMerging).sort((x, y) => y.tier - x.tier)[0];
    if (!gem || performance.now() - (gem.lastThud || 0) < 350) return;
    thud(gem, speed, 0.8);
}
const render = Render.create({
    element: board,
    engine: engine,
    options: { width: GAME_WIDTH, height: GAME_HEIGHT, wireframes: false, background: '#00000000' }  // the board's grid shows through
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

const wallOptions = { isStatic: true, render: { fillStyle: '#34495e' } };
const ground = Bodies.rectangle(GAME_WIDTH / 2, flipY(GAME_HEIGHT + 25), GAME_WIDTH, 50, wallOptions);   // (floating: the ceiling)
const leftWall = Bodies.rectangle(-25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);
const rightWall = Bodies.rectangle(GAME_WIDTH + 25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);
Composite.add(engine.world, [ground, leftWall, rightWall]);
// a Gem Mine stage adds its beams, pegs, crates and starting gems
if (MINE) Mine.setupWorld();

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

        // Touching or crossing the line is fine; you lose only when a landed item (or a crate) is
        // entirely above it (its lowest point is above the line; floating: entirely below it)
        if ((body.tier !== undefined || body.crate) && !body.isGrowing && !body.isDropping) {
            if (FLOAT ? body.bounds.min.y > GAME_HEIGHT - DANGER_Y : body.bounds.max.y < DANGER_Y) {
                if (Math.abs(body.velocity.y) < 2 && Math.abs(body.velocity.x) < 2) {
                    isAnyBodyAboveLine = true;
                }
            }
        }
    });

    if (isAnyBodyAboveLine) {
        dangerTimer++;
        if (dangerTimer > 180) gameOver('full');
    } else {
        dangerTimer = 0;
    }
});
// the Gem Mine counts physics steps: a stage ends a moment after its goal is met, or once the last drop has settled
Events.on(engine, 'afterUpdate', () => { if (MINE) Mine.tick(); });

// The end of a game: the jar is full ('full'), in Gem Rush the clock ran out ('time', from meta.js), or in a
// Gem Mine stage the goal was met ('win') or the drops ran out ('drops', from mine.js)
const FULL_TITLE = document.getElementById('go-title').textContent;
function gameOver(reason) {
    if (isGameOver) return;
    isGameOver = true;
    clearSave();   // the next visit starts a fresh game
    zapArmed = starArmed = false;
    lastDrop = null;
    document.getElementById('go-title').textContent = reason === 'time' ? "Time's up!" : FULL_TITLE;
    document.getElementById('go-score').textContent = score;
    document.getElementById('go-best-val').textContent = bestScore;
    document.getElementById('go-new').style.display = isNewBest ? 'block' : 'none';
    document.getElementById('gameover').classList.add('show');
    // in the app: the player may watch an ad to keep going (clearing the top of the jar), MAX_REVIVES times a game
    const canRevive = reason === 'full' && revives < MAX_REVIVES && Ads.canRevive();
    document.getElementById('revive').style.display = canRevive ? 'block' : 'none';
    document.getElementById('revive-text').textContent = (revives === MAX_REVIVES - 1 ? 'Last chance: w' : 'W') + `atch a short ad to clear the ${FLOAT ? 'bottom' : 'top'} of the jar`;
    showNextSetProgress();
    if (reason === 'full' || reason === 'time') {
        Sound.play('gameOver');
        Haptics.play('gameOver');
    }
    if (MINE) Mine.end(reason);   // stars, goals and the stage's buttons (and its own sounds)
    emitGame('gameOver', reason, score);
}

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
    if (holding !== null || isGameOver || Ads.isShowing() || e.target.closest('.topbar, .booster, .no-drop')) return;
    if (zapArmed) { zapAt(e); return; }     // Zap booster: this tap picks the gem to strike
    if (starArmed) { starAt(e); return; }   // Star booster: this tap picks the gem to lift
    if (MINE && !Mine.canDrop()) return;    // a stage's drops are used up
    holding = e.pointerId;
    try { playArea.setPointerCapture(e.pointerId); } catch (err) {}   // keep following outside the board
    dropX = clampX(pointerToGameX(e), currentTier);
    setHeld(true);
    Haptics.play('pickup');
    emitGame('pickup');
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
    if (MINE && !Mine.canDrop()) return;
    emitGame('drop', currentTier, dropX);
    Sound.play('drop', currentTier);   // (higher and lighter for a small gem, lower for a heavy one)
    Haptics.play('drop', currentTier);
    if (UNDO_HERE) lastDrop = snapshot();   // the Undo booster can take this drop back
    if (++dropsWithoutMerge > COMBO_BREAK) combo = 0;

    spawnItem(dropX, spawnY(currentTier), currentTier, false);
    if (FLOAT) floatHint();

    currentTier = nextTier;
    if (MINE) { nextTier = afterTier; afterTier = randomDropTier(); }
    else nextTier = randomDropTier();
    dropX = clampX(dropX, currentTier);
    updateUI();
    if (MINE) Mine.afterDrop();

    if (!MINE) Ads.onDrop();   // (never an ad in the middle of a stage)
}

// the first 3 games with a floating set say what's going on, at the first drop
let floatHinted = false;
function floatHint() {
    if (floatHinted) return;
    floatHinted = true;
    let told = 0;
    try { told = +localStorage.getItem(`${GAME.id}.floatTold`) || 0; localStorage.setItem(`${GAME.id}.floatTold`, told + 1); } catch (e) {}
    if (told < 3) showToast('Zero gravity: these gems float up!');
}

// --- MERGING ---

// A dropped item lands when it touches the floor, an item that has already landed, or (in the Gem Mine)
// a crate or a part of the jar. Only landed items may merge, so spamming drops can't merge items in mid-air at the top.
function isLanded(body) {
    return body === ground || body.crate || body.jarPart || (body.tier !== undefined && !body.isDropping);
}
function landed(body, speed) {
    body.isDropping = false;
    thud(body, speed);
}

function handleCollisions(event) {
    if (isGameOver) return;
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        const speed = meetSpeed(pairs[i]);
        if (bodyA.isDropping && isLanded(bodyB)) landed(bodyA, speed);
        if (bodyB.isDropping && isLanded(bodyA)) landed(bodyB, speed);
        if (bodyA.isDropping || bodyB.isDropping) continue;
        if (event.name === 'collisionStart') knock(bodyA, bodyB, speed);

        if (bodyA.tier === undefined || bodyB.tier === undefined) continue;
        if (bodyA.tier !== bodyB.tier || bodyA.tier >= TIERS.length - 1) continue;
        if (bodyA.isMerging || bodyB.isMerging) continue;
        bodyA.isMerging = true;
        bodyB.isMerging = true;

        const mergedTier = bodyA.tier + 1;
        combo++;
        dropsWithoutMerge = 0;
        const points = addScore(mergedTier);
        // made from a gem a Gem Mine stage started with: counts for the stage, not for gem sets or quests
        const seeded = !!(bodyA.seeded || bodyB.seeded);
        dailyOnMerge(mergedTier);
        if (!seeded) countForNextSet(mergedTier);
        emitGame('merge', mergedTier, points, combo, seeded);

        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;
        if (MINE) Mine.onMerge(midX, midY, mergedTier, bodyA, bodyB);   // goals, and the crates it touches
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
        const merged = spawnItem(midX, midY, mergedTier, true);
        if (seeded) merged.seeded = true;
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
        restitution: bounceOf(tier),   // heavier gems bounce less (see WEIGHT)
        friction: 0.5,
        density: 0.001 * (tier + 1),
        slop: 0.01,
        render: { sprite: { texture: SPRITES[tier], xScale: scale, yScale: scale } },
        tier: tier
    });
    // Set after creation: Matter rewrites sprite offsets from the hitbox bounds while creating the body
    body.render.sprite.xOffset = centre.x / SPRITE_SIZE;
    body.render.sprite.yOffset = centre.y / SPRITE_SIZE;

    if (animateGrowth) Body.setVelocity(body, { x: 0, y: 2 * DOWN }); // slight push the way gems fall (dev plan §4)
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
    if (MINE) { Mine.again(); return; }   // the next stage, or the same one again
    Ads.showInterstitial(() => { clearSave(); location.reload(); });
});

// Keep going (Android app): the player chose to watch a rewarded ad, so the top of the jar is cleared
// with a burst and the same game goes on, score and all. Twice a game at most (MAX_REVIVES).
document.getElementById('btn-revive').addEventListener('click', () => {
    Ads.showRewarded(watched => { if (watched) revive(); });
});

function revive() {
    revives++;
    lastDrop = null;   // (nothing to undo: the drop that filled the jar is gone)
    const clearAbove = DANGER_Y + 130;   // everything reaching into the top part of the jar (floating: the bottom part)
    const inThere = b => FLOAT ? b.bounds.max.y > GAME_HEIGHT - clearAbove : b.bounds.min.y < clearAbove;
    Composite.allBodies(engine.world).filter(b => (b.tier !== undefined || b.crate) && inThere(b)).forEach(b => {
        if (b.crate) { Mine.breakCrate(b); return; }   // (a Gem Mine crate up there counts as broken)
        FX.merge(b.position.x, b.position.y, TIERS[b.tier], 0);
        Composite.remove(engine.world, b);
    });
    isGameOver = false;
    dangerTimer = 0;
    saving = !RUSH && !MINE;
    document.getElementById('gameover').classList.remove('show');
    Sound.play('praise', 2);
    Haptics.play('praise', 2);
    saveGame();
    emitGame('revive');
}

// --- SAVE ---
// The game in progress is saved in the browser (one save per mode, and per Reverse setting) about
// every second and when the page is hidden or closed, so it comes back exactly where you left it.
const SAVE_KEY = DAILY ? `${GAME.id}.save.daily` : `${GAME.id}.save.${MODE}${REVERSE ? '.reverse' : ''}`;
let saving = !RUSH && !MINE;     // a Gem Rush or a Gem Mine stage is not saved: leaving it ends it
let revives = 0;       // how many times the "keep going" ad was used this game
const MAX_REVIVES = 2;

function saveGame() {
    if (!saving || isGameOver) return;
    const items = Composite.allBodies(engine.world)
        .filter(b => b.tier !== undefined && !b.isMerging)
        .map(b => [b.tier, +b.position.x.toFixed(1), +b.position.y.toFixed(1), +b.angle.toFixed(3)]);
    const data = { v: 1, score, current: currentTier, next: nextTier, combo, dropsWithoutMerge, revived: revives, items, float: FLOAT };
    if (DAILY) Object.assign(data, { date: TODAY, rng: dropRandom.getState(), made, maxCombo });
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}

function clearSave() {
    saving = false;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

function loadGame() {
    if (RUSH || MINE) return;
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    if (!data || data.v !== 1 || !Array.isArray(data.items)) return;
    if (DAILY && data.date !== TODAY) return;   // yesterday's daily game: today's starts fresh
    const okTier = t => Number.isInteger(t) && t >= 0 && t < TIERS.length;
    // saved with a set that falls the other way (the set was changed): the pile is turned upside down
    const turn = !!data.float !== FLOAT;
    for (const [tier, x, y, angle] of data.items) {
        if (!okTier(tier)) continue;
        const body = spawnItem(x, turn ? GAME_HEIGHT - y : y, tier, false);
        Body.setAngle(body, (turn ? -1 : 1) * (angle || 0));
        body.isDropping = false;   // it was already in the pile
    }
    score = shownScore = Math.max(0, data.score | 0);
    scoreEl.textContent = score;
    isNewBest = score > 0 && score >= bestScore;
    if (okTier(data.current)) currentTier = data.current;
    if (okTier(data.next)) nextTier = data.next;
    combo = data.combo | 0;
    dropsWithoutMerge = data.dropsWithoutMerge | 0;
    revives = data.revived === true ? 1 : Math.max(0, data.revived | 0);   // (older saves: true or false)
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
// (and stays paused after it while a panel or the home menu is still covering the game)
Ads.init({
    onPause: () => Runner.stop(runner),
    onResume: () => { if (!document.querySelector('.overlay.show') && !(window.Meta && Meta.menuOpen)) Runner.run(runner, engine); }
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
if (DAILY || MINE) sizeBtn.style.display = 'none';
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
    document.getElementById('btn-voice').className = `pill ${p.voice ? 'green' : 'grey'}`;
    document.getElementById('btn-voice').textContent = `Voice ${p.voice ? 'On' : 'Off'}`;
}
document.getElementById('btn-sfx').addEventListener('click', () => { Sound.setSfx(!Sound.prefs().sfx); Sound.play('tap'); audioButtons(); });
document.getElementById('btn-music').addEventListener('click', () => { Sound.unlock(); Sound.nextMusic(); Sound.play('tap'); audioButtons(); });
document.getElementById('btn-voice').addEventListener('click', () => { Sound.setVoice(!Sound.prefs().voice); audioButtons(); });
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
FX.flip(FLOAT);
// the threads between gems that pull each other (PULL), from edge to edge, where no other gem is in the way
if (PULL) FX.threads(() => {
    const gems = Composite.allBodies(engine.world).filter(b => b.tier !== undefined);
    const clear = (a, b) => gems.every(c => {
        if (c === a || c === b) return true;
        const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y, L = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((c.position.x - a.position.x) * dx + (c.position.y - a.position.y) * dy) / L));
        return Math.hypot(a.position.x + t * dx - c.position.x, a.position.y + t * dy - c.position.y) > c.currentRadius * 0.8;
    });
    return pullLinks.filter(([a, b]) => clear(a, b)).map(([a, b, s]) => [a.position.x, a.position.y, a.currentRadius, b.position.x, b.position.y, b.currentRadius, s]);
});

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
    emitGame('daily', st.streak);
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
        exit.addEventListener('click', () => { saveGame(); goHome(); });
        updateGoal();
    } else {
        const btn = document.getElementById('btn-daily');
        if (!GAME.menu) btn.style.display = '';   // with the home menu, the Daily Challenge is opened from there
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
    if (on && starArmed) setStarArmed(false);
    zapUI();
    if (on) showToast(MINE ? 'Tap a gem or a crate to zap it' : 'Tap a gem to zap it');
}

zapBtn.addEventListener('click', () => {
    if (isGameOver || Ads.isShowing()) return;
    Sound.play('tap');
    if (zapArmed) { setZapArmed(false); return; }
    if (zaps > 0) { setZapArmed(true); return; }
    if (Ads.rewardedReady()) Ads.showRewarded(watched => { if (watched) { addZaps(1); setZapArmed(true); } });
    else showToast(GAME.daily ? 'Finish the Daily Challenge for more Zaps' : 'No Zaps left');
});

// the gem under the finger (or the nearest one within a finger's width) for a booster;
// withCrates: a Gem Mine crate can be picked too
function gemAt(e, withCrates) {
    const rect = board.getBoundingClientRect();
    const p = { x: (e.clientX - rect.left) * (GAME_WIDTH / rect.width), y: (e.clientY - rect.top) * (GAME_HEIGHT / rect.height) };
    const items = Composite.allBodies(engine.world).filter(b => (b.tier !== undefined || (withCrates && b.crate)) && !b.isMerging);
    let target = Matter.Query.point(items, p)[0];
    if (!target) {
        let nearest = 24;
        for (const b of items) {
            const gap = Math.hypot(b.position.x - p.x, b.position.y - p.y) - (b.crate ? 30 : TIERS[b.tier]);
            if (gap < nearest) { nearest = gap; target = b; }
        }
    }
    return target || null;
}

// a tap on the board while the Zap is armed (in the Gem Mine, a crate can be zapped: it breaks)
function zapAt(e) {
    const target = gemAt(e, !!MINE);
    if (!target) { showToast(MINE ? 'Tap a gem or a crate to zap it' : 'Tap a gem to zap it'); return; }
    if (target.crate) {
        FX.zap(target.position.x, target.position.y, 30);
        Mine.breakCrate(target);
    } else {
        FX.zap(target.position.x, target.position.y, TIERS[target.tier]);
        Composite.remove(engine.world, target);
    }
    Sound.play('pop', Math.max(6, target.tier | 0));
    Sound.play('combo', 6);
    Haptics.play('merge', 9, 0);
    zaps--;
    storeZaps();
    setZapArmed(false);
    saveGame();
    emitGame('booster', 'zap');
}

function initZap() {
    if (!GAME.boosters) return;
    zapBtn.style.display = '';
    zapUI();
    setInterval(() => { zapUI(); starUI(); undoUI(); }, 2000);   // the "AD" badge follows whether a rewarded ad is ready
}

// --- STAR BOOSTER ---
// Lifts one gem you choose to the next level (not the best gem, which has nowhere to go). It opens at a
// level (meta.js calls setStarOpen); Stars come from levels and quests, or an ad in the Android app.
// A lifted gem doesn't count toward gem sets or the Daily Challenge: only merges do.
const STAR_KEY = `${GAME.id}.stars`;
const starBtn = document.getElementById('btn-star');
let stars = 0;
try { const v = localStorage.getItem(STAR_KEY); if (v !== null) stars = Math.max(0, parseInt(v, 10) || 0); } catch (e) {}
let starArmed = false;

function storeStars() { try { localStorage.setItem(STAR_KEY, stars); } catch (e) {} }
function addStars(n) { stars = Math.min(99, stars + n); storeStars(); starUI(); }
function starUI() {
    starBtn.classList.toggle('armed', starArmed);
    starBtn.classList.toggle('empty', stars === 0);
    document.getElementById('star-count').textContent = stars > 0 ? stars : (Ads.rewardedReady() ? 'AD' : '0');
}
function setStarArmed(on) {
    starArmed = on;
    if (on && zapArmed) setZapArmed(false);
    starUI();
    if (on) showToast('Tap a gem to make it better');
}
function setStarOpen(on) { starBtn.style.display = on && GAME.boosters ? '' : 'none'; starUI(); trayLayout(); }

starBtn.addEventListener('click', () => {
    if (isGameOver || Ads.isShowing()) return;
    Sound.play('tap');
    if (starArmed) { setStarArmed(false); return; }
    if (stars > 0) { setStarArmed(true); return; }
    if (Ads.rewardedReady()) Ads.showRewarded(watched => { if (watched) { addStars(1); setStarArmed(true); } });
    else showToast('Level up and finish quests for Stars');
});

function starAt(e) {
    const target = gemAt(e);
    if (!target) { showToast('Tap a gem to make it better'); return; }
    if (target.tier >= TIERS.length - 1) { showToast('That one is already the best'); return; }
    const { x, y } = target.position, tier = target.tier + 1;
    Composite.remove(engine.world, target);
    const lifted = spawnItem(x, y, tier, true);
    lifted.isDropping = false;
    FX.merge(x, y, TIERS[tier], 0);
    Sound.play('star', 2);
    Sound.play('pop', tier);
    Haptics.play('praise', 2);
    stars--;
    storeStars();
    setStarArmed(false);
    saveGame();
    emitGame('booster', 'star');
}

// --- UNDO BOOSTER ---
// Takes back the last drop: the jar, the score and the gem in hand go back to the moment before it. (What the
// drop already earned in XP, quests and gem sets stays.) It opens at a level (meta.js calls setUndoOpen); you
// start with one, more come from the Lucky Wheel and the Daily Gift, or an ad in the Android app. Not in Gem
// Rush (the clock is the game) or in a Gem Mine stage (which has its own "+5 drops").
const UNDO_KEY = `${GAME.id}.undos`;
const undoBtn = document.getElementById('btn-undo');
const UNDO_HERE = !!GAME.boosters && !RUSH && !MINE;
let undos = 1;
try { const v = localStorage.getItem(UNDO_KEY); if (v !== null) undos = Math.max(0, parseInt(v, 10) || 0); } catch (e) {}
let lastDrop = null;   // the game just before the last drop (snapshot), or null when there is nothing to undo

function storeUndos() { try { localStorage.setItem(UNDO_KEY, undos); } catch (e) {} }
function addUndos(n) { undos = Math.min(99, undos + n); storeUndos(); undoUI(); }
function undoUI() {
    undoBtn.classList.toggle('empty', undos === 0 || !lastDrop);
    document.getElementById('undo-count').textContent = undos > 0 ? undos : (Ads.rewardedReady() ? 'AD' : '0');
}
function setUndoOpen(on) {
    undoBtn.style.display = on && UNDO_HERE ? '' : 'none';
    undoUI();
    trayLayout();
}
// with both the Star and the Undo there, the Undo sits beside the Star and NEXT moves over to make room
function trayLayout() {
    const shown = el => el.style.display !== 'none';
    document.querySelector('.tray').classList.toggle('three', shown(undoBtn) && shown(starBtn));
}

function snapshot() {
    return {
        items: Composite.allBodies(engine.world).filter(b => b.tier !== undefined && !b.isMerging).map(b => ({
            tier: b.tier, x: b.position.x, y: b.position.y, angle: b.angle,
            vx: b.velocity.x, vy: b.velocity.y, spin: b.angularVelocity, dropping: !!b.isDropping })),
        score, bestScore, isNewBest, combo, dropsWithoutMerge, current: currentTier, next: nextTier,
        daily: DAILY ? { rng: dropRandom.getState(), made: made.slice(), maxCombo } : null
    };
}

function undoLastDrop() {
    const s = lastDrop;
    if (!s || isGameOver) return;
    lastDrop = null;
    Composite.allBodies(engine.world).filter(b => b.tier !== undefined).forEach(b => Composite.remove(engine.world, b));
    for (const it of s.items) {
        const body = spawnItem(it.x, it.y, it.tier, false);
        Body.setAngle(body, it.angle);
        Body.setVelocity(body, { x: it.vx, y: it.vy });
        Body.setAngularVelocity(body, it.spin);
        body.isDropping = it.dropping;
    }
    score = shownScore = s.score;
    scoreEl.textContent = score;
    bestScore = s.bestScore;
    isNewBest = s.isNewBest;
    try { localStorage.setItem(BEST_KEY, bestScore); } catch (e) {}
    bestEl.textContent = Math.max(startBest, score);
    if (score <= startBest) { tickScore.crowned = false; document.getElementById('best-box').classList.remove('new-best'); }
    combo = s.combo;
    dropsWithoutMerge = s.dropsWithoutMerge;
    currentTier = s.current;
    nextTier = s.next;
    if (s.daily) {   // the Daily Challenge: the same drops come again, and what this drop made is taken back
        dropRandom.setState(s.daily.rng);
        s.daily.made.forEach((n, t) => { made[t] = n; });
        maxCombo = s.daily.maxCombo;
        updateGoal();
    }
    dangerTimer = 0;
    dropX = clampX(dropX, currentTier);
    updateUI();
    undoUI();
    Sound.play('star', 0);
    Haptics.play('praise', 1);
    showToast('Drop taken back');
    saveGame();
    emitGame('booster', 'undo');
}

undoBtn.addEventListener('click', () => {
    if (isGameOver || Ads.isShowing()) return;
    Sound.play('tap');
    if (!lastDrop) { showToast('Drop a gem first: Undo takes it back'); return; }
    if (undos > 0) { undos--; storeUndos(); undoLastDrop(); return; }
    if (Ads.rewardedReady()) Ads.showRewarded(watched => { if (watched) undoLastDrop(); });
    else showToast('Spin the Lucky Wheel for more Undos');
});

// --- GEM SETS ---
// The next locked set (if its art is in the game) opens when enough of the gems it asks for have been made:
// GAME.unlocks[k] lists [level, how many] for the k-th set after the first. Every game counts, daily ones too.
// The Gems screen (Settings > Gems) and the game-over panel show what to make as pictures of the gems, with counts.
const nextSetIndex = () => (!UNLOCK.all && UNLOCK.opened + 1 < SKINS.length && GAME.unlocks && GAME.unlocks[UNLOCK.opened]) ? UNLOCK.opened + 1 : -1;
const needsFor = i => (GAME.unlocks && GAME.unlocks[i - 1]) || [];

function countForNextSet(tier) {
    const next = nextSetIndex();
    if (next < 0) return;
    const needs = needsFor(next);
    if (!needs.some(([t]) => t === tier)) return;
    UNLOCK.made[tier] = (UNLOCK.made[tier] | 0) + 1;
    const done = needs.every(([t, n]) => (UNLOCK.made[t] | 0) >= n);
    if (done) { UNLOCK.opened++; UNLOCK.made = []; }
    try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(UNLOCK)); } catch (e) {}
    if (done) {
        Sound.play('maxMerge', () => { FX.praise(4, true); Haptics.play('maxMerge'); });
        showToast(`New gems unlocked: ${SKINS[next].name}!`);
    }
}

// the gems to make, as pictures (in the look in use) with how many so far; or, for a set that opens in the
// Gem Mine, the pickaxe and the stars so far
function needChips(i, counting) {
    const row = document.createElement('div');
    row.className = 'need' + (counting || SKINS[i].mineStars ? '' : ' later');
    if (SKINS[i].mineStars) {
        const chip = document.createElement('span');
        for (const src of ['assets/mine/icon_pickaxe.png', 'assets/ui/icon_star.png']) { const im = document.createElement('img'); im.src = src; im.alt = ''; chip.append(im); }
        chip.append(`${Math.min(Mine.totalStars(), SKINS[i].mineStars)}/${SKINS[i].mineStars}`);
        row.append(chip);
        return row;
    }
    for (const [t, n] of needsFor(i)) {
        const chip = document.createElement('span');
        const im = document.createElement('img');
        im.src = SPRITES[t];
        im.alt = '';
        chip.append(im, `${counting ? Math.min(UNLOCK.made[t] | 0, n) : 0}/${n}`);
        row.append(chip);
    }
    return row;
}

const collection = document.getElementById('collection');
function renderSets() {
    const list = document.getElementById('sets');
    list.innerHTML = '';
    const next = nextSetIndex();
    SKINS.forEach((sk, i) => {
        const open = skinOpen(i), inUse = sk === SKIN;
        const card = document.createElement('div');
        card.className = 'set-card' + (open ? '' : ' locked') + (inUse ? ' in-use' : '');
        const head = document.createElement('div');
        head.className = 'set-head';
        const name = document.createElement('b');
        name.textContent = sk.name;
        const state = document.createElement('span');
        state.textContent = inUse ? 'In use' : '';
        head.append(name, state);
        const gems = document.createElement('div');
        gems.className = 'set-gems';
        MODES[sk.id].sprites.forEach(src => { const im = document.createElement('img'); im.src = src; im.alt = ''; gems.append(im); });
        card.append(head, gems);
        const notes = [sk.float && '⬆ Zero gravity: drop them from the bottom and they float up', sk.pull && 'alike gems pull each other in'].filter(Boolean);
        if (notes.length) {
            const note = document.createElement('div');
            note.className = 'set-note';
            note.textContent = notes.join(', ');
            card.append(note);
        }
        if (!open) card.append(needChips(i, i === next));
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
    });
}
// on the game-over panel: how far the next set is
function showNextSetProgress() {
    const box = document.getElementById('go-unlock');
    const next = nextSetIndex();
    box.innerHTML = '';
    box.style.display = next < 0 ? 'none' : 'block';
    if (next < 0) return;
    const name = document.createElement('div');
    name.className = 'go-unlock-name';
    name.textContent = SKINS[next].name;
    box.append(name, needChips(next, true));
}
function initSkins() {
    if (SKINS.length < 2) return;
    const btn = document.getElementById('btn-gems');
    btn.style.display = '';
    btn.addEventListener('click', () => { settings.classList.remove('show'); renderSets(); collection.dataset.from = 'settings'; collection.classList.add('show'); });
    // back to where it was opened from: the settings, or the home menu (meta.js)
    document.getElementById('btn-close-collection').addEventListener('click', () => {
        collection.classList.remove('show');
        if (collection.dataset.from !== 'menu') settings.classList.add('show');
    });
}

// back to the main game (meta.js replaces this with the home menu)
function goHome() { location.href = location.pathname; }

// short message over the board
const toastEl = document.getElementById('toast');
function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;   // restart the animation
    toastEl.classList.add('show');
}

// the unlock link was used: show the Collection with every set open (or say they're closed again)
if (UNLOCK_LINK && SKINS.length > 1) window.addEventListener('load', () => setTimeout(() => {
    const tile = document.getElementById('tile-gems');
    if (UNLOCK_LINK === 'all') {
        if (window.Meta && Meta.menuOpen && tile) tile.click();
        else { renderSets(); collection.dataset.from = 'settings'; collection.classList.add('show'); }
    }
    const say = UNLOCK_LINK === 'all' ? 'Every gem set is open' : 'Gem sets: back to the ones you earned';
    if (window.Meta && Meta.menuOpen && Meta.showToastMenu) Meta.showToastMenu(say); else showToast(say);
}, 300));

bestEl.textContent = bestScore;
loadGame();
initDaily();
initZap();
initSkins();
window.addEventListener('resize', updateUI);
updateUI();
tickScore();
