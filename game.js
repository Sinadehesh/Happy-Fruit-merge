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
        sprites: ['01_space_pebble', '02_asteroid', '03_comet', '04_moon', '05_mars', '06_earth', '07_gas_giant', '08_saturn',
            '09_sun', '10_black_hole', '11_galaxy', '12_universe_gem'].map(n => `assets/cosmic/${n}.png`)
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
// A water set (GAME.skins water: the Ocean Jewels): the jar is full of water and every gem floats or sinks by its
// level, see WATER below. Not in the Gem Mine, whose stages are built for gems that fall to the floor.
// (water: true, or an object that changes some of these numbers)
const WATER = SKIN && SKIN.water && !FLOAT && !MINE ? Object.assign({
    y: 195,            // where the water's surface is (the line is at DANGER_Y)
    floaters: 3,       // how many of the lowest levels float
    light: -0.75,      // what the lowest level weighs under water, x its weight in the air (below 0: it floats)
    lightTop: -0.2,    // ... and the highest level that still floats
    heavy: 0.5,        // ... the first level that sinks
    heavyTop: 1,       // ... and the highest level of all
    drag: 0.016,       // how much the water slows a gem (added to its air friction), and
    dragFast: 0.003    // ... how much more for every px a step it moves, so a gem that plunges in is braked hard
}, SKIN.water === true ? null : SKIN.water) : null;
// A volcano set (GAME.skins erupt: the Volcano Gems): merges heat the volcano, and when it is full the player gets a
// lava bomb to drop, see LAVA BOMB below. Not in the Gem Mine, whose stages are measured without it.
// (erupt: true, or an object that changes these numbers)
const ERUPT = SKIN && SKIN.erupt && !MINE ? Object.assign({
    full: 70,     // how much heat fills the bar; a merge adds the level of the gem it makes
    blast: 110,   // the bomb burns the gems whose middle is within this many px of where it goes off...
    burns: 5,     // ...of this many lowest levels (the ones that are dropped); the gems made by merging are too tough
    size: 24      // the bomb's own size (its radius, like TIERS)
}, SKIN.erupt === true ? null : SKIN.erupt) : null;
// A twins set (GAME.skins twins: the Royal Treasury): every drop is a pair of the same gem, mirrored left and
// right, see ROYAL TWINS below. Not in the Gem Mine, whose stages count on one gem a drop.
const TWINS = !!(SKIN && SKIN.twins) && !FLOAT && !MINE;
// A calling set (GAME.skins call: the Gem Pets): the same gems in the jar jump to the finger, while a gem is held
// and when it is dropped, see COME HERE below. In every mode. (call: true, or an object that changes these numbers)
const CALL = SKIN && SKIN.call && !FLOAT ? Object.assign({
    wait: 12,       // physics steps a gem is held before the others answer
    after: 30,      // steps the call lasts after the finger let go, the dropped gem landed and the last pet came down
    longest: 240,   // ...but never more than this many steps after the finger let go
    apart: 5,       // steps between one pet setting off and the next
    rest: 10,       // steps a pet waits after it has landed before it may jump again
    least: 30,      // no jump is lower than this (px)...
    over: 12,       // ...and it clears what lies in its way by this much
    // Each pet, by level: its weight (x what a gem of its level and size weighs: every level is about 3 times the
    // one before) and its jump: how high it can lift itself, in px (the jar is 640 high). A better jumper also
    // crosses faster, and pushes harder: a pet can throw off what lies on it up to `push` x its own weight x
    // its jump / 100 (a bunny: a chick and a duckling; a duckling: a piglet; a piglet: a frog; a frog: nearly all).
    push: 5,
    pets: [
        { name: 'bunny',       weight: 0.8, jump: 260 },   // light, a great jumper
        { name: 'chick',       weight: 0.6, jump: 200 },   // the lightest for its size, flutters a fair way
        { name: 'duckling',    weight: 0.9, jump: 160 },   // waddles: low hops
        { name: 'piglet',      weight: 1.6, jump: 100 },   // heavy: it only gets over the small ones
        { name: 'frog',        weight: 1.0, jump: 340 },   // the best jumper of all
        { name: 'hamster',     weight: 0.9, jump: 120 },
        { name: 'fox',         weight: 1.0, jump: 280 },
        { name: 'kitten',      weight: 0.9, jump: 300 },
        { name: 'whale',       weight: 1.8, jump: 60 },    // the heaviest for its size: it barely leaves the ground
        { name: 'lion cub',    weight: 1.3, jump: 260 },
        { name: 'unicorn',     weight: 1.1, jump: 340 },
        { name: 'baby dragon', weight: 1.4, jump: 420 }
    ]
}, SKIN.call === true ? null : SKIN.call) : null;
const petOf = tier => (CALL && CALL.pets[tier]) || { weight: 1, jump: 200 };
const weightOf = tier => CALL ? petOf(tier).weight : 1;   // x the weight its level gives it (see WEIGHT)
const strengthOf = gem => CALL.push * gem.mass * petOf(gem.tier).jump / 100;   // the weight it can throw off its back

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
if (WATER) { board.classList.add('water'); board.style.setProperty('--water', `${WATER.y / GAME_HEIGHT * 100}%`); }   // (the water's tint)

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
    const inHand = bomb === 2;   // (a lava bomb, LAVA BOMB)
    const r = inHand ? ERUPT.size * BOMB_GLOW : TIERS[currentTier] * SPRITE_FIT;
    dropGuide.style.backgroundImage = `url('${inHand ? bombUrl : SPRITES[currentTier]}')`;
    dropGuide.style.width = `${r * 2 * scale}px`;
    dropGuide.style.top = `${((inHand ? ERUPT.size + 10 : spawnY(currentTier)) - r) * scale}px`;
    if (ERUPT) { dropGuide.classList.toggle('bomb', inHand); dropGuide.style.setProperty('--blast', ERUPT.blast / r); }
    const [x, x2] = TWINS ? twinSpots(dropX, currentTier) : [dropX];
    dropGuide.style.left = `${x * scale}px`;
    aimLine.style.left = `${x * scale}px`;
    // the guide line: from the gem to the far end of the jar
    if (FLOAT) aimLine.style.height = `${Math.max(0, spawnY(currentTier) - r) * scale}px`;
    else aimLine.style.top = `${(spawnY(currentTier) + r) * scale}px`;
    if (TWINS) {   // the twin, mirrored
        for (const k of ['backgroundImage', 'width', 'top']) dropGuide2.style[k] = dropGuide.style[k];
        dropGuide2.style.left = aimLine2.style.left = `${x2 * scale}px`;
        aimLine2.style.top = aimLine.style.top;
    }
}

function spawnY(tier) {
    return flipY(TIERS[tier] + 10);
}

// --- ROYAL TWINS --- (a set with twins in GAME.skins, the Royal Treasury)
// Every gem comes as a pair of twins: one falls where the finger is, the other as far from the other wall,
// mirrored about the middle of the jar. Held near the middle, where the two would overlap, they hang side by
// side and touch, so they merge with each other as they land: a drop in the middle is one gem of the next level,
// a drop at the side two gems, one each side. It is the same for every drop: nothing here is left to chance.
function twinSpots(x, tier) {   // where the two fall: [the finger's gem, its twin]
    const mid = GAME_WIDTH / 2, side = x <= mid ? -1 : 1;
    const off = Math.max(Math.abs(x - mid), TIERS[tier] + 0.5);   // (never closer than touching)
    return [mid + side * off, mid - side * off];
}
function dropTwins() {
    const [x, x2] = twinSpots(dropX, currentTier);
    const a = spawnItem(x, spawnY(currentTier), currentTier, false), b = spawnItem(x2, spawnY(currentTier), currentTier, false);
    if (Math.abs(x - x2) > 2 * TIERS[currentTier] + 1.5) return;
    // side by side in the middle: set edge to edge (a gem's outline is seldom as wide as its size) and pressed
    // gently together, so the two are touching when they land and merge there
    const [l, r] = a.position.x < b.position.x ? [a, b] : [b, a];
    const gap = r.bounds.min.x - l.bounds.max.x;
    Body.translate(l, { x: gap / 2, y: 0 });
    Body.translate(r, { x: -gap / 2, y: 0 });
    Body.setVelocity(l, { x: 0.7, y: 0 });
    Body.setVelocity(r, { x: -0.7, y: 0 });
}
// the twin's own picture and guide line, beside the finger's
const dropGuide2 = TWINS ? board.insertBefore(Object.assign(dropGuide.cloneNode(), { id: 'drop-guide2' }), dropGuide) : null;
const aimLine2 = TWINS ? board.insertBefore(Object.assign(aimLine.cloneNode(), { id: 'aim-line2' }), aimLine) : null;
if (TWINS) { board.classList.add('twins'); document.querySelectorAll('.tray-label').forEach(l => { l.textContent = 'NEXT ×2'; }); }

function clampX(x, tier) {
    const r = bomb === 2 ? ERUPT.size : TIERS[tier];   // (a lava bomb in the hand, not the gem)
    return Math.max(r, Math.min(GAME_WIDTH - r, x));
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
        if (b.isDropping && b.tier !== undefined) b.force.y += b.mass * g * (fallPull(b.tier) * (0.85 + 0.15 * weightOf(b.tier)) - 1);   // (a heavy pet drops harder)
    }
});

// --- WATER --- (a set with water in GAME.skins, the Ocean Jewels)
// The jar is full of water up to WATER.y, and under water a gem weighs what its level says. The lowest levels are
// lighter than water: they come up and float at the surface, the lower the level the higher it rides. Every
// level after them sinks, the higher the level the faster, and the heavier it lies on the pile at the bottom.
// The water slows everything in it. A gem that drops in makes a splash and counts as landed from then on (it
// may merge), wherever it floats or sinks to. The rest of the game is the same: the jar is full when a gem
// rests above the line, which is over the water.
const underWater = tier => {   // its weight under water, x its weight in the air
    const F = WATER.floaters, last = TIERS.length - 1;
    return tier < F ? WATER.light + (WATER.lightTop - WATER.light) * (F > 1 ? tier / (F - 1) : 0)
        : WATER.heavy + (WATER.heavyTop - WATER.heavy) * (last > F ? (tier - F) / (last - F) : 0);
};
if (WATER) Events.on(engine, 'beforeUpdate', () => {
    const g = engine.gravity.y * engine.gravity.scale;
    for (const b of Composite.allBodies(engine.world)) {
        if (b.tier === undefined) continue;
        // how much of it is under water, 0 to 1
        const s = Math.max(0, Math.min(1, (b.bounds.max.y - WATER.y) / (b.bounds.max.y - b.bounds.min.y)));
        if (b.wet === undefined) b.wet = s >= 0.5;                      // (a gem that starts in the water: no splash)
        else if (!b.wet && s >= 0.5) { b.wet = true; splash(b); }
        else if (b.wet && s <= 0.1) b.wet = false;
        b.force.y += b.mass * g * s * (underWater(b.tier) - 1);          // (gravity pulls with 1 already)
        b.frictionAir = 0.01 + s * (WATER.drag + WATER.dragFast * b.speed);
        // a gem going down fast leaves a few bubbles behind
        if (s === 1 && b.velocity.y > 1.6 && Math.random() < 0.05 + 0.012 * b.velocity.y) {
            FX.bubble(b.position.x + (Math.random() - 0.5) * b.currentRadius * 1.2, b.bounds.min.y + 4, 1.5 + Math.random() * 2.5);
        }
    }
});
// a gem goes into the water: it has landed, with a splash that is bigger for a heavier gem and a harder fall
function splash(gem) {
    const speed = Math.abs(gem.velocity.y);
    gem.isDropping = false;
    if (speed < 1.5) return;   // (a floating gem dipping back under makes none)
    const impact = impactOf(speed);
    gem.lastThud = performance.now();
    Sound.play('splash', gem.tier, impact);
    Haptics.play('land', gem.tier, impact * 0.6);
    FX.splash(gem.position.x, TIERS[gem.tier], gem.tier, impact);
}

// --- LAVA BOMB --- (a set with erupt in GAME.skins, the Volcano Gems)
// Every merge heats the volcano: the gem it makes adds its level to the heat, shown by the bar at the side of the
// jar. When the bar is full the player gets a lava bomb: it comes into the hand in place of the gem (which waits
// its turn), is aimed and dropped like one, and where it lands it goes off: every gem of the lowest levels
// (ERUPT.burns of them: the kinds that are dropped) whose middle is within ERUPT.blast of it burns away, for
// 10 points a level; the bigger gems, and the ones just outside, are only shoved back. Then the heat starts
// again from nothing. The bomb comes only from the
// merges: nothing here depends on time or on how the player is doing. It is saved with the game, and Undo takes
// a bomb back like any drop.
let heat = 0;
let bomb = 0;   // 0: none. 1: earned while a gem was being held, it comes when the finger lets go. 2: in the hand. 3: falling
const BOMB_ART = 'lava-bomb';   // its picture, drawn here (bombArt), as Matter's texture of this name and as the guide's
const heatFill = ERUPT ? (() => {
    const bar = document.createElement('div');
    bar.id = 'heat';
    bar.append(document.createElement('i'));
    board.append(bar);
    return bar.firstChild;
})() : null;
function heatUI() {
    if (!heatFill) return;
    const k = Math.min(1, heat / ERUPT.full);
    heatFill.style.height = `${k * 100}%`;
    heatFill.parentNode.classList.toggle('hot', k >= 0.8 && k < 1);
    heatFill.parentNode.classList.toggle('full', k >= 1);
}
// a ball of dark rock with glowing cracks, a hot heart and a glow round it; the rock fills 1 / BOMB_GLOW of the picture
const BOMB_GLOW = 1.5;
let bombUrl = '';
function bombArt() {
    const S = 192, c = document.createElement('canvas'), R = S / 2 / BOMB_GLOW;
    c.width = c.height = S;
    const x = c.getContext('2d');
    x.translate(S / 2, S / 2);
    let glow = x.createRadialGradient(0, 0, R * 0.7, 0, 0, S / 2);
    glow.addColorStop(0, 'rgba(255, 150, 40, 0.75)'); glow.addColorStop(0.45, 'rgba(255, 90, 20, 0.3)'); glow.addColorStop(1, 'rgba(255, 60, 0, 0)');
    x.fillStyle = glow; x.beginPath(); x.arc(0, 0, S / 2, 0, Math.PI * 2); x.fill();
    const rock = x.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
    rock.addColorStop(0, '#6b2a16'); rock.addColorStop(0.55, '#33120b'); rock.addColorStop(1, '#170705');
    x.fillStyle = rock; x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2); x.fill();
    // the cracks: the same every time (a seeded walk out from near the middle)
    const rnd = seededRandom(7);
    x.save(); x.beginPath(); x.arc(0, 0, R - 1, 0, Math.PI * 2); x.clip();
    x.lineCap = x.lineJoin = 'round';
    for (const [w, col, blur] of [[9, 'rgba(255, 96, 20, 0.55)', 10], [4.5, '#ffb02e', 4], [1.8, '#fff3a6', 0]]) {
        const walk = seededRandom(11);
        x.strokeStyle = col; x.lineWidth = w; x.shadowColor = '#ff7a1a'; x.shadowBlur = blur;
        for (let k = 0; k < 7; k++) {
            let a = k * 0.9 + walk() * 0.5, px = Math.cos(a) * R * 0.12, py = Math.sin(a) * R * 0.12;
            x.beginPath(); x.moveTo(px, py);
            for (let s = 0; s < 5; s++) { a += (walk() - 0.5) * 1.1; px += Math.cos(a) * R * 0.24; py += Math.sin(a) * R * 0.24; x.lineTo(px, py); }
            x.stroke();
        }
    }
    x.restore();
    const heart = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
    heart.addColorStop(0, 'rgba(255, 244, 170, 0.95)'); heart.addColorStop(0.5, 'rgba(255, 150, 40, 0.5)'); heart.addColorStop(1, 'rgba(255, 90, 20, 0)');
    x.fillStyle = heart; x.beginPath(); x.arc(0, 0, R * 0.5, 0, Math.PI * 2); x.fill();
    const shine = x.createRadialGradient(-R * 0.4, -R * 0.45, 0, -R * 0.4, -R * 0.45, R * 0.4);
    shine.addColorStop(0, 'rgba(255, 220, 190, 0.5)'); shine.addColorStop(1, 'rgba(255, 220, 190, 0)');
    x.fillStyle = shine; x.beginPath(); x.arc(-R * 0.4, -R * 0.45, R * 0.4, 0, Math.PI * 2); x.fill();
    void rnd;
    return c;
}
function addHeat(level) {
    if (!ERUPT || isGameOver || bomb) return;   // (with a bomb earned the bar stays full until it has gone off)
    heat = Math.min(ERUPT.full, heat + level);
    heatUI();
    if (heat >= ERUPT.full) bombReady();
}
function bombReady() {   // full: the bomb comes into the hand, or waits for the finger to let go of the gem it holds
    bomb = held ? 1 : 2;
    Sound.play('bombReady');
    Haptics.play('praise', 2);
    FX.rumble();
    let told = 0;
    try { told = +localStorage.getItem(`${GAME.id}.told.bomb`) || 0; localStorage.setItem(`${GAME.id}.told.bomb`, told + 1); } catch (e) {}
    if (told < 4) showToast('Lava bomb! Drop it on what you want gone');
    updateUI();
}
function bombToHand() {   // the finger let go: a bomb that waited comes into the hand
    if (bomb !== 1) return;
    bomb = 2;
    dropX = clampX(dropX, currentTier);
    updateUI();
}
function dropBomb() {
    Sound.play('drop', 6);
    Haptics.play('drop', 6);
    if (UNDO_HERE) lastDrop = snapshot();
    const k = ERUPT.size * 2 * BOMB_GLOW / 192;
    const b = Bodies.circle(dropX, spawnY(0) - TIERS[0] + ERUPT.size, ERUPT.size, {
        restitution: 0, friction: 0.6, density: 0.006, slop: 0.01, render: { sprite: { texture: BOMB_ART, xScale: k, yScale: k } }, bomb: true });
    b.isDropping = true;
    Composite.add(engine.world, b);
    bomb = 3;
    dropX = clampX(dropX, currentTier);
    updateUI();
}
// it goes off where it first touches the floor, a gem that has landed, a crate or a part of the jar
function explode(b) {
    if (b.gone) return;
    b.gone = true;
    const { x, y } = b.position;
    Composite.remove(engine.world, b);
    let burned = 0, points = 0;
    for (const o of Composite.allBodies(engine.world)) {
        if (o.tier === undefined || o.isMerging) continue;
        const dx = o.position.x - x, dy = o.position.y - y, d = Math.hypot(dx, dy) || 1;
        if (d <= ERUPT.blast && o.tier < ERUPT.burns) {
            FX.burn(o.position.x, o.position.y, TIERS[o.tier]);
            Composite.remove(engine.world, o);
            burned++;
            points += 10 * (o.tier + 1);
        } else if (d < ERUPT.blast * 1.8) {   // too tough, or just outside: shoved back, the light ones more
            const push = 5 * Math.min(1, 1.8 - d / ERUPT.blast) / (1 + o.tier * 0.35);
            Body.setVelocity(o, { x: o.velocity.x + dx / d * push, y: o.velocity.y + dy / d * push - 1 });
        }
    }
    if (points) {
        score += points;
        if (score > bestScore) { isNewBest = true; bestScore = score; try { localStorage.setItem(BEST_KEY, bestScore); } catch (e) {} }
        showPop(x, y, points);
    }
    heat = 0;
    bomb = 0;
    heatUI();
    FX.blast(x, y, ERUPT.blast);
    Sound.play('boom');
    Haptics.play('eruption');
    emitGame('erupt', burned);
    saveGame();
}
if (ERUPT) {
    // a bomb wedged somewhere without landing goes off there all the same
    Events.on(engine, 'beforeUpdate', () => {
        for (const b of Composite.allBodies(engine.world)) {
            if (b.bomb && !b.gone && (b.dropAge > 60 && b.speed < 0.3 || b.dropAge > 300)) explode(b);
        }
    });
}

// --- COME HERE --- (a set with call in GAME.skins, the Gem Pets)
// The gems of the level in hand that have landed jump to the finger: while a gem is held over the jar, and again
// when it is dropped (so a quick tap calls them too). Every pet has its own weight and its own jump (CALL.pets):
// a bunny or a frog gets over the whole pile, a duckling over the small ones, a piglet barely off the ground.
// A jump goes up, over the top of everything between the pet and the finger, across, and down onto the pile
// under the finger. The pet is solid all the way and goes through nothing: on its way up it slips round the
// side of a bigger neighbour and throws off what lies on it, as long as that is not more than its strength
// (strengthOf: its weight and its jump make it); what is heavier stops it. It only sets off if what is over it is not too
// heavy for it and nothing on the way is higher than it can jump. If something stops it after all, it comes
// down where it is, and one that got nowhere waits a while before it tries again. The nearest sets off first,
// the others a moment apart. Pets that arrive merge with each other and with the gem that is dropped.
// The call goes on while the finger is down, while the dropped gem falls and while a pet is in the air on its
// way, and a moment longer; all that time a pet that is there sits still (it only moves up and down), even on the
// round back of a big one, so the next to arrive and the dropped gem meet it.
let held = false;      // a gem is being held over the jar (setHeld)
let heldSteps = 0;     // ...for this many physics steps
let call = null;       // what the pets answer: { x, tier, left, busy, drop } (left: the steps it lasts once nothing
                       // is on its way any more; busy: the steps it may go on after the finger; drop: the gem dropped)
let callStep = 0;      // physics steps counted
let hopAt = 0;         // ...and the step from which the next pet may set off
function callPets(x, tier, drop) {   // a drop calls them (dropFruit)
    if (!CALL) return;
    if (heldSteps < CALL.wait) FX.calling(x, spawnY(tier), TIERS[tier]);   // (a held gem has its rings already)
    call = { x, tier, left: CALL.after, busy: CALL.longest, drop };
}
// The jump a pet can make to x: { level, speed, off }: the height at which it crosses (its middle), its speed
// across, and the gems over it that it throws off. null: what lies over it is too heavy for it (or cannot move
// at all), or something on the way (or the pile under the finger) is higher than it can jump.
function planJump(b, x, g) {
    const r = b.currentRadius, pet = petOf(b.tier), x0 = b.position.x, y0 = b.position.y;
    const from = Math.min(x0, x) - r, to = Math.max(x0, x) + r;
    let top = y0 + r;   // the top of everything on the way and under the finger (at the least, the ground it stands on)
    const off = [];
    for (const o of Composite.allBodies(engine.world)) {
        if (o === b || o.leap || o.isDropping || !(o.tier !== undefined || o.crate || o.jarPart)) continue;   // (gems in the air are not in the way)
        if (o.bounds.max.x > from && o.bounds.min.x < to) top = Math.min(top, o.bounds.min.y);
        // right over it: a gem it has to throw off; a crate or a part of the jar, which stays
        if (o.tier !== undefined) { if (o.position.y < y0 - 2 && Math.abs(o.position.x - x0) < (o.currentRadius + r) * 0.55) off.push(o); }
        else if (o.bounds.max.y < y0 && o.bounds.max.x > x0 - r * 0.7 && o.bounds.min.x < x0 + r * 0.7) return null;
    }
    if (off.reduce((sum, o) => sum + o.mass, 0) > strengthOf(b)) return null;
    const level = Math.min(y0 - CALL.least, top - r - CALL.over);
    if (level < 0 || y0 - level > pet.jump) return null;   // (no room under the top of the jar, or too high for it)
    return { level, speed: 0.7 * Math.sqrt(2 * g * pet.jump), off };
}
if (CALL) Events.on(engine, 'beforeUpdate', () => {
    const g = engine.gravity.y * engine.gravity.scale * (1000 / 60) ** 2;   // gravity, px a step each step
    const gems = Composite.allBodies(engine.world).filter(b => b.tier !== undefined);
    callStep++;
    for (const pr of engine.pairs.list) if (pr.isActive) pr.bodyA.parent.touched = pr.bodyB.parent.touched = callStep;   // what stands on something
    // the pets in the air: up (as it was thrown), across at the top (held level, at its own speed), then down
    for (const b of gems) {
        const j = b.leap;
        if (!j) continue;
        j.t++;
        const done = stuck => {   // down from here; on the ground again, it has landed
            j.go = 'down';
            j.stuck = stuck;
            Body.setVelocity(b, { x: 0, y: Math.max(0, b.velocity.y) });
            Body.setAngularVelocity(b, 0);
            Body.setMass(b, j.mass);
            b.frictionAir = j.air;
        };
        const lift = () => { b.force.y -= b.mass * engine.gravity.y * engine.gravity.scale; };   // (its own push carries it: no falling meanwhile)
        if (j.go === 'up') {
            // as fast as a jump that just reaches that height, slowing toward the top; what it meets may turn it aside
            const left = b.position.y - j.level;
            j.held = j.t > 2 && j.lastY - b.position.y < j.vy * 0.3 ? j.held + 1 : 0;
            if (left <= 3) { j.go = 'over'; j.t = 0; }
            else if (j.held > 6) done(true);                                   // (something too heavy stopped it)
            else {
                j.vy = Math.max(1.5, Math.sqrt(2 * g * left));
                j.lastY = b.position.y;
                Body.setVelocity(b, { x: b.velocity.x * 0.9, y: -j.vy });
                lift();
            }
        }
        if (j.go === 'over') {
            const dx = j.to - b.position.x;
            // stopped by something in the air, or (after a bump) no longer level: down from here
            if (j.t > 3 && (Math.abs(b.position.x - j.lastX) < j.speed * 0.25 || Math.abs(b.position.y - j.level) > 14)) done(Math.abs(dx) > b.currentRadius);
            else if (Math.abs(dx) < 0.5) done(false);
            else {
                j.lastX = b.position.x;
                const v = Math.sign(dx) * Math.min(Math.abs(dx), j.speed * Math.min(1, (j.t + 1) / 5));   // (it gathers speed over a few steps)
                Body.setVelocity(b, { x: v, y: (j.level - b.position.y) * 0.3 });
                lift();
            }
        } else if (j.go === 'down' && (b.touched === callStep || j.t > 200)) {
            b.leap = null;
            // it got nowhere: the more often in a row, the longer it waits before it tries again
            b.stuck = j.stuck ? (b.stuck || 0) + 1 : 0;
            b.restUntil = callStep + (b.stuck ? Math.min(240, 60 * b.stuck) : CALL.rest);
        }
    }
    // the call: where the held gem is, from a moment after it was picked up; or where a gem was dropped (callPets)
    const holding = held && !isGameOver && ++heldSteps >= CALL.wait;
    if (!held) heldSteps = 0;
    if (holding) {
        call = { x: dropX, tier: currentTier, left: CALL.after, busy: CALL.longest };
        if ((heldSteps - CALL.wait) % 40 === 0) FX.calling(dropX, spawnY(currentTier), TIERS[currentTier]);
    }
    if (isGameOver) call = null;
    let busy = holding;
    if (call && !holding) {
        busy = call.busy > 0 && ((call.drop && call.drop.isDropping) || gems.some(o => o.leap && o.leap.to === call.x));
        if (busy) call.busy--;
        else if (--call.left < 0) call = null;
    }
    // a pet that is there sits still as long as the call lasts; so does the pet that two of them made there, which
    // shuffles to the very place, so that it meets the next one made there and the two merge again
    for (const b of gems) {
        const made = !!call && !!b.sitFor && b.sitFor.tier === call.tier && Math.abs(b.sitFor.x - call.x) < 12;
        const mine = !!call && !b.isMerging && (b.tier === call.tier || made), reach = b.currentRadius * (made ? 1.5 : 0.6);
        if (b.sitAt !== undefined && !(mine && Math.abs(call.x - b.sitAt) < reach)) b.sitAt = undefined;
        if (b.sitAt === undefined && mine && !b.leap && !b.isDropping && (made || !b.isGrowing) && Math.abs(call.x - b.position.x) < reach) b.sitAt = b.position.x;
        if (b.sitAt === undefined) continue;
        if (made) b.sitAt += Math.max(-2, Math.min(2, call.x - b.sitAt));
        Body.setPosition(b, { x: b.sitAt, y: b.position.y });
        Body.setVelocity(b, { x: 0, y: b.velocity.y });
        Body.setAngularVelocity(b, 0);
    }
    if (!call || callStep < hopAt) return;
    // the nearest pet that can jump sets off
    let b = null, away = Infinity;
    for (const o of gems) {
        if (o.tier !== call.tier || o.isDropping || o.isMerging || o.isGrowing || o.leap || callStep < (o.restUntil || 0)) continue;
        const d = Math.abs(call.x - o.position.x);
        if (d < o.currentRadius * 0.6 || d >= away) continue;                 // (it is here already)
        if (o.touched !== callStep || o.speed > 3) continue;                  // in the air, or tumbling
        b = o; away = d;
    }
    if (!b) return;
    const jump = planJump(b, call.x, g);
    if (!jump) { b.restUntil = callStep + 25; return; }                       // (no jump for it now: it looks again in a moment)
    hopAt = callStep + CALL.apart;
    b.leap = { go: 'up', t: 0, held: 0, vy: 0, level: jump.level, speed: jump.speed, to: call.x, lastX: b.position.x, lastY: b.position.y, air: b.frictionAir, mass: b.mass };
    b.frictionAir = 0;
    Body.setAngularVelocity(b, 0);
    // it pushes with all its strength while it jumps, and what lies on it is thrown off to the side it leans to
    Body.setMass(b, Math.max(b.mass, strengthOf(b) * 3));
    for (const o of jump.off) Body.setVelocity(o, { x: o.velocity.x + (o.position.x < b.position.x ? -2.2 : 2.2), y: o.velocity.y - 2 });
    Sound.play('hop', b.tier);
    FX.hop(b.position.x, b.position.y + b.currentRadius, b.currentRadius);
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
if (ERUPT) { const art = bombArt(); render.textures[BOMB_ART] = art; bombUrl = art.toDataURL(); }   // (the lava bomb's picture)

// --- THE CLOCK ---
// The game runs at the same speed on every phone, whatever its screen: the physics moves in steps of 1/60 s of
// game time (every rule that counts steps counts these), and SPEED steps of game time pass for every one of real
// time. A screen that redraws 60, 90, 120 or 144 times a second gets as many steps as the time since its last
// frame calls for (none, one or two), and each frame is drawn in between the last two steps, so the movement is
// smooth on all of them. (Matter's own Runner made one step per frame: a 120 Hz phone played twice as fast as a
// 60 Hz one.) Runner.run(runner, engine) and Runner.stop(runner) start and stop this clock, as they did Matter's.
const STEP = 1000 / 60;                 // one physics step: ms of game time
const SPEED = GAME.speed || 1.3;        // game time for each ms of real time
const MAX_STEPS = 5;                    // most steps in one frame: a slow phone slows the game down, it doesn't choke
const runner = Runner.create();
let clockOn = true, clockAt = null, owed = 0;   // owed: game time that has passed and is not stepped yet
Runner.run = () => { clockOn = true; return runner; };
Runner.stop = () => { clockOn = false; };
function drawFrame(between) {   // between: how far the picture is from the step before the last (0) to the last (1)
    const moved = [];
    if (between < 1) for (const b of Composite.allBodies(engine.world)) {
        if (b.isStatic || b.wasX === undefined) continue;
        const x = b.position.x, y = b.position.y, a = b.angle;
        if (Math.abs(x - b.wasX) + Math.abs(y - b.wasY) > 60) continue;   // (put somewhere else by hand: no in-between)
        moved.push(b, x, y, a);
        b.position.x = b.wasX + (x - b.wasX) * between;
        b.position.y = b.wasY + (y - b.wasY) * between;
        b.angle = b.wasA + (a - b.wasA) * between;
    }
    Render.world(render);
    for (let i = 0; i < moved.length; i += 4) { const b = moved[i]; b.position.x = moved[i + 1]; b.position.y = moved[i + 2]; b.angle = moved[i + 3]; }
}
(function frame(now) {
    requestAnimationFrame(frame);
    if (now === undefined) return;
    const dt = clockAt === null ? 0 : now - clockAt;
    clockAt = now;
    if (clockOn) {
        owed += (dt > 250 ? STEP : dt) * SPEED;   // (back from another app, or a long hitch: no racing to catch up)
        let n = 0;
        while (owed >= STEP && n++ < MAX_STEPS) {
            for (const b of Composite.allBodies(engine.world)) { if (!b.isStatic) { b.wasX = b.position.x; b.wasY = b.position.y; b.wasA = b.angle; } }
            Engine.update(engine, STEP);
            owed -= STEP;
        }
        if (owed >= STEP) owed = 0;
    }
    drawFrame(clockOn ? owed / STEP : 1);
})();

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
        if ((body.tier !== undefined || body.crate) && !body.isGrowing && !body.isDropping && body.sitAt === undefined) {   // (nor a pet that sits waiting, COME HERE)
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
    held = on;   // (COME HERE: the Gem Pets answer)
    dropGuide.classList.toggle('held', on);
    aimLine.classList.toggle('show', on);
    if (TWINS) { dropGuide2.classList.toggle('held', on); aimLine2.classList.toggle('show', on); }
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
    if (e.pointerId === holding) { holding = null; setHeld(false); bombToHand(); }
});

function dropFruit() {
    if (MINE && !Mine.canDrop()) return;
    if (bomb === 2) { dropBomb(); return; }   // (the lava bomb is not a gem: the gem in hand comes after it)
    emitGame('drop', currentTier, dropX);
    Sound.play('drop', currentTier);   // (higher and lighter for a small gem, lower for a heavy one)
    Haptics.play('drop', currentTier);
    if (UNDO_HERE) lastDrop = snapshot();   // the Undo booster can take this drop back
    if (++dropsWithoutMerge > COMBO_BREAK) combo = 0;

    if (TWINS) dropTwins();
    else callPets(dropX, currentTier, spawnItem(dropX, spawnY(currentTier), currentTier, false));
    if (SET_HINT) setHint();

    currentTier = nextTier;
    if (MINE) { nextTier = afterTier; afterTier = randomDropTier(); }
    else nextTier = randomDropTier();
    dropX = clampX(dropX, currentTier);
    updateUI();
    if (MINE) Mine.afterDrop();
    bombToHand();

    if (!MINE) Ads.onDrop();   // (never an ad in the middle of a stage)
}

// the first 3 games with a set that has a rule of its own say what's going on, at the first drop
// ([where it is counted, what it says])
const SET_HINT = FLOAT ? ['floatTold', 'Zero gravity: these gems float up!']
    : WATER ? ['waterTold', 'Under water: small gems float, big ones sink!']
    : ERUPT ? ['told.erupt', 'Merges heat the volcano: fill it for a lava bomb!']
    : TWINS ? ['told.twins', 'Twins: every gem falls as a mirrored pair!']
    : CALL ? ['told.call', 'The same pets jump to your finger!'] : null;
let setHinted = false;
function setHint() {
    if (setHinted) return;
    setHinted = true;
    const key = `${GAME.id}.${SET_HINT[0]}`;
    let told = 0;
    try { told = +localStorage.getItem(key) || 0; localStorage.setItem(key, told + 1); } catch (e) {}
    if (told < 3) showToast(SET_HINT[1]);
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

        if (bodyA.bomb || bodyB.bomb) {   // a lava bomb goes off on what it lands on (LAVA BOMB)
            if (isLanded(bodyA.bomb ? bodyB : bodyA)) explode(bodyA.bomb ? bodyA : bodyB);
            continue;
        }
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
        if (ERUPT) addHeat(mergedTier + 1);

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
        if (call && bodyA.tier === call.tier && Math.abs(midX - call.x) < TIERS[mergedTier]) merged.sitFor = { x: call.x, tier: call.tier };   // (COME HERE: made where the pets are called to)
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
        density: 0.001 * (tier + 1) * weightOf(tier),
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
    if (ERUPT) data.heat = heat;   // (full: a lava bomb is in the hand, or on its way down)
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
    if (ERUPT) { heat = Math.max(0, Math.min(ERUPT.full, +data.heat || 0)); bomb = heat >= ERUPT.full ? 2 : 0; heatUI(); }
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
if (WATER) FX.water(WATER.y);   // (the surface, splashes and bubbles)
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
        score, bestScore, isNewBest, combo, dropsWithoutMerge, current: currentTier, next: nextTier, heat, bomb,
        daily: DAILY ? { rng: dropRandom.getState(), made: made.slice(), maxCombo } : null
    };
}

function undoLastDrop() {
    const s = lastDrop;
    if (!s || isGameOver) return;
    lastDrop = null;
    Composite.allBodies(engine.world).filter(b => b.tier !== undefined || b.bomb).forEach(b => { b.gone = true; Composite.remove(engine.world, b); });
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
    if (ERUPT) { heat = s.heat || 0; bomb = s.bomb || 0; heatUI(); }   // (a lava bomb the drop earned or set off is taken back too)
    call = null;                                                  // (and the pets are not called to it any more)
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
        const notes = [sk.float && '⬆ Zero gravity: drop them from the bottom and they float up', sk.pull && 'alike gems pull each other in',
            sk.water && '🌊 Under water (not in the Gem Mine): the small gems float, the big ones sink',
            sk.twins && '♛ Royal twins (not in the Gem Mine): every gem falls as a pair, mirrored left and right',
            sk.erupt && '🌋 Merges heat the volcano (not in the Gem Mine): when it is full you get a lava bomb that burns the small gems around where it lands',
            sk.call && '🐾 The same pets jump to your finger: hold it down to call them, or just drop'].filter(Boolean);
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
