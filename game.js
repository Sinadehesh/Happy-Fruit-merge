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
    // Gem Jar's set that opens with a level (GAME.skins level): from a quark to a little sun
    'atoms': {
        background: '#f4ecf7',
        tiers: [20, 28, 37, 48, 60, 73, 87, 102, 118, 136, 156, 178],
        sprites: ['01_quark', '02_electron', '03_proton', '04_neutron', '05_nucleus', '06_atom', '07_complex_atom', '08_molecule',
            '09_double_helix', '10_living_cell', '11_crystal_cluster', '12_mini_sun'].map(n => `assets/atoms/${n}.png`)
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
// (a set with `mineStars` opens with that many stars in the Gem Mine instead, mine.js; one with `level` at that
// level of the player, meta.js, whose profile is read here since this runs first)
const playerLevel = () => { try { return (JSON.parse(localStorage.getItem(`${GAME.id}.profile`)) || {}).level | 0; } catch (e) { return 0; } };
const skinOpen = i => UNLOCK.all ? !!SKINS[i] : !SKINS[i] ? false : SKINS[i].mineStars ? Mine.totalStars() >= SKINS[i].mineStars
    : SKINS[i].level ? playerLevel() >= SKINS[i].level : i <= UNLOCK.opened;
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
// A shock-wave set (GAME.skins wave: the Crystal Cave): every merge goes off with a blast that throws the gems
// near it away, see SHATTER WAVE below. Not in the Gem Mine, whose stages are measured without it.
// (wave: true, or an object that changes these numbers)
const WAVE = SKIN && SKIN.wave && !MINE ? Object.assign({
    reach: 3.2,     // how far the blast goes: this x the size of the gem that was made...
    extra: 70,      // ...and this many px more
    push: 9,        // how hard it throws a gem right at the merge, px a step, for the smallest gem made...
    more: 1.1,      // ...and this much harder for every level above it
    lift: 0.9,      // every gem it throws is also tossed up by this much of its throw (so one on the floor flies too)
    most: 17        // no gem is thrown faster than this
}, SKIN.wave === true ? null : SKIN.wave) : null;
// A rubber set (GAME.skins rubber: the Odd Shapes): everything is bouncy, see RUBBER below. Not in the Gem Mine,
// whose stages are measured without it. (rubber: true, or an object that changes these numbers)
const RUBBER = SKIN && SKIN.rubber && !MINE ? Object.assign({
    bounce: 0.9,    // how much of its speed the smallest gem keeps when it bounces...
    less: 0.03,     // ...each level above it keeps this much less...
    least: 0.55     // ...but never less than this
}, SKIN.rubber === true ? null : SKIN.rubber) : null;
// A blocks set (GAME.skins blocks: the Pixel Treasure): every gem is a square block that falls straight down and
// never rolls or turns, see BLOCKS below. Not in the Gem Mine, whose stages are built for gems that roll.
// (blocks: true, or an object that changes these numbers)
const BLOCKS = SKIN && SKIN.blocks && !MINE && !FLOAT ? Object.assign({
    side: 1.6,      // a block's side, x the gem's size (its radius): a little less room than the round gem takes
    drops: 5        // how many of the smallest kinds are dropped
}, SKIN.blocks === true ? null : SKIN.blocks) : null;
// A clash set (GAME.skins clash: the Volcano Gems): a gem let go onto one far above it in level burns up with it and
// leaves a cinder, see FIRE AND STONE below. Not in the Gem Mine. (clash: true, or an object that changes these numbers)
const CLASH = SKIN && SKIN.clash && !MINE ? Object.assign({
    apart: 4,       // the two burn when their levels are more than this apart
    any: false,     // false: only a gem that is let go burns, with the gem it lands on. true: any two such gems that touch
    cinder: 1,      // what is left is a cinder as big as a gem this many levels under the bigger one (0: nothing is left)
    breaks: 7,      // a cinder breaks when a gem of this level or more is made right beside it:
    fresh: 70,      // ...within this many steps of being made (it grows for 30 and settles),
    beside: 10,     // ...with no more than this many px between the two
    points: 0,      // points for every level of each gem that burns
    broken: 60      // points for breaking a cinder
}, SKIN.clash === true ? null : SKIN.clash) : null;
// A lava set (GAME.skins lava: the Volcano Gems): the volcano asks for a stone, and its lava rises with every drop
// until it is made, or it erupts, see THE VOLCANO below. Not in the Gem Mine, nor in the Daily Challenge (whose goal
// is the day's own). (lava: true, or an object that changes these numbers)
const LAVA = SKIN && SKIN.lava && !MINE && !FLOAT && !DAILY ? Object.assign({
    top: 120,           // how high the lava can rise, px above the floor: there the volcano erupts
    asks: [3, 4, 4, 5, 4, 5, 6, 5, 4, 6, 5, 6, 5, 7],   // the stones it asks for, by level, in this order...
    again: 10,          // ...and when they are through, the last this many again, and again
    drops: { 3: 4, 4: 5, 5: 7, 6: 9, 7: 12 },     // by the level asked: the lava is at the top after this many drops without it
    wait: 110,          // physics steps from that last drop until it erupts (the stone may still be made meanwhile)
    up: 0.5,            // how fast the lava rises to where it should be, px a step...
    down: 2.5,          // ...and how fast it sinks
    sunk: 7,            // the gems lie this deep in it (the picture only: the floor is that much under its surface)
    bonus: 25,          // points for making the stone: this x its level
    cinders: 3,         // an eruption throws this many cinders into the jar...
    cinder: 32,         // ...of this size (their radius, px)
    toss: 9             // ...and tosses the gems up this fast, px a step, for the smallest (less for bigger ones)
}, SKIN.lava === true ? null : SKIN.lava) : null;
let lavaAsk = 0;        // (THE VOLCANO) how many stones it has asked for before this one
let lavaDrops = 0;      // ...how many gems have been let go since it asked
let lavaY = 0;          // ...how high the lava stands now, px above the floor
let eruptIn = -1;       // ...steps until it erupts (-1: it is not about to)
// A heat set (GAME.skins heat: the Volcano Gems): the jar stands on lava and is hotter the nearer to it; every stone
// stands so much heat, and one that is left in more melts and raises the lava, see THE HEAT below. Not in the Gem
// Mine. (heat: true, or an object that changes these numbers)
const HEAT = SKIN && SKIN.heat && !SKIN.lava && !MINE && !FLOAT ? Object.assign({
    base: 26,           // the lava the jar starts with, px above the floor
    range: 200,         // the heat reaches this far above the lava: full at its surface, none from this height up
    // by level: how much of the full heat a stone stands (pumice 30% ... fire opal 90%; from magma glass on, all of it).
    // From blue fire (level 5) on a stone can lie on the lava itself: its middle is high enough over it.
    stands: [0.3, 0.4, 0.5, 0.6, 0.75, 0.82, 0.9, 1, 1, 1, 1, 1],
    gain: 0.36,         // with every gem that is let go, a stone in too much heat gets hotter by this x how much too hot its place is...
    least: 0.04,        // ...but never by less than this...
    cool: 0.25,         // ...and a stone in heat it stands cools by this much; at 1 it melts
    volume: 2,          // a stone that melts raises the lava by its size (its area / the jar's width) x this: molten, it takes more room
    up: 0.5,            // how fast the lava rises to where it should be, px a step
    sunk: 7             // the gems lie this deep in it (the picture only: the floor is that much under its surface)
}, SKIN.heat === true ? null : SKIN.heat) : null;
let lavaWant = HEAT ? HEAT.base : 0;   // (THE HEAT) how high the lava should stand: it comes up as stones melt
// A glitch set (GAME.skins glitch: the Pixel Treasure): at every merge gems vanish and come back somewhere else, at
// random, see GLITCH below. Not in the Gem Mine. (glitch: true, or an object that changes these numbers)
const GLITCH = SKIN && SKIN.glitch && !MINE && !FLOAT ? Object.assign({
    gems: 1,        // how many gems jump at each merge
    wait: 16,       // physics steps from the merge until they go (the merge is seen first)
    tries: 50       // tries at finding a free place for one (none found: it stays where it is)
}, SKIN.glitch === true ? null : SKIN.glitch) : null;
// A wired set (GAME.skins wires: the Cyber Circuit): touching gems are wires, and a spark merges two alike gems that
// a short chain of them links, see WIRES below. Not in the Gem Mine, whose stages are measured without it.
// (wires: true, or an object that changes these numbers)
const WIRES = SKIN && SKIN.wires && !MINE ? Object.assign({
    links: 2,       // how many gems may lie between the two (they touch each other in a row)
    live: 45,       // physics steps a gem that has just landed can send its spark...
    chain: false,   // ...and whether a gem that has just been made can too (with it a test bot's score triples)
    every: 4,       // steps between two looks for a pair to link
    hop: 5          // steps the spark takes from one gem to the next
}, SKIN.wires === true ? null : SKIN.wires) : null;
// A beat set (GAME.skins beat: the Neon Nights): the jar pulses to a beat and the gems dance to it: on every beat
// alike gems hop toward each other, or apart when the last gem was let go off the beat; a gem let go on the beat also
// doubles the points of the merge it makes, see THE BEAT below. Not in the Gem Mine.
// (beat: true, or an object that changes these numbers)
const BEAT = SKIN && SKIN.beat && !MINE ? Object.assign({
    within: 95,     // how close to a beat the gem must be let go, ms either side
    times: 2,       // the points of its merge are multiplied by this
    hop: 1.8,       // on every beat a gem with a like in the jar hops toward it: this fast, px a step, for the smallest gem...
    up: 2.6,        // ...and this fast up, so it clears the bumps of the pile...
    less: 0.2,      // ...a bigger gem less: both divided by 1 + this x the levels it is above the smallest
    reach: 300,     // a like further off than this does not call it (px between their middles)
    apart: 170      // out of tune, a gem hops away only from a like nearer than this
}, SKIN.beat === true ? null : SKIN.beat) : null;
let inTune = true;   // (THE BEAT) the last gem was let go on the beat (or none has been yet): alike gems hop together; false: apart
// A swirl set (GAME.skins swirl: the Spiral Atoms): there is no pile: the gems swirl in the middle of the jar round
// the biggest one, in a pattern that every merge changes, see THE SWIRL below. Not in the Gem Mine.
// (swirl: true, or an object that changes these numbers)
const SWIRL = SKIN && SKIN.swirl && !MINE && !FLOAT ? Object.assign({
    chaos: 7,         // the first merges of a game the swirl is wild, a little less with each one...
    orderly: 8,       // ...the next ones it turns in plain rings, each merge in another way; after them come the figures
    wild: 1.1,        // how fast the wild drift is, px a step
    ones: 4,          // only level 1 is dropped until a gem of this level has been made,
    twos: 6,          // ...then levels 1 and 2 until one of this level has; from then on the usual kinds, at random
    gather: 1.2,      // how fast alike gems that the player cannot bring together are drawn to each other, px a step
    size: 0.78,       // the gems are this much smaller than in the other sets, so that rings of them fit round the big one
    x: 225, y: 416,   // the middle of the swirl
    ring: 222,        // the ring the swirl has to stay in, in place of the line: its size (it touches the walls and the floor)
    rim: 214,         // how far from the middle the outermost gems reach
    turn: 2.1,        // how fast it turns: a gem at r px from the middle goes round at turn / (r + soft) a step,
    soft: 60,         // ...so the inner rings turn faster, but never wildly
    pull: 0.045,      // how hard a gem is drawn to its own ring: px a step for each px it is off it
    steer: 0.12,      // how fast a gem takes up the speed the swirl gives it (the part of the difference it makes up each step)
    drop: 5.5,        // how fast a gem that was let go falls into it, px a step
    blend: 94,        // steps over which the swirl goes from one pattern to the next after a merge (1.2 s)
    apart: 8,         // soft, like candy: unlike gems nearer than this (px between them) push each other off...
    shove: 0.1,       // ...this hard at most (px a step, each step, shared out by their weights)
    breath: 0.025     // how much the one in the middle swells and shrinks as it turns (the picture only)
}, SKIN.swirl === true ? null : SKIN.swirl) : null;
let swirlMerges = 0;   // (THE SWIRL) how many merges this game has had: the swirl's pattern follows it
let swirlTop = 0;      // ...and the highest level made in it so far (0: level 1): what is dropped follows it
// A pairs set (GAME.skins twins: the Royal Treasury): every drop is a pair of gems, mirrored left and right, see
// ROYAL PAIRS below. Not in the Gem Mine, whose stages count on one gem a drop.
// (twins: true, or an object that changes this)
const TWINS = SKIN && SKIN.twins && !FLOAT && !MINE ? Object.assign({
    same: false     // false: the two are of different levels (a set of two unlike jewels); true: twins, the same gem twice
}, SKIN.twins === true ? null : SKIN.twins) : null;
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

const DROPS = (BLOCKS && BLOCKS.drops) || DROP_TIERS;   // how many of the smallest kinds are dropped

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
const TIERS = REVERSE ? reverseTiers(MODES[MODE].tiers.length) : SWIRL ? MODES[MODE].tiers.map(r => Math.round(r * SWIRL.size)) : MODES[MODE].tiers;
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
let currentMate = TWINS ? mateFor(currentTier) : 0;   // a pairs set (ROYAL PAIRS): the gem that falls with the one in hand,
let nextMate = TWINS ? mateFor(nextTier) : 0;         // ...and the one that will fall with the next
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
// Every gem set has a best score of its own: its rule makes it another game (in one a game hardly ends, in another
// it is over soon), so a best made in one says nothing in another. The first set keeps the best there was before.
const SET_BEST = `${GAME.id}.best` + (SKIN && SKINS.indexOf(SKIN) > 0 ? `.set.${SKIN.id}` : '');
const BEST_KEY = RUSH ? `${GAME.id}.best.rush` : DAILY ? `${GAME.id}.best.daily` : MINE ? `${GAME.id}.best.mine`
    : (GAME.mode || MODE === 'fruit' ? SET_BEST : `${GAME.id}.best.${MODE}`) + (REVERSE ? '.reverse' : '');
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
if (SWIRL) {   // (the ring, in place of the line: index.html)
    board.classList.add('swirl');
    board.style.setProperty('--ring-x', `${(SWIRL.x - SWIRL.ring) / GAME_WIDTH * 100}%`);
    board.style.setProperty('--ring-y', `${(SWIRL.y - SWIRL.ring) / GAME_HEIGHT * 100}%`);
    board.style.setProperty('--ring-w', `${SWIRL.ring * 2 / GAME_WIDTH * 100}%`);
}

function randomDropTier() {
    return Math.floor(dropRandom() * (SWIRL ? swirlDrops() : DROPS));
}
// a swirl set starts small (THE SWIRL): how many of the lowest levels are dropped at this point of the game
// (not in Gem Rush: 90 seconds are too short for a slow start)
function swirlDrops() {
    return RUSH ? DROPS : swirlTop < SWIRL.ones - 1 ? 1 : swirlTop < SWIRL.twos - 1 ? Math.min(2, DROPS) : DROPS;
}
// the gem that falls with a gem of level `tier` in a pairs set: any other of the kinds that are dropped (or its twin)
function mateFor(tier) {
    return TWINS.same || DROPS < 2 ? tier : (tier + 1 + Math.floor(dropRandom() * (DROPS - 1))) % DROPS;
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

function addScore(tier, times = 1) {   // (times: 2 for a merge made on the beat, BEAT)
    const points = Math.round((tier * (tier + 1) / 2) * 10 * comboMultiplier()) * times;
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
    nextImg.src = (BLOCKS && blockUrl[nextTier]) || SPRITES[nextTier];
    if (MINE) next2Img.src = SPRITES[afterTier];
    if (nextMateImg) nextMateImg.src = SPRITES[nextMate];

    // The fruit you're about to drop hangs at the top (a floating set: at the bottom), following the pointer
    const scale = board.clientWidth / GAME_WIDTH;
    const inHand = bomb === 2;   // (a lava bomb, LAVA BOMB)
    const r = inHand ? ERUPT.size * BOMB_GLOW : BLOCKS ? TIERS[currentTier] * BLOCKS.side / 2 : TIERS[currentTier] * SPRITE_FIT;
    dropGuide.style.backgroundImage = `url('${inHand ? bombUrl : (BLOCKS && blockUrl[currentTier]) || SPRITES[currentTier]}')`;
    dropGuide.style.width = `${r * 2 * scale}px`;
    dropGuide.style.top = `${((inHand ? ERUPT.size + 10 : spawnY(currentTier)) - r) * scale}px`;
    if (ERUPT) { dropGuide.classList.toggle('bomb', inHand); dropGuide.style.setProperty('--blast', ERUPT.blast / r); }
    if (TWINS && TWINS.same) currentMate = currentTier;   // (twins: the other one is always the same gem)
    const [x, x2] = TWINS ? twinSpots(dropX, currentTier, currentMate) : [dropX];
    dropGuide.style.left = `${x * scale}px`;
    aimLine.style.left = `${x * scale}px`;
    // the guide line: from the gem to the far end of the jar
    if (FLOAT) aimLine.style.height = `${Math.max(0, spawnY(currentTier) - r) * scale}px`;
    else aimLine.style.top = `${(spawnY(currentTier) + r) * scale}px`;
    if (TWINS) {   // the other gem of the pair, mirrored
        const r2 = TIERS[currentMate] * SPRITE_FIT;
        dropGuide2.style.backgroundImage = `url('${SPRITES[currentMate]}')`;
        dropGuide2.style.width = `${r2 * 2 * scale}px`;
        dropGuide2.style.top = `${(spawnY(currentMate) - r2) * scale}px`;
        dropGuide2.style.left = aimLine2.style.left = `${x2 * scale}px`;
        aimLine2.style.top = `${(spawnY(currentMate) + r2) * scale}px`;
    }
}

function spawnY(tier) {
    return flipY(TIERS[tier] + 10);
}

// --- ROYAL PAIRS --- (a set with twins in GAME.skins, the Royal Treasury)
// Every drop is a set of two jewels of different levels (a ring and a crown, say): one falls where the finger is,
// the other as far from the other wall, mirrored about the middle of the jar. The tray shows both jewels of the
// next pair. Held near the middle, where the two would overlap, they hang side by side and fall together. So
// every drop has to find a good place for two unlike gems at once. (TWINS.same: the two are the same gem, and
// dropped in the middle they merge with each other as they land.) Which two come is as random as any drop.
function twinSpots(x, tier, mate = tier) {   // where the two fall: [the finger's gem, the other]
    const mid = GAME_WIDTH / 2, side = x <= mid ? -1 : 1;
    const off = Math.max(Math.abs(x - mid), (TIERS[tier] + TIERS[mate]) / 2 + 0.5);   // (never closer than touching)
    const inJar = (at, r) => Math.max(r, Math.min(GAME_WIDTH - r, at));               // (a big one stays off the wall)
    return [inJar(mid + side * off, TIERS[tier]), inJar(mid - side * off, TIERS[mate])];
}
function dropTwins() {
    if (TWINS.same) currentMate = currentTier;
    const [x, x2] = twinSpots(dropX, currentTier, currentMate);
    const a = spawnItem(x, spawnY(currentTier), currentTier, false), b = spawnItem(x2, spawnY(currentMate), currentMate, false);
    if (currentMate !== currentTier || Math.abs(x - x2) > 2 * TIERS[currentTier] + 1.5) return;
    // twins side by side in the middle: set edge to edge (a gem's outline is seldom as wide as its size) and
    // pressed gently together, so the two are touching when they land and merge there
    const [l, r] = a.position.x < b.position.x ? [a, b] : [b, a];
    const gap = r.bounds.min.x - l.bounds.max.x;
    Body.translate(l, { x: gap / 2, y: 0 });
    Body.translate(r, { x: -gap / 2, y: 0 });
    Body.setVelocity(l, { x: 0.7, y: 0 });
    Body.setVelocity(r, { x: -0.7, y: 0 });
}
// the other gem's own picture and guide line, beside the finger's, and its picture in the tray beside the next gem's
const dropGuide2 = TWINS ? board.insertBefore(Object.assign(dropGuide.cloneNode(), { id: 'drop-guide2' }), dropGuide) : null;
const aimLine2 = TWINS ? board.insertBefore(Object.assign(aimLine.cloneNode(), { id: 'aim-line2' }), aimLine) : null;
const nextMateImg = TWINS && !TWINS.same ? nextImg.parentNode.insertBefore(Object.assign(document.createElement('img'), { id: 'next-mate', alt: '' }), nextImg.nextSibling) : null;
if (TWINS) { board.classList.add('twins'); if (TWINS.same) document.querySelectorAll('.tray-label').forEach(l => { l.textContent = 'NEXT ×2'; }); }

function clampX(x, tier) {
    const r = bomb === 2 ? ERUPT.size : TIERS[tier] * (BLOCKS ? BLOCKS.side / 2 : 1);   // (a lava bomb in the hand; a block right up to the wall)
    return Math.max(r, Math.min(GAME_WIDTH - r, x));
}

// --- WORLD ---

// Extra solver iterations so heavy piles don't sink into each other
const engine = Engine.create({ positionIterations: 20, velocityIterations: 12 });
engine.gravity.y = DOWN;   // (floating sets: up)
if (SWIRL) engine.gravity.scale = 0;   // (a swirl set: nothing falls, THE SWIRL moves the gems)

// --- WEIGHT ---
// Every gem is heavier than the one before it, and it shows. Its mass grows with its size and density (each
// level is 1.3 to 4.4 times the one before). A dropped gem falls with a pull that grows with its level (the
// smallest drifts down a little lighter than plain gravity, bigger ones drop harder), it bounces less the
// heavier it is, and it lands with a thud, a buzz and a puff of dust that are deeper and stronger for heavier
// gems and harder landings, and a shake of the jar for the heavy ones (sound.js, haptics.js, fx.js). A gem
// already in the jar that falls into a gap lands the same way. In a floating set all of it works upward: the
// pull follows gravity, so the higher the level, the harder a gem shoots up.
const fallPull = tier => 0.8 + 0.1 * tier;                       // x gravity while a dropped gem is falling
// how much it bounces (restitution); a rubber set: a lot (RUBBER)
const bounceOf = tier => RUBBER ? Math.max(RUBBER.least, RUBBER.bounce - RUBBER.less * tier) : Math.max(0.04, 0.24 - 0.018 * tier);
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

// --- SHATTER WAVE --- (a set with wave in GAME.skins, the Crystal Cave)
// Every merge goes off with a blast: each gem within its reach is thrown straight away from where it happened,
// harder the nearer it is, and a light gem more than a heavy one. The bigger the gem that was made, the further
// the blast goes and the harder it throws: a small merge scatters its neighbours, a big one clears half the jar
// into the air. It shakes stuck gems loose and throws alike gems together (or apart). The gem that was made
// stays where it is.
function shatter(x, y, tier, made) {
    const reach = TIERS[tier] * WAVE.reach + WAVE.extra, hard = WAVE.push + WAVE.more * (tier - 1), foot = TIERS[tier] * 0.9;
    for (const o of Composite.allBodies(engine.world)) {
        if (o.tier === undefined || o === made || o.isMerging) continue;
        const dx = o.position.x - x, dy = o.position.y - y, d = Math.hypot(dx, dy) || 1;
        if (d >= reach) continue;
        const v = Math.min(WAVE.most, hard * (1 - d / reach) * Math.pow((tier + 1) / (o.tier + 1), 0.5));
        // thrown away from the foot of the gem that was made (so its neighbours on the floor go up, not along it)
        const fy = dy - DOWN * foot, fd = Math.hypot(dx, fy) || 1;
        Body.setVelocity(o, { x: o.velocity.x + dx / fd * v, y: o.velocity.y + fy / fd * v - DOWN * WAVE.lift * v });
    }
    FX.wave(x, y, reach, tier);
    Sound.play('shatter', tier);
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

// --- FIRE AND STONE --- (a set with clash in GAME.skins, the Volcano Gems)
// A small stone is fire to a big one. When a gem that is let go lands on a gem more than CLASH.apart levels from its
// own (a level 1 on a level 6, a level 3 on a level 8), both burn up. Only the gem it first comes down on, and only
// as it lands: gems lying in the jar do each other nothing, so it is always the player's doing (CLASH.any: any two
// such gems that touch, as it was first tried: then no big gem lasts and a jar never fills).
// What is left is a cinder, where the bigger one was: a dead black rock, as big as a gem CLASH.cinder levels under
// it. A cinder merges with nothing and burns nothing; it just takes up room. It breaks only when a big gem (of
// level CLASH.breaks or more) is made right beside it, or comes to lie beside it as it settles (for about a
// second after it was made), for CLASH.broken points; the Zap booster breaks one too.
// So fire is a way to be rid of a big gem that is in the way, at a price: the gem, and a rock in its place. And it
// is a danger: the bigger the gems on top of the pile, the fewer safe places there are for the small ones in
// hand. The gems that the one in hand would burn are ringed in red. Nothing here is left to chance.
const CINDER_ART = 'cinder';   // its picture, drawn here (cinderArt), as Matter's texture of this name
function cinderArt() {   // a ball of black rock, cracked, with a last dull glow in the cracks
    const S = 192, c = document.createElement('canvas'), R = S / 2 - 3, x = c.getContext('2d');
    c.width = c.height = S;
    x.translate(S / 2, S / 2);
    const rock = x.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R);
    rock.addColorStop(0, '#4a4350'); rock.addColorStop(0.55, '#26212b'); rock.addColorStop(1, '#0f0c13');
    x.fillStyle = rock; x.beginPath();
    const bump = seededRandom(23);   // (not quite round)
    for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2, rr = R * (0.93 + 0.07 * (k === 24 ? 0 : bump())); k ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(R * 0.93, 0); }
    x.closePath(); x.fill();
    x.save(); x.clip(); x.lineCap = x.lineJoin = 'round';
    for (const [w, col, blur] of [[7, 'rgba(160, 44, 14, 0.5)', 8], [3, 'rgba(255, 120, 40, 0.75)', 3], [1.2, 'rgba(255, 214, 140, 0.8)', 0]]) {
        const walk = seededRandom(31);
        x.strokeStyle = col; x.lineWidth = w; x.shadowColor = '#c2410c'; x.shadowBlur = blur;
        for (let k = 0; k < 5; k++) {
            let a = k * 1.26 + walk() * 0.6, px = Math.cos(a) * R * 0.15, py = Math.sin(a) * R * 0.15;
            x.beginPath(); x.moveTo(px, py);
            for (let s = 0; s < 4; s++) { a += (walk() - 0.5) * 1.3; px += Math.cos(a) * R * 0.25; py += Math.sin(a) * R * 0.25; x.lineTo(px, py); }
            x.stroke();
        }
    }
    x.restore();
    const shine = x.createRadialGradient(-R * 0.4, -R * 0.45, 0, -R * 0.4, -R * 0.45, R * 0.45);
    shine.addColorStop(0, 'rgba(210, 200, 225, 0.28)'); shine.addColorStop(1, 'rgba(210, 200, 225, 0)');
    x.fillStyle = shine; x.beginPath(); x.arc(-R * 0.4, -R * 0.45, R * 0.45, 0, Math.PI * 2); x.fill();
    return c;
}
const cinders = () => Composite.allBodies(engine.world).filter(b => b.cinder);
function makeCinder(x, y, r, angle = 0) {
    const k = r * 2 / 186, c = Bodies.circle(x, y, r, { restitution: 0.05, friction: 0.7, density: 0.004, slop: 0.01, angle,
        render: { sprite: { texture: CINDER_ART, xScale: k, yScale: k } }, cinder: true });
    Composite.add(engine.world, c);
    return c;
}
function breakCinder(c, scored) {
    if (c.gone) return;
    c.gone = true;
    Composite.remove(engine.world, c);
    FX.crumble(c.position.x, c.position.y, c.circleRadius);
    Sound.play('cinder', c.circleRadius);
    if (!scored || !CLASH || !CLASH.broken) return;
    score += CLASH.broken;
    if (score > bestScore) { isNewBest = true; bestScore = score; try { localStorage.setItem(BEST_KEY, bestScore); } catch (e) {} }
    showPop(c.position.x, c.position.y, CLASH.broken);
    emitGame('cinder', 'broken');
}
function clash(a, b) {
    a.isMerging = b.isMerging = true;   // (out of every other rule from here on)
    const points = CLASH.points * (a.tier + b.tier + 2), big = a.tier > b.tier ? a : b, small = big === a ? b : a;
    if (points) {
        score += points;
        if (score > bestScore) { isNewBest = true; bestScore = score; try { localStorage.setItem(BEST_KEY, bestScore); } catch (e) {} }
        showPop(big.position.x, big.position.y, points);
    }
    FX.clash(big.position.x, big.position.y, TIERS[big.tier], small.position.x, small.position.y, TIERS[small.tier]);
    Sound.play('clash', big.tier);
    Haptics.play('merge', big.tier, 1);
    Composite.remove(engine.world, [a, b]);
    if (CLASH.cinder) makeCinder(big.position.x, big.position.y, TIERS[Math.max(0, big.tier - CLASH.cinder)], big.angle);
    emitGame('clash', big.tier, small.tier);
}
if (CLASH) {
    // a big gem that has just been made breaks the cinders right beside it, while it grows and settles (about a second)
    Events.on(engine, 'beforeUpdate', () => {
        for (const b of Composite.allBodies(engine.world)) {
            if (!(b.fresh > 0) || b.isMerging) continue;
            b.fresh--;
            for (const c of cinders()) if (Math.hypot(c.position.x - b.position.x, c.position.y - b.position.y) < b.currentRadius + c.circleRadius + CLASH.beside) breakCinder(c, true);
        }
    });
    FX.dangerGlow(() => isGameOver ? [] : Composite.allBodies(engine.world)
        .filter(b => b.tier !== undefined && !b.isMerging && !b.isDropping && Math.abs(b.tier - currentTier) > CLASH.apart)
        .map(b => [b.position.x, b.position.y, b.currentRadius]));
}

// --- THE VOLCANO --- (a set with lava in GAME.skins, the Volcano Gems)
// The jar stands in the mouth of a volcano, and the volcano wants feeding. It asks for one stone at a time (the
// badge at the left of the jar shows which, and how many drops are left). With every gem that is let go its lava
// rises a step, lifting the whole pile toward the line; a dashed line across the jar marks how far it can come.
//  - The asked stone is made (by a merge) in time: the volcano is calm. The lava sinks away, every cinder in the
//    jar crumbles, there are LAVA.bonus points for each level of the stone, and it asks for the next one.
//  - The lava reaches the mark first (and the stone is still not made a moment later): it erupts. The gems are
//    tossed into the air, LAVA.cinders cinders are thrown in among them (dead black rocks that merge with nothing
//    and only take up room, until the volcano is next calmed, or the Zap booster breaks one), the lava sinks, and
//    it asks for the next stone.
// What it asks for and how long it waits are fixed (LAVA.asks, LAVA.drops: a bigger stone gets more drops), the same
// in every game: nothing here is left to chance, and nothing follows how the player is doing. Saved with the game;
// Undo takes back a drop with all it did to the volcano.
const askLevel = () => { const a = LAVA.asks, n = a.length; return a[lavaAsk < n ? lavaAsk : n - LAVA.again + (lavaAsk - n) % LAVA.again]; };   // the level it asks for now
const askDrops = () => LAVA.drops[askLevel()] || 10;                                                     // ...and the drops it gives for it
const lavaGoal = () => LAVA.top * Math.min(1, lavaDrops / askDrops());                                   // how high the lava should stand now
function lavaFloor() {   // the floor is where the lava is (a little under its surface)
    Body.setPosition(ground, { x: GAME_WIDTH / 2, y: GAME_HEIGHT + 25 - Math.max(0, lavaY - (LAVA || HEAT).sunk) });
}
const askBadge = LAVA ? (() => {
    const el = document.createElement('div');
    el.id = 'lava-ask';
    el.innerHTML = '<b>MAKE</b><img alt=""><i></i>';
    board.append(el);
    return el;
})() : null;
function lavaUI(fresh) {
    if (!askBadge) return;
    const left = Math.max(0, askDrops() - lavaDrops);
    askBadge.querySelector('img').src = SPRITES[askLevel() - 1];
    askBadge.querySelector('i').textContent = left;
    askBadge.classList.toggle('last', left <= 2);
    if (fresh) { askBadge.classList.remove('new'); void askBadge.offsetWidth; askBadge.classList.add('new'); }
}
function lavaNext() {   // it asks for the next stone, and the lava goes down
    lavaAsk++;
    lavaDrops = 0;
    eruptIn = -1;
    lavaUI(true);
}
function lavaDropped() {   // a gem was let go: the lava comes up a step
    lavaDrops++;
    if (lavaDrops >= askDrops() && eruptIn < 0) { eruptIn = LAVA.wait; Sound.play('bombReady'); FX.rumble(); }
    lavaUI(false);
}
function lavaCalm(x, y) {   // the asked stone was made
    const points = LAVA.bonus * askLevel();
    score += points;
    if (score > bestScore) { isNewBest = true; bestScore = score; try { localStorage.setItem(BEST_KEY, bestScore); } catch (e) {} }
    showPop(x, y - 30, points);
    for (const c of cinders()) breakCinder(c, false);
    FX.calm(GAME_HEIGHT - lavaY);
    Sound.play('calm');
    Haptics.play('praise', 1);
    emitGame('volcano', 'calm', askLevel());
    lavaNext();
}
function erupt() {
    const y = GAME_HEIGHT - lavaY;
    for (const b of Composite.allBodies(engine.world)) {
        if (b.tier === undefined && !b.cinder) continue;
        const k = 1 / (1 + 0.12 * (b.tier === undefined ? 3 : b.tier));
        Body.setVelocity(b, { x: b.velocity.x + 2.2 * (b.position.x - GAME_WIDTH / 2) / (GAME_WIDTH / 2) * k, y: b.velocity.y - LAVA.toss * k });
        if (b.tier !== undefined) b.hopLeft = 0;
    }
    for (let i = 0; i < LAVA.cinders; i++) {   // the cinders come up out of the lava, spread across the jar (not the same places every time)
        const x = GAME_WIDTH * (i + 0.5 + 0.3 * Math.sin(lavaAsk * 2.4 + i)) / LAVA.cinders;
        const c = makeCinder(Math.max(LAVA.cinder, Math.min(GAME_WIDTH - LAVA.cinder, x)), y - LAVA.cinder - 2, LAVA.cinder);
        Body.setVelocity(c, { x: (GAME_WIDTH / 2 - x) / 90, y: -13 - i });
    }
    FX.erupt(y);
    Sound.play('boom');
    Haptics.play('eruption');
    emitGame('volcano', 'erupt', askLevel());
    lavaNext();
    saveGame();
}
if (LAVA) {
    board.classList.add('lava');
    FX.lava(() => ({ y: GAME_HEIGHT - lavaY, mark: GAME_HEIGHT - LAVA.top, hot: Math.min(1, lavaDrops / askDrops()), soon: eruptIn >= 0 }));
    Events.on(engine, 'beforeUpdate', () => {
        const d = lavaGoal() - lavaY;
        if (Math.abs(d) > 0.01) { lavaY += d > 0 ? Math.min(d, LAVA.up) : Math.max(d, -LAVA.down); lavaFloor(); }
        if (isGameOver) return;
        if (eruptIn > 0 && --eruptIn === 0) erupt();
    });
    lavaUI(false);
}

// --- THE HEAT --- (a set with heat in GAME.skins, the Volcano Gems)
// The jar stands on lava, and it is hot in there: full heat at the lava's surface, less and less going up, none
// from HEAT.range px above it. Every stone stands so much heat, the bigger the more (HEAT.stands: a pumice 30% of
// the full heat, a fire opal 90%, and from magma glass on, all of it: those can lie in the lava itself). So each
// kind has a height above the lava from which it is safe: a pumice 140 px, a garnet 80, a blue fire 50 (which is
// where it lies when it lies on the lava: the small ones melt there, a blue fire and all above it do not).
// A stone that lies lower than that is in more heat than it stands, and with every gem that is let go it gets
// hotter (it glows redder), the faster the more too hot its place is; out of the heat again, it cools. When it is
// red hot it melts: it runs down into the lava, and the lava rises by as much as there was of it, lifting the
// pile and the heat with it. Melted stones are gone for good, and the lava never sinks, so a jar where much has
// melted is soon full. To keep a stone: merge it before it melts (the stone that is made is bigger, stands more,
// and starts cool), or let it lie higher, on stones that stand the heat.
// While a gem is in the hand, a line across the jar shows from where up it is safe. Heat is counted in drops, not
// in time: nothing gets hotter while the player thinks. Nothing here is left to chance. Saved with the game; Undo
// takes back a drop with the heat it brought and what it melted.
const tempAt = y => Math.max(0, 1 - Math.max(0, GAME_HEIGHT - lavaY - y) / HEAT.range);   // the heat at height y: 1 at the lava, 0 far above it
const safeFrom = tier => GAME_HEIGHT - lavaY - HEAT.range * (1 - HEAT.stands[tier]);          // a stone of this level is safe with its middle above this y
function melt(b) {
    if (b.isMerging) return;
    b.isMerging = true;   // (out of every other rule from here on)
    Composite.remove(engine.world, b);
    lavaWant += Math.PI * TIERS[b.tier] * TIERS[b.tier] / GAME_WIDTH * HEAT.volume;
    FX.melt(b.position.x, b.position.y, TIERS[b.tier], GAME_HEIGHT - lavaY);
    Sound.play('melt', b.tier);
    Haptics.play('land', b.tier, 0.7);
    emitGame('melt', b.tier);
}
const melting = [];   // the stones about to melt: [the stone, steps until it does] (one after the other, the lowest first)
function heatTick() {   // a gem was let go: every stone that has landed gets hotter or cooler by where it lies
    const hot = [];
    for (const b of Composite.allBodies(engine.world)) {
        if (b.tier === undefined || b.isDropping || b.isMerging) continue;
        const over = tempAt(b.position.y) - HEAT.stands[b.tier];
        b.heat = over > 0 ? (b.heat || 0) + Math.max(HEAT.least, HEAT.gain * over) : Math.max(0, (b.heat || 0) - HEAT.cool);
        if (b.heat >= 1 && !melting.some(m => m[0] === b)) hot.push(b);
    }
    hot.sort((a, b) => b.position.y - a.position.y).forEach((b, i) => melting.push([b, 14 + i * 9]));
}
if (HEAT) {
    board.classList.add('lava');   // (the lava comes up to its level as the game starts: the floor is not there yet at this point)
    FX.lava(() => ({ y: GAME_HEIGHT - lavaY, hot: 0.35, haze: HEAT.range,
        safe: isGameOver || HEAT.stands[currentTier] >= 1 ? null : safeFrom(currentTier), held }));
    FX.heatGlow(() => Composite.allBodies(engine.world).filter(b => b.tier !== undefined && !b.isMerging && !b.isDropping && (b.heat > 0 || tempAt(b.position.y) > HEAT.stands[b.tier]))
        .map(b => [b.position.x, b.position.y, b.currentRadius, Math.min(1, b.heat || 0), tempAt(b.position.y) > HEAT.stands[b.tier]]));
    Events.on(engine, 'beforeUpdate', () => {
        const d = lavaWant - lavaY;
        if (Math.abs(d) > 0.01) { lavaY += d > 0 ? Math.min(d, HEAT.up) : Math.max(d, -2.5); lavaFloor(); }
        if (isGameOver) { melting.length = 0; return; }
        for (let i = melting.length - 1; i >= 0; i--) if (--melting[i][1] <= 0) { const b = melting[i][0]; melting.splice(i, 1); if (b.heat >= 1) melt(b); }
    });
}

// --- GLITCH --- (a set with glitch in GAME.skins, the Pixel Treasure)
// Like an old video game that has gone wrong: at every merge a gem in the jar (GLITCH.gems of them) breaks up
// into pixels and comes together again somewhere else. Which gem, and where, is plain chance: any gem that has
// landed but the one just made, and any free place in the jar under the line; it is the same chance at every
// merge, whatever the score and however the game is going. A gem that comes back in the air falls from there. It
// may land by its like and merge, which sets off the next jump.
const glitches = [];   // the jumps still to come: the step each is due
let glitchStep = 0;
function glitchPlace(r) {   // a free place for a gem of size r: [x, y], or null
    const others = Composite.allBodies(engine.world).filter(o => o.tier !== undefined || o.crate || o.jarPart);
    for (let k = 0; k < GLITCH.tries; k++) {
        const x = r + Math.random() * (GAME_WIDTH - 2 * r), y = DANGER_Y + r + 6 + Math.random() * (GAME_HEIGHT - DANGER_Y - 2 * r - 8);
        if (others.every(o => o.tier !== undefined ? Math.hypot(o.position.x - x, o.position.y - y) > (o.currentRadius || TIERS[o.tier]) + r + 3
            : o.bounds.min.x > x + r || o.bounds.max.x < x - r || o.bounds.min.y > y + r || o.bounds.max.y < y - r)) return [x, y];
    }
    return null;
}
function glitchJump() {
    const gems = Composite.allBodies(engine.world).filter(b => b.tier !== undefined && !b.isMerging && !b.isDropping && !b.isGrowing);
    if (!gems.length) return;
    const b = gems[Math.floor(Math.random() * gems.length)], spot = glitchPlace(TIERS[b.tier]);
    if (!spot) return;
    FX.pixels(b.position.x, b.position.y, TIERS[b.tier], false);
    Composite.remove(engine.world, b);
    const again = spawnItem(spot[0], spot[1], b.tier, true);   // (it grows into its new place, as a gem that was just made does)
    Body.setAngle(again, b.angle);
    if (b.seeded) again.seeded = true;
    again.old = true;
    FX.pixels(spot[0], spot[1], TIERS[b.tier], true);
    Sound.play('glitch', b.tier);
    Haptics.play('pickup');
    emitGame('glitch', b.tier);
}
if (GLITCH) Events.on(engine, 'beforeUpdate', () => {
    glitchStep++;
    if (isGameOver) { glitches.length = 0; return; }
    while (glitches.length && glitches[0] <= glitchStep) { glitches.shift(); glitchJump(); }
});

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
// --- RUBBER --- (a set with rubber in GAME.skins, the Odd Shapes)
// Every gem is made of rubber: it keeps most of its speed when it hits something (bounceOf), so a dropped gem
// bounces a few times before it lies still, the small ones longest, and a pile is never quite at rest while gems
// are landing on it. Each bounce has its boing and the gem swells for a moment (the picture only: its outline
// stays as it is). The rest of the game is the same: a gem counts as landed from its first touch, and it merges
// with its like whenever the two touch, in the air or not.
if (RUBBER) Events.on(engine, 'beforeUpdate', () => {
    for (const b of Composite.allBodies(engine.world)) {
        if (!b.boing || b.isGrowing) continue;
        b.boing--;
        const k = spriteScale(b.currentRadius) * (1 + 0.14 * Math.sin(Math.PI * b.boing / 9));
        b.render.sprite.xScale = b.render.sprite.yScale = k;
    }
});
// a gem landing: the sound, buzz and dust follow its level (its weight) and how hard it hit
function thud(gem, speed, scale = 1) {
    const impact = impactOf(speed) * scale;
    gem.lastThud = performance.now();
    if (RUBBER) { gem.boing = 9; Sound.play('boing', gem.tier, impact); }
    else Sound.play('land', gem.tier, impact);
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
if (CLASH || LAVA) render.textures[CINDER_ART] = cinderArt();                                         // (a cinder's)

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
            if (BLOCKS) Body.setInertia(body, Infinity);   // (scaling works its turning out again: a block never turns)
        }

        // Fallback for a drop wedged against a wall: once it has fallen for a second and stopped, it counts as landed
        if (body.isDropping) {
            body.dropAge = (body.dropAge || 0) + 1;
            if (body.dropAge > 60 && body.speed < 0.3) body.isDropping = false;
        }

        // Touching or crossing the line is fine; you lose only when a landed item (or a crate) is
        // entirely above it (its lowest point is above the line; floating: entirely below it)
        if ((body.tier !== undefined || body.crate || body.cinder) && !body.isGrowing && !body.isDropping && body.sitAt === undefined) {   // (nor a pet that sits waiting, COME HERE)
            if (SWIRL) {   // a swirl: all of it outside the ring, whatever its speed (nothing rests there)
                if (Math.hypot(body.position.x - SWIRL.x, body.position.y - SWIRL.y) - body.currentRadius > SWIRL.ring) isAnyBodyAboveLine = true;
            } else if (FLOAT ? body.bounds.min.y > GAME_HEIGHT - DANGER_Y : body.bounds.max.y < DANGER_Y) {
                if (Math.abs(body.velocity.y) < 2 && Math.abs(body.velocity.x) < 2 || body.hopLeft > 0) {   // (hopping to the beat is not falling)
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
    document.getElementById('revive-text').textContent = (revives === MAX_REVIVES - 1 ? 'Last chance: w' : 'W') + `atch a short ad to clear the ${SWIRL ? 'outside of the swirl' : (FLOAT ? 'bottom' : 'top') + ' of the jar'}`;
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
    else {
        const gem = spawnItem(dropX, spawnY(currentTier), currentTier, false);
        callPets(dropX, currentTier, gem);
        if (BEAT && onTheBeat()) {   // let go on the beat: the jar is in tune, and its merge will count double
            gem.onBeat = true;
            setTune(true);
            FX.onBeat(dropX, spawnY(currentTier) + TIERS[currentTier] + 26, 'ON BEAT!');
            Sound.play('beatHit');
            Haptics.play('pickup');
        } else if (BEAT) {           // off the beat: out of tune
            if (inTune) { FX.onBeat(dropX, spawnY(currentTier) + TIERS[currentTier] + 26, 'OFF BEAT', true); Sound.play('offBeat'); }
            setTune(false);
        }
    }
    if (SET_HINT) setHint();
    if (LAVA) lavaDropped();
    if (HEAT) heatTick();

    currentTier = nextTier;
    if (MINE) { nextTier = afterTier; afterTier = randomDropTier(); }
    else nextTier = randomDropTier();
    if (TWINS) { currentMate = nextMate; nextMate = mateFor(nextTier); }
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
    : LAVA ? ['told.lava', 'Make the stone the volcano asks for before the lava reaches the line!']
    : HEAT ? ['told.heat', 'Hot near the lava: small stones melt there. Keep them above the line!']
    : CLASH ? ['told.clash', CLASH.any ? `A small stone and a big one burn each other: ${CLASH.apart + 1} levels apart or more!`
        : `Drop a stone on one ${CLASH.apart + 1}+ levels bigger: both burn to a cinder!`]
    : GLITCH ? ['told.glitch', 'Glitch: at every merge a gem jumps somewhere else!']
    : WAVE ? ['told.wave', 'Every merge goes off with a blast!']
    : RUBBER ? ['told.rubber', 'Rubber: everything bounces!']
    : BLOCKS ? ['told.blocks', 'Blocks: they fall straight and never roll!']
    : WIRES ? ['told.wires', 'Touching gems are wires: a spark finds its like!']
    : SWIRL ? ['told.swirl', 'It starts wild: every merge changes the swirl!']
    : BEAT ? ['told.beat', 'Let go on the beat: alike gems hop together. Off it: apart!']
    : TWINS ? ['told.twins', TWINS.same ? 'Twins: every gem falls as a mirrored pair!' : 'Two different jewels fall at once, mirrored!']
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
    return body === ground || body.crate || body.jarPart || body.cinder || (body.tier !== undefined && !body.isDropping);
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
        let fell = false;   // (one of the two has just come down on the other: FIRE AND STONE)
        if (bodyA.isDropping && isLanded(bodyB)) { landed(bodyA, speed); fell = true; }
        if (bodyB.isDropping && isLanded(bodyA)) { landed(bodyB, speed); fell = true; }
        if (bodyA.isDropping || bodyB.isDropping) continue;
        if (event.name === 'collisionStart') knock(bodyA, bodyB, speed);

        if (bodyA.tier === undefined || bodyB.tier === undefined) continue;
        if (bodyA.isMerging || bodyB.isMerging) continue;
        if (CLASH && (fell || CLASH.any) && Math.abs(bodyA.tier - bodyB.tier) > CLASH.apart) { clash(bodyA, bodyB); continue; }   // (FIRE AND STONE)
        if (bodyA.tier !== bodyB.tier || bodyA.tier >= TIERS.length - 1) continue;
        mergeGems(bodyA, bodyB);
    }
}
// Two gems of one level become one of the next, with its points, its place in the combo and everything that
// follows from a merge. It appears between the two, or at `at` ({ x, y }: a spark's merge, WIRES).
function mergeGems(bodyA, bodyB, at) {
    bodyA.isMerging = true;
    bodyB.isMerging = true;

    const mergedTier = bodyA.tier + 1;
    combo++;
    dropsWithoutMerge = 0;
    const beat = !!BEAT && (bodyA.onBeat || bodyB.onBeat);   // (one of them was dropped on the beat)
    const points = addScore(mergedTier, beat ? BEAT.times : 1);
    // made from a gem a Gem Mine stage started with: counts for the stage, not for gem sets or quests
    const seeded = !!(bodyA.seeded || bodyB.seeded);
    dailyOnMerge(mergedTier);
    if (!seeded) countForNextSet(mergedTier);
    emitGame('merge', mergedTier, points, combo, seeded);
    if (ERUPT) addHeat(mergedTier + 1);
    if (SWIRL) swirlGrew(swirlMerges + 1, mergedTier);

    const midX = at ? at.x : (bodyA.position.x + bodyB.position.x) / 2;
    const midY = at ? at.y : (bodyA.position.y + bodyB.position.y) / 2;
    if (MINE) Mine.onMerge(midX, midY, mergedTier, bodyA, bodyB);   // goals, and the crates it touches
    showPop(midX, midY, points);
    if (beat) { FX.onBeat(midX, midY - TIERS[mergedTier] - 16, `×${BEAT.times}`); Sound.play('beatHit', 1); }
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
    merged.made = true;
    if (seeded) merged.seeded = true;
    if (call && bodyA.tier === call.tier && Math.abs(midX - call.x) < TIERS[mergedTier]) merged.sitFor = { x: call.x, tier: call.tier };   // (COME HERE: made where the pets are called to)
    if (WAVE) shatter(midX, midY, mergedTier, merged);
    if (GLITCH) for (let k = 0; k < GLITCH.gems; k++) glitches.push(glitchStep + GLITCH.wait + k * 5);
    if (CLASH && mergedTier + 1 >= CLASH.breaks) merged.fresh = CLASH.fresh;
    if (LAVA && mergedTier + 1 === askLevel()) lavaCalm(midX, midY);   // (THE VOLCANO: the stone it asked for)   // (FIRE AND STONE: a big gem breaks the cinders beside it as it grows and settles)
    return merged;
}
// --- THE SWIRL --- (a set with swirl in GAME.skins, the Spiral Atoms)
// There is no gravity and no pile: the gems drift and circle in the middle of the jar, and every merge changes
// the way they do. A game goes from chaos to order to ever new figures:
//  - the first SWIRL.chaos merges the swirl is wild: the gems wander on slow eddies with no middle to hold on to,
//    each merge calming them a little and shifting the eddies;
//  - the next SWIRL.orderly merges it is plain: the biggest gem holds the middle and the others circle it, each
//    level on a ring of its own, the bigger ones close in, the small ones at the rim. Each merge turns the rings
//    another way: all as one, the inner ones faster, back again, every other ring the other way, quick and slow...
//  - after that each merge brings the next of twelve figures (ovals that turn, a rose, bands that slide past
//    each other, a braid, a whirlpool with wakes, rings that breathe, spiral arms, woven loops, a sun's fall and
//    breath, grooves, a middle that circles, eddies), and after the twelfth they come again mirrored and with more
//    petals, arms and strands. It goes from one pattern to the next in 1.2 s, smoothly.
// A game also starts small, so that there is time to see it: only level 1 is dropped until a gem of level
// SWIRL.ones has been made, then levels 1 and 2 until one of level SWIRL.twos, and from then on the usual kinds.
// The levels that are dropped are the player's to bring together: a gem that is let go falls straight until it
// is in the swirl, so it takes aim and timing to land it by its like. Alike gems of a level that is not dropped
// find each other by themselves: they are drawn along their ring until they meet (and the biggest ones meet in
// the middle). While the swirl is still wild every gem is drawn to its like, the less the calmer it gets.
// In place of the line there is a ring round the swirl: the jar is full when the swirl has grown so big that a
// gem is pushed right out of the ring for 3 seconds. The gems slip past each other, lean the way they go, and
// the one in the middle turns on the spot. The patterns follow the merges and nothing else: no chance in them
// (the wild drift is a fixed field too), and nothing follows how the player is doing.
let swirlStep = 0, figure = -1, figureWas = -1, figureSince = 0;   // the pattern it turns in (the merges it stands for), the one before, since when
const SWIRL_SPIN = [0.004, 0.03, 0.012, 0.01, 0.012, 0.012, 0.01, 0.007, 0.02, 0.006, 0.004, 0.004];   // how fast the one in the middle turns, by figure
// the ring of a gem of level k + 1 when the biggest is of level top + 1: how far its middle is from the swirl's
function ringOf(k, top) {
    const core = TIERS[top], r = TIERS[k];
    const inner = core + r + 3, outer = Math.min(SWIRL.rim - r, core + 60 + 30 * top);   // (a young swirl is a small one)
    if (top < 1 || outer <= inner) return inner;
    return inner + (outer - inner) * Math.pow((top - 1 - k) / Math.max(1, top - 1), 0.85);
}
// Every pattern gives, for a gem at r px and angle a from the swirl's middle, at time t (steps), with its ring at
// R and the core's edge at `core`: [how fast it goes out (px a step), how fast it goes round (a step)].
// The plain ones, in the order the merges bring them:
const ORDERLY = SWIRL ? (() => {
    const K = SWIRL.pull, S = SWIRL.soft, inner = r => SWIRL.turn / (r + S);
    return [
        (r, a, t, R) => [-K * (r - R), 0.008],                                                  // all as one, slowly
        (r, a, t, R) => [-K * (r - R), inner(r)],                                               // the inner rings faster
        (r, a, t, R) => [-K * (r - R), -inner(r)],                                              // the other way
        (r, a, t, R, core, b) => [-K * (r - R), (b.tier % 2 ? -1 : 1) * 0.0095],                // every other ring the other way
        (r, a, t, R) => [-K * (r - R), -0.013],                                                 // all as one, quicker, back again
        (r, a, t, R) => [-K * (r - (R + 9 * Math.sin(t * 0.02))), inner(r)],                    // the rings breathe
        (r, a, t, R, core, b) => [-K * (r - R), (b.tier % 2 ? 1.5 : 0.7) * inner(r)],           // every other ring quick, the ones between slow
        (r, a, t, R) => { const c = Math.cos(a - t * 0.004); return [-K * (r - R * 0.86 / (1 - 0.14 * c * c)), inner(r)]; }   // the rings stretch into ovals that slowly turn
    ];
})() : null;
// The twelve figures (q: how many times all twelve have been round: it gives them more petals, arms and strands)
const FIGURES = SWIRL ? (() => {
    const K = SWIRL.pull, S = SWIRL.soft, round = r => SWIRL.turn / (r + S), TAU = Math.PI * 2;
    return [
        // 0 eddies: a slow turn (the eddies are added to it in swirlAt)
        (r, a, t, R) => [-K * (r - R), 0.010],
        // 1 loops woven in and out, never twice the same (the two turns are in the golden ratio)
        (r, a, t, R, core, b, q) => [-K * (r - (R + 22 * Math.sin((2 + q % 2) * a - t * 0.015) * Math.cos(3 * a + t * 0.00927))), round(r)],
        // 2 a whirlpool, quick inside, with wakes that turn with it
        (r, a, t, R, core, b, q) => { const w = 2 + q % 2; return [-K * (r - R) - 55 * Math.sin(w * a - t * 0.0126) / (r + S),
            441 / ((r + S) * (r + S)) * (1 - Math.exp(-r * r / 3600)) + 0.45 * Math.cos(w * a - t * 0.0126) / (r + S)]; },
        // 3 round a middle that itself goes in a small circle (swirlAt moves it), so the cloud has a thick and a thin side
        (r, a, t, R) => [-K * (r - R), 0.145 / Math.sqrt(r + S)],
        // 4 grooves, a lane every 46 px, all turning together
        (r, a, t, R, core) => [-0.5 * Math.sin(TAU * (r - core) / 46) - 0.02 * (r - R), 0.009],
        // 5 ovals that slowly turn, slow at the far ends and quick past the middle
        (r, a, t, R) => { const c = Math.cos(a - t * 0.0042); return [-K * (r - R * 0.72 / (1 - 0.28 * c * c)), 261 / (r * r + S * S)]; },
        // 6 bands 50 px apart, quick and slow in turn (they slide past each other)
        (r, a, t, R, core) => [-0.5 * Math.sin(TAU * (r - core) / 50) - 0.012 * (r - R), 0.0105 * (1 + 0.8 * Math.cos(Math.PI * (r - core) / 50))],
        // 7 a rose of three petals (then four, then five) that turns with the gem in the middle
        (r, a, t, R, core, b, q) => [-K * (r - (R + 24 * Math.cos((3 + q % 3) * (a - t * SWIRL_SPIN[7])))), 0.009],
        // 8 a braid: two strands woven through each other
        (r, a, t, R, core, b, q) => { const ph = (3 + q % 2) * a - t * 0.0131 + (b.id % 2) * Math.PI; return [-K * (r - (R + 22 * Math.sin(ph))), 0.009 * (1 + 0.25 * Math.cos(ph))]; },
        // 9 rings that breathe in and out
        (r, a, t, R, core) => { const w = TAU * (r - core) / 60; return [-K * (r - R) + 0.5 * Math.sin(w) * Math.cos(t * 0.021), 0.008 / (1 + 0.25 * Math.cos(w) * Math.sin(t * 0.021))]; },
        // 10 spiral arms, like a galaxy: six, then two, four, three, five
        (r, a, t, R, core, b, q) => { const arms = [6, 2, 4, 3, 5][q % 5];
            return [-0.45 * Math.sin(arms * (a - t * SWIRL_SPIN[10]) - 18.5 * Math.log(Math.max(1, r) / Math.max(1, core))) - 0.02 * (r - R), SWIRL_SPIN[10] + 1.2 / (r + S)]; },
        // 11 a sun: faster and faster toward it, and lifted out again by its slow breath
        (r, a, t, R, core) => { const lift = R + 60 * Math.exp(-R / 150) * Math.sin(t * 0.0079) ** 2, near = Math.max(8, r - core + 30); return [-K * (r - lift), Math.sqrt(268 / ((r + S) * near * near))]; }
    ];
})() : null;
const FIGURE_ORDER = [5, 7, 6, 8, 2, 9, 10, 1, 11, 4, 3, 0];   // the order the merges bring them in
// the wild drift at (x, y): the curl of a slow wave, so it stirs the gems without pushing them together or apart;
// every merge (m) shifts its eddies
function wildAt(x, y, t, m) {
    const s = m * 1.7, u = x / 62 + s + t / 170, v = y / 54 - s * 0.6 - t / 210, q = Math.cos((x + y) / 41 + t / 130 + s) * 35 / 41;
    return [SWIRL.wild * (Math.sin(u) * Math.cos(v) * 70 / 54 + q), -SWIRL.wild * (Math.cos(u) * Math.sin(v) * 70 / 62 + q)];
}
// what the pattern of a swirl that has had m merges is: [the stage (0 wild, 1 plain, 2 figures), how much order there
// is in it (0 to 1), the figure, how many times the figures have been round, and which way they turn]
function patternOf(m) {
    if (m < SWIRL.chaos) return [0, m / SWIRL.chaos, -1, 0, 1];
    if (m < SWIRL.chaos + SWIRL.orderly) return [1, 1, -1, 0, 1];
    const n = m - SWIRL.chaos - SWIRL.orderly, q = Math.floor(n / FIGURE_ORDER.length);
    return [2, 1, FIGURE_ORDER[n % FIGURE_ORDER.length], q, q % 2 ? -1 : 1];
}
// the speed the pattern of m merges gives gem b, when the biggest gems are of level top + 1
function swirlAt(m, b, top, t) {
    const [stage, order, fig, q, way] = patternOf(m);
    let cx = SWIRL.x, cy = SWIRL.y;
    if (fig === 0) { cx += 10 * Math.sin(t * 0.0105); cy += 10 * Math.sin(t * 0.021); }           // (the eddies' middle drifts in a figure of eight)
    else if (fig === 3) { cx += 14 * Math.cos(t * 0.0175); cy += 14 * Math.sin(t * 0.0175); }      // (this one's goes in a small circle)
    const dx = b.position.x - cx, dy = b.position.y - cy, r = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
    let vx, vy;
    if (b.tier === top) {                                                                          // the biggest: to the middle, unhurried
        const k = Math.min(0.06, 2.6 / r);
        vx = -dx * k; vy = -dy * k;
    } else {
        const R = ringOf(b.tier, top), core = TIERS[top];
        let [out, round] = stage === 2 ? FIGURES[fig](r, a * way, t, R, core, b, q) : ORDERLY[stage === 0 ? 0 : m - SWIRL.chaos](r, a, t, R, core, b);
        round *= way;
        const far = r + TIERS[b.tier] - SWIRL.rim;
        if (far > 0) out -= 0.25 * far;                                                            // (whatever the pattern, no further out than the rim)
        vx = out * dx / r - round * dy; vy = out * dy / r + round * dx;
    }
    if (stage === 0) {   // still wild: the less order there is yet, the more of the drift (which keeps to the middle part of the ring)
        const [wx, wy] = wildAt(b.position.x, b.position.y, t, m), roam = 105 + 14 * top, back = r > roam ? 0.05 * (r - roam) : 0;
        vx = order * vx + (1 - order) * (wx - back * dx / r);
        vy = order * vy + (1 - order) * (wy - back * dy / r);
    }
    if (fig === 0 && b.tier !== top) {   // smooth eddies over the turn
        const x = b.position.x, y = b.position.y, p = Math.sin(x / 70 + t / 190), e = Math.cos((x + y) / 45 + t / 150) / 90;
        vx += 30 * (-p * Math.sin(y / 55 - t / 230) / 55 + e);
        vy -= 30 * (Math.cos(x / 70 + t / 190) * Math.cos(y / 55 - t / 230) / 70 + e);
    }
    return [vx, vy];
}
// a merge (or a saved game coming back): the swirl has had m merges and its biggest gem so far is of level top + 1
function swirlGrew(m, top) {
    const before = swirlDrops();
    swirlMerges = m;
    swirlTop = Math.max(swirlTop, top);
    if (swirlDrops() !== before && !isGameOver) showToast(swirlDrops() === 2 ? 'Bigger ones now: 1s and 2s!' : 'Now any small gem can come!');
}
if (SWIRL) Events.on(engine, 'beforeUpdate', () => {
    swirlStep++;
    const gems = Composite.allBodies(engine.world).filter(b => b.tier !== undefined && !b.isMerging);
    // a gem that was let go falls straight until it is in the swirl (all of it under the line), or touches a gem of it
    let top = -1;
    for (const b of gems) {
        if (b.isDropping && Math.hypot(b.position.x - SWIRL.x, b.position.y - SWIRL.y) + b.currentRadius < SWIRL.ring - 2) landed(b, 3);
        if (!b.isDropping && b.tier > top) top = b.tier;
    }
    if (swirlMerges !== figure) { figureWas = figure < 0 ? swirlMerges : figure; figure = swirlMerges; figureSince = swirlStep; }
    // from the old pattern to the new one, with no jolt at either end (6u^5 - 15u^4 + 10u^3)
    const u = Math.min(1, (swirlStep - figureSince) / SWIRL.blend), mix = figureWas === figure ? 1 : u * u * u * (u * (6 * u - 15) + 10);
    const push = 1 / (STEP * STEP);   // (a force that changes the speed by 1 px a step)
    const [stage, order, fig, , way] = patternOf(figure);
    // soft, like candy: unlike gems that come near push each other off gently before they touch, so they glide
    // round each other in place of knocking (alike ones are let through: they are to meet and merge)
    if (SWIRL.shove) for (let i = 0; i < gems.length; i++) {
        const a = gems[i];
        if (a.isDropping) continue;
        for (let j = i + 1; j < gems.length; j++) {
            const b = gems[j];
            if (b.isDropping || b.tier === a.tier) continue;
            const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y, d = Math.hypot(dx, dy) || 1;
            const gap = d - a.currentRadius - b.currentRadius;
            if (gap >= SWIRL.apart) continue;
            const f = SWIRL.shove * Math.min(1, 1 - gap / SWIRL.apart) * a.mass * b.mass / (a.mass + b.mass) * push;
            a.force.x -= f * dx / d; a.force.y -= f * dy / d;
            b.force.x += f * dx / d; b.force.y += f * dy / d;
        }
    }
    const given = swirlDrops();   // (levels below this are dropped: theirs is the player's work)
    for (const b of gems) {
        // the one in the middle breathes (its picture swells and shrinks a little; its outline stays as it is)
        if (SWIRL.breath && !b.isGrowing && !b.isDropping) {
            const mid = b.tier === top && order === 1;
            if (mid || b.breathes) {
                b.breathes = mid;
                b.render.sprite.xScale = b.render.sprite.yScale = spriteScale(b.currentRadius) * (mid ? 1 + SWIRL.breath * Math.sin(swirlStep * 0.045) : 1);
            }
        }
        let vx = 0, vy = SWIRL.drop, gain = 0.3;
        if (!b.isDropping) {
            [vx, vy] = swirlAt(figure, b, top, swirlStep);
            if (mix < 1) { const [ox, oy] = swirlAt(figureWas, b, top, swirlStep); vx = ox + (vx - ox) * mix; vy = oy + (vy - oy) * mix; }
            // drawn to its like: a level that is not dropped, always; any level while the swirl is wild (the less the calmer it is)
            const draw = SWIRL.gather * (b.tier >= given ? 1 : 1 - order);
            if (draw > 0) {
                let like = null, near = Infinity;
                for (const o of gems) {
                    if (o === b || o.tier !== b.tier || o.isDropping) continue;
                    const d = Math.hypot(o.position.x - b.position.x, o.position.y - b.position.y);
                    if (d < near) { near = d; like = o; }
                }
                if (like) {
                    // straight to it while there are no rings yet; along its ring once there are (round the middle
                    // gem, not through it: the shorter way, and the two agree which when it is the same either way)
                    const sx = (like.position.x - b.position.x) / (near || 1), sy = (like.position.y - b.position.y) / (near || 1);
                    const dx = b.position.x - SWIRL.x, dy = b.position.y - SWIRL.y, r = Math.hypot(dx, dy) || 1;
                    let turn = Math.atan2(like.position.y - SWIRL.y, like.position.x - SWIRL.x) - Math.atan2(dy, dx);
                    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
                    const side = Math.abs(turn) > 3.05 ? (b.id < like.id ? 1 : -1) : Math.sign(turn) || 1;
                    const along = stage === 0 || b.tier === top ? 0 : 0.65;
                    vx += draw * ((1 - along) * sx - along * side * dy / r);
                    vy += draw * ((1 - along) * sy + along * side * dx / r);
                }
            }
            const v = Math.hypot(vx, vy);
            if (v > 7) { vx *= 7 / v; vy *= 7 / v; }
            gain = SWIRL.steer;
            // it leans the way it goes; the one in the middle turns on the spot
            const lean = b.tier === top && order === 1 ? null : 0.26 * vx / (v || 1);
            if (lean === null) Body.setAngularVelocity(b, way * (fig < 0 ? 0.01 : SWIRL_SPIN[fig]));
            else Body.setAngularVelocity(b, Math.atan2(Math.sin(lean - b.angle), Math.cos(lean - b.angle)) * 0.12);
        }
        b.force.x += b.mass * gain * (vx - b.velocity.x) * push;
        b.force.y += b.mass * gain * (vy - b.velocity.y) * push;
        if (!b.isDropping) {   // past the rim: drawn back in, harder the further (a pattern alone never puts a gem out of the ring: only a full one does)
            const dx = b.position.x - SWIRL.x, dy = b.position.y - SWIRL.y, r = Math.hypot(dx, dy) || 1, far = r + b.currentRadius - SWIRL.rim;
            if (far > 0) { b.force.x -= b.mass * 0.012 * far * dx / r * push; b.force.y -= b.mass * 0.012 * far * dy / r * push; }
        }
        if (b.speed > 9) Body.setVelocity(b, { x: b.velocity.x * 9 / b.speed, y: b.velocity.y * 9 / b.speed });   // (a gem knocked hard in a crowd: no wild flights)
    }
});

// --- THE BEAT --- (a set with beat in GAME.skins, the Neon Nights)
// The jar pulses to a beat: the music's own when a song plays (Sound.beat knows each song's), a steady one of
// its own when none does, marked by a soft drum. A ring closes in on the gem in hand and meets it on the beat.
// The gems dance to it: on every beat each gem that has a like in the jar hops, the small ones high, the big ones
// barely. Whether they hop toward their like or away from it is up to the player: a gem let go within BEAT.within
// ms of a beat is on the beat, and from then on they hop together (and merge by themselves when they meet); a gem
// let go off the beat puts the jar out of tune, and they hop apart, until a gem is let go on the beat again. The
// jar shows which it is (its glow turns from pink and blue to a sour orange). A gem let go on the beat also glows
// until it merges, and that merge counts BEAT.times. The beat never depends on how the player is doing.
function onTheBeat() {
    const b = Sound.beat();
    return Math.min(b.phase, 1 - b.phase) * b.period <= BEAT.within;
}
function setTune(on) {
    inTune = on;
    board.classList.toggle('sour', !on);
}
// a beat: every gem that has landed hops toward its nearest like (out of tune: away from it)
function beatHop() {
    const gems = Composite.allBodies(engine.world).filter(b => b.tier !== undefined && !b.isDropping && !b.isMerging && !b.isGrowing);
    for (const b of gems) {
        let like = null, d = inTune ? BEAT.reach : BEAT.apart;
        for (const o of gems) {
            if (o === b || o.tier !== b.tier) continue;
            const far = Math.hypot(o.position.x - b.position.x, o.position.y - b.position.y);
            if (far < d) { d = far; like = o; }
        }
        if (!like) continue;
        const k = 1 / (1 + BEAT.less * b.tier), way = inTune ? 1 : -1;
        Body.setVelocity(b, { x: b.velocity.x + way * BEAT.hop * k * (like.position.x - b.position.x) / (d || 1),
            y: b.velocity.y + way * BEAT.hop * k * 0.4 * (like.position.y - b.position.y) / (d || 1) - DOWN * BEAT.up * k });
        b.hopLeft = 28;   // (in the air for a moment: the line still counts it, see the jar-full check)
    }
}
if (BEAT) {
    board.classList.add('beat');
    FX.beatGlow(() => Composite.allBodies(engine.world).filter(b => b.onBeat && !b.isMerging).map(b => [b.position.x, b.position.y, b.currentRadius]));
    let was = 0;
    (function pulse() {
        requestAnimationFrame(pulse);
        const b = Sound.beat(), since = b.phase * b.period, left = (1 - b.phase) * b.period;
        board.style.setProperty('--pulse', Math.exp(-since / 150).toFixed(3));   // 1 on the beat, fading
        dropGuide.style.setProperty('--ring', (1 - b.phase).toFixed(3));         // the ring: wide after a beat, closed on the next
        dropGuide.classList.toggle('now', Math.min(since, left) <= BEAT.within);
        if (b.phase < was && !b.music && clockOn && !isGameOver) Sound.play('kick');
        was = b.phase;
    })();
    // the hops are part of the game, so they follow the game's own steps (and stop with it)
    let stepWas = 0;
    Events.on(engine, 'beforeUpdate', () => {
        for (const b of Composite.allBodies(engine.world)) if (b.hopLeft > 0) b.hopLeft--;
        const phase = Sound.beat().phase, beat = phase < stepWas;
        stepWas = phase;
        if (beat && !isGameOver) beatHop();
    });
}

// --- WIRES --- (a set with wires in GAME.skins, the Cyber Circuit)
// Gems that touch are wired together. A gem that has just landed is live for a moment: if a gem of its level
// that it doesn't touch is linked to it by a short chain of touching gems (WIRES.links of them at most between
// the two), a spark runs along the chain from the upper one to the lower one, and when it gets there the two
// merge at the lower one's place, as if they had touched. The merge counts as always, and the gem it makes
// merges on with whatever like it touches. Only gems that have landed are wires. Nothing here is left to
// chance: the nearest pair goes first.
const sparks = [];    // the sparks on their way: { a, b, t, time }: from gem a to gem b, steps gone, steps it takes
let wireStep = 0;
if (WIRES) Events.on(engine, 'beforeUpdate', () => {
    if (isGameOver) { sparks.length = 0; return; }
    const live = new Set(Composite.allBodies(engine.world));
    for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i], there = live.has(s.a) && live.has(s.b) && !s.a.isMerging && !s.b.isMerging;
        if (there && ++s.t < s.time) continue;
        sparks.splice(i, 1);
        s.a.sparking = s.b.sparking = false;
        if (there) mergeGems(s.a, s.b, { x: s.b.position.x, y: s.b.position.y });   // (else one of them merged some other way meanwhile)
    }
    wireStep++;
    // a gem is live from the moment it has landed, or has grown to its size
    const wired = b => b.tier !== undefined && !b.isDropping && !b.isMerging && !b.isGrowing;
    for (const b of live) if (b.liveUntil === undefined && wired(b)) b.liveUntil = b.old || (b.made && !WIRES.chain) ? 0 : wireStep + WIRES.live;
    if (wireStep % WIRES.every) return;
    // who touches whom, among the gems that have landed
    const next = new Map();
    const link = (a, b) => { if (!next.has(a)) next.set(a, []); next.get(a).push(b); };
    for (const pr of engine.pairs.list) {
        const a = pr.bodyA.parent, b = pr.bodyB.parent;
        if (pr.isActive && wired(a) && wired(b)) { link(a, b); link(b, a); }
    }
    // for each gem: the nearest gem of its level along the wires that it doesn't touch, with the chain between them
    const found = [];
    for (const a of next.keys()) {
        if (a.sparking || a.tier >= TIERS.length - 1 || wireStep > a.liveUntil) continue;
        const from = new Map([[a, null]]);
        let ring = [a], hit = null;
        for (let far = 1; far <= WIRES.links + 1 && !hit; far++) {
            const out = [];
            for (const u of ring) {
                for (const v of next.get(u)) {
                    if (from.has(v)) continue;
                    from.set(v, u);
                    out.push(v);
                    if (!hit && far >= 2 && v.tier === a.tier && !v.sparking) hit = v;
                }
            }
            ring = out;
        }
        if (!hit) continue;
        const chain = [];
        for (let u = hit; u; u = from.get(u)) chain.push(u);   // (from the one found back to a)
        found.push(chain);
    }
    found.sort((p, q) => p.length - q.length);
    for (const chain of found) {
        if (chain[0].sparking || chain[chain.length - 1].sparking) continue;        // (already in a spark of this round)
        if (chain[0].position.y < chain[chain.length - 1].position.y) chain.reverse();   // it runs from the upper one down to the lower
        const a = chain[chain.length - 1], b = chain[0], time = (chain.length - 1) * WIRES.hop;
        a.sparking = b.sparking = true;
        sparks.push({ a, b, t: 0, time });
        FX.spark(chain.slice().reverse().map(g => [g.position.x, g.position.y]), time * STEP / SPEED / 1000);
        Sound.play('zap');
        Haptics.play('pickup');
    }
});

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
    const body = BLOCKS ? Bodies.rectangle(x, y, startRadius * BLOCKS.side, startRadius * BLOCKS.side, {   // a square that never turns (BLOCKS)
        restitution: 0, friction: 0.9, frictionStatic: 1, density: 0.001 * (tier + 1), slop: 0.01, inertia: Infinity,
        chamfer: { radius: startRadius * BLOCKS.side * 0.05 }, render: { sprite: { texture: SPRITES[tier], xScale: scale, yScale: scale } }, tier
    }) : Bodies.fromVertices(x, y, [outline.map(p => ({ x: p.x * scale, y: p.y * scale }))], {
        restitution: bounceOf(tier),   // heavier gems bounce less (see WEIGHT)
        friction: SWIRL ? 0.02 : 0.5,  // (in a swirl they slip past each other)
        frictionAir: SWIRL ? 0 : 0.01,
        density: 0.001 * (tier + 1) * weightOf(tier),
        slop: 0.01,
        render: { sprite: { texture: SPRITES[tier], xScale: scale, yScale: scale } },
        tier: tier
    });
    // Set after creation: Matter rewrites sprite offsets from the hitbox bounds while creating the body
    body.render.sprite.xOffset = BLOCKS ? 0.5 : centre.x / SPRITE_SIZE;
    body.render.sprite.yOffset = BLOCKS ? 0.5 : centre.y / SPRITE_SIZE;

    if (animateGrowth) Body.setVelocity(body, { x: 0, y: 2 * DOWN }); // slight push the way gems fall (dev plan §4)
    body.isDropping = !animateGrowth; // merge results are already in the pile
    body.isGrowing = animateGrowth;
    body.currentRadius = startRadius;
    body.targetRadius = targetRadius;

    if (BLOCKS) syncSprite(body);
    Composite.add(engine.world, body);
    return body;
}

function syncSprite(body) {
    if (BLOCKS) {   // the block's own picture, as wide as the block (the gem's alone until that is drawn)
        const art = `block${body.tier}`, ready = !!render.textures[art];
        body.render.sprite.texture = ready ? art : SPRITES[body.tier];
        body.render.sprite.xScale = body.render.sprite.yScale = body.currentRadius * BLOCKS.side / SPRITE_SIZE * (ready ? 1 : 0.8);
        return;
    }
    const scale = spriteScale(body.currentRadius);
    body.render.sprite.xScale = scale;
    body.render.sprite.yScale = scale;
}

// --- BLOCKS --- (a set with blocks in GAME.skins, the Pixel Treasure)
// Like an old video game: every gem sits in a square block. A block falls straight down, never turns and never
// rolls, and blocks stack. A block stays where it lands as long as its middle has something under it, or it
// rests on blocks at both sides; one whose middle hangs over an edge slips off that edge (if there is room
// beside it) and falls straight on, so a pile has no blocks hanging in the air. Two alike that touch, side by
// side or one on the other, merge as always. Each level's block has the colour of its gem (drawn here once the
// gem's picture has loaded: a tile in big pixels with a light and a dark edge, the gem on it).
const blockUrl = [];   // per level: the block's picture for the hand and the tray
if (BLOCKS) Events.on(engine, 'beforeUpdate', () => {
    const blocks = Composite.allBodies(engine.world).filter(b => b.tier !== undefined && !b.isMerging);
    for (const b of blocks) {
        const x = b.position.x, foot = b.bounds.max.y;
        if (b.isDropping || foot >= GAME_HEIGHT - 2) continue;        // still falling, or on the floor
        let left = false, right = false;                               // what it stands on: left of its middle, right of it
        for (const o of blocks) {
            if (o === b || Math.abs(o.bounds.min.y - foot) > 4) continue;
            const from = Math.max(o.bounds.min.x, b.bounds.min.x), to = Math.min(o.bounds.max.x, b.bounds.max.x);
            if (to - from < 1) continue;
            if (from <= x + 1 && to >= x - 1) left = right = true;     // (under its middle)
            else if (to < x) left = true;
            else right = true;
        }
        if (left === right) continue;                                  // held up well, or in the air
        // it tips to the side with nothing under it, if nothing stands in its way there
        const way = left ? 1 : -1, edge = way > 0 ? b.bounds.max.x : b.bounds.min.x;
        if (way > 0 ? edge + 3 > GAME_WIDTH : edge - 3 < 0) continue;
        if (blocks.some(o => o !== b && o.bounds.max.y > b.bounds.min.y + 2 && o.bounds.min.y < foot - 2
            && (way > 0 ? o.bounds.min.x < edge + 3 && o.bounds.max.x > edge : o.bounds.max.x > edge - 3 && o.bounds.min.x < edge))) continue;
        Body.setVelocity(b, { x: way * 1.6, y: b.velocity.y });
    }
});
if (BLOCKS) SPRITES.forEach((src, tier) => {
    const img = new Image();
    img.onload = () => {
        const S = SPRITE_SIZE, P = S / 16, c = document.createElement('canvas'), x = c.getContext('2d');
        c.width = c.height = S;
        // the gem's own colour: the mean of its picture
        x.drawImage(img, 0, 0, 16, 16);
        const px = x.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 128) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
        x.clearRect(0, 0, S, S);
        const shade = k => `rgb(${[r, g, b].map(v => Math.round(Math.min(255, v / (n || 1) * k + 18 * (1 - Math.min(1, k))))).join(',')})`;
        const cell = (cx, cy, w, h, col) => { x.fillStyle = col; x.fillRect(cx * P, cy * P, w * P, h * P); };
        cell(1, 0, 14, 16, '#120a2c'); cell(0, 1, 16, 14, '#120a2c');            // the outline, its corners cut
        cell(1, 1, 14, 14, shade(0.42));                                          // the face
        cell(1, 1, 14, 1, shade(0.8)); cell(1, 1, 1, 14, shade(0.8));             // light from the top left
        cell(1, 14, 14, 1, shade(0.2)); cell(14, 1, 1, 14, shade(0.2));           // shade at the bottom right
        x.imageSmoothingEnabled = false;
        x.drawImage(img, S * 0.14, S * 0.14, S * 0.72, S * 0.72);
        render.textures[`block${tier}`] = c;
        blockUrl[tier] = c.toDataURL();
        for (const o of Composite.allBodies(engine.world)) if (o.tier === tier) syncSprite(o);
        updateUI();
    };
    img.src = src;
});

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
    const inThere = b => SWIRL ? Math.hypot(b.position.x - SWIRL.x, b.position.y - SWIRL.y) + (b.currentRadius || 0) > SWIRL.ring * 0.72   // (a swirl: its outer part)
        : FLOAT ? b.bounds.max.y > GAME_HEIGHT - clearAbove : b.bounds.min.y < clearAbove;
    Composite.allBodies(engine.world).filter(b => (b.tier !== undefined || b.crate || b.cinder) && inThere(b)).forEach(b => {
        if (b.crate) { Mine.breakCrate(b); return; }   // (a Gem Mine crate up there counts as broken)
        if (b.cinder) { breakCinder(b, false); return; }
        FX.merge(b.position.x, b.position.y, TIERS[b.tier], 0);
        Composite.remove(engine.world, b);
    });
    if (LAVA) { lavaDrops = 0; eruptIn = -1; lavaUI(false); }   // (THE VOLCANO: the lava goes down, the same stone is asked again)
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
// It goes on when another gem set is picked, except into or out of a swirl set (the Spiral Atoms), which keeps
// a game of its own: its gems are smaller and lie in no pile, so a long game of it would not fit a jar, and the
// other sets' game stays as it was for when the player goes back.
const SAVE_KEY = (DAILY ? `${GAME.id}.save.daily` : `${GAME.id}.save.${MODE}${REVERSE ? '.reverse' : ''}`) + (SWIRL ? '.swirl' : '');
let saving = !RUSH && !MINE;     // a Gem Rush or a Gem Mine stage is not saved: leaving it ends it
let revives = 0;       // how many times the "keep going" ad was used this game
const MAX_REVIVES = 2;

function saveGame() {
    if (!saving || isGameOver) return;
    const items = Composite.allBodies(engine.world)
        .filter(b => b.tier !== undefined && !b.isMerging)
        .map(b => HEAT ? [b.tier, +b.position.x.toFixed(1), +b.position.y.toFixed(1), +b.angle.toFixed(3), +(b.heat || 0).toFixed(2)]   // (THE HEAT: and how hot it is)
            : [b.tier, +b.position.x.toFixed(1), +b.position.y.toFixed(1), +b.angle.toFixed(3)]);
    const data = { v: 1, score, current: currentTier, next: nextTier, combo, dropsWithoutMerge, revived: revives, items, float: FLOAT };
    if (DAILY) Object.assign(data, { date: TODAY, rng: dropRandom.getState(), made, maxCombo });
    if (ERUPT) data.heat = heat;   // (full: a lava bomb is in the hand, or on its way down)
    if (TWINS) { data.mate = currentMate; data.nextMate = nextMate; }   // (the other gem of the pair in hand, and of the next)
    if (SWIRL) data.swirl = [swirlMerges, swirlTop];                    // (how far the swirl has come: its pattern, and what is dropped)
    if (BEAT) data.sour = !inTune;                                      // (out of tune: alike gems hop apart)
    if (LAVA) data.lava = [lavaAsk, lavaDrops];                         // (which stone the volcano asks for, and the drops since)
    if (HEAT) data.lavaHigh = +lavaWant.toFixed(1);                     // (how high the lava has come)
    if (CLASH || LAVA) data.cinders = cinders().map(c => [+c.position.x.toFixed(1), +c.position.y.toFixed(1), +c.circleRadius.toFixed(1), +c.angle.toFixed(3)]);
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
    if (HEAT && data.lavaHigh > 0) { lavaWant = lavaY = Math.min(GAME_HEIGHT - DANGER_Y, +data.lavaHigh); lavaFloor(); }   // (the lava where it stood, before the pile is put on it)
    for (const [tier, x, y, angle, hot] of data.items) {
        if (!okTier(tier)) continue;
        const body = spawnItem(x, turn ? GAME_HEIGHT - y : y, tier, false);
        if (!BLOCKS) Body.setAngle(body, (turn ? -1 : 1) * (angle || 0));
        body.isDropping = false;   // it was already in the pile
        body.old = true;           // (WIRES: so it sends no spark)
        if (HEAT && hot > 0) body.heat = Math.min(0.99, +hot);
    }
    score = shownScore = Math.max(0, data.score | 0);
    scoreEl.textContent = score;
    isNewBest = score > 0 && score >= bestScore;
    if (okTier(data.current)) currentTier = data.current;
    if (okTier(data.next)) nextTier = data.next;
    if (BEAT) setTune(!data.sour);
    if (LAVA && Array.isArray(data.lava)) {   // (the lava stands where it stood, with the pile on it)
        lavaAsk = Math.max(0, data.lava[0] | 0); lavaDrops = Math.max(0, data.lava[1] | 0);
        lavaY = lavaGoal(); lavaFloor();
        if (lavaDrops >= askDrops()) eruptIn = LAVA.wait;
        lavaUI(false);
    }
    if ((LAVA || CLASH && CLASH.cinder) && Array.isArray(data.cinders)) {
        for (const [x, y, r, angle] of data.cinders) if ([x, y, r].every(Number.isFinite) && r > 4 && r < 200) makeCinder(x, turn ? GAME_HEIGHT - y : y, r, angle || 0);
    }
    if (SWIRL) {   // (a game saved before the swirl kept count: it has long been through its first patterns)
        const top = Math.max(0, ...data.items.map(it => it[0] | 0).filter(okTier));
        if (Array.isArray(data.swirl)) { swirlMerges = Math.max(0, data.swirl[0] | 0); swirlTop = Math.max(top, Math.min(TIERS.length - 1, data.swirl[1] | 0)); }
        else if (data.items.length) { swirlMerges = SWIRL.chaos + SWIRL.orderly; swirlTop = Math.max(top, SWIRL.twos - 1); }
    }
    if (TWINS) {   // (a game saved in another set, or before the pairs: new mates for the gems it has)
        currentMate = okTier(data.mate) && data.mate < DROPS && (TWINS.same || data.mate !== currentTier) ? data.mate : mateFor(currentTier);
        nextMate = okTier(data.nextMate) && data.nextMate < DROPS && (TWINS.same || data.nextMate !== nextTier) ? data.nextMate : mateFor(nextTier);
    }
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
    const items = Composite.allBodies(engine.world).filter(b => (b.tier !== undefined || (withCrates && (b.crate || b.cinder))) && !b.isMerging);
    let target = Matter.Query.point(items, p)[0];
    if (!target) {
        let nearest = 24;
        for (const b of items) {
            const gap = Math.hypot(b.position.x - p.x, b.position.y - p.y) - (b.crate ? 30 : b.cinder ? b.circleRadius : TIERS[b.tier]);
            if (gap < nearest) { nearest = gap; target = b; }
        }
    }
    return target || null;
}

// a tap on the board while the Zap is armed (in the Gem Mine, a crate can be zapped: it breaks)
function zapAt(e) {
    const target = gemAt(e, !!MINE || !!CLASH || !!LAVA);
    if (!target) { showToast(MINE ? 'Tap a gem or a crate to zap it' : CLASH || LAVA ? 'Tap a gem or a cinder to zap it' : 'Tap a gem to zap it'); return; }
    if (target.crate) {
        FX.zap(target.position.x, target.position.y, 30);
        Mine.breakCrate(target);
    } else if (target.cinder) {   // (FIRE AND STONE: lightning breaks a cinder)
        FX.zap(target.position.x, target.position.y, target.circleRadius);
        breakCinder(target, false);
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
            vx: b.velocity.x, vy: b.velocity.y, spin: b.angularVelocity, dropping: !!b.isDropping, heat: b.heat || 0 })),
        score, bestScore, isNewBest, combo, dropsWithoutMerge, current: currentTier, next: nextTier, mate: currentMate, nextMate, heat, bomb,
        swirl: [swirlMerges, swirlTop], tune: inTune, lava: [lavaAsk, lavaDrops, lavaY, eruptIn], lavaHigh: [lavaWant, lavaY],
        cinders: CLASH || LAVA ? cinders().map(c => ({ x: c.position.x, y: c.position.y, r: c.circleRadius, angle: c.angle, vx: c.velocity.x, vy: c.velocity.y })) : [],
        daily: DAILY ? { rng: dropRandom.getState(), made: made.slice(), maxCombo } : null
    };
}

function undoLastDrop() {
    const s = lastDrop;
    if (!s || isGameOver) return;
    lastDrop = null;
    Composite.allBodies(engine.world).filter(b => b.tier !== undefined || b.bomb || b.cinder).forEach(b => { b.gone = true; Composite.remove(engine.world, b); });
    for (const c of s.cinders) Body.setVelocity(makeCinder(c.x, c.y, c.r, c.angle), { x: c.vx, y: c.vy });   // (FIRE AND STONE: the cinders as they were)
    for (const it of s.items) {
        const body = spawnItem(it.x, it.y, it.tier, false);
        if (!BLOCKS) { Body.setAngle(body, it.angle); Body.setAngularVelocity(body, it.spin); }
        Body.setVelocity(body, { x: it.vx, y: it.vy });
        body.isDropping = it.dropping;
        body.old = !it.dropping;   // (WIRES: a gem put back in the pile sends no spark)
        if (it.heat) body.heat = it.heat;
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
    currentMate = s.mate;
    nextMate = s.nextMate;
    [swirlMerges, swirlTop] = s.swirl;   // (THE SWIRL: the pattern and the kinds that are dropped go back too)
    if (BEAT) setTune(s.tune);           // (THE BEAT: and whether the jar was in tune)
    if (LAVA) { [lavaAsk, lavaDrops, lavaY, eruptIn] = s.lava; lavaFloor(); lavaUI(false); }   // (THE VOLCANO: its lava, and what it asked for)
    if (HEAT) { [lavaWant, lavaY] = s.lavaHigh; melting.length = 0; lavaFloor(); }             // (THE HEAT: the lava as high as it was; what melted is back)
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
    row.className = 'need' + (counting || SKINS[i].mineStars || SKINS[i].level ? '' : ' later');
    if (SKINS[i].mineStars) {
        const chip = document.createElement('span');
        for (const src of ['assets/mine/icon_pickaxe.png', 'assets/ui/icon_star.png']) { const im = document.createElement('img'); im.src = src; im.alt = ''; chip.append(im); }
        chip.append(`${Math.min(Mine.totalStars(), SKINS[i].mineStars)}/${SKINS[i].mineStars}`);
        row.append(chip);
        return row;
    }
    if (SKINS[i].level) {   // (a set that opens with a level: the level so far and the one it asks for)
        const chip = document.createElement('span');
        chip.append(`Level ${Math.min(Math.max(1, playerLevel()), SKINS[i].level)}/${SKINS[i].level}`);
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
            sk.wave && '💎 Blast (not in the Gem Mine): every merge goes off and throws the gems around it into the air, a bigger gem further',
            sk.rubber && '🏀 Rubber (not in the Gem Mine): everything bounces a few times before it lies still',
            sk.blocks && '🧱 Blocks (not in the Gem Mine): square blocks that fall straight down and never roll',
            sk.glitch && '👾 Glitch (not in the Gem Mine): at every merge a gem vanishes and comes back somewhere else, at random',
            sk.swirl && '🌀 The swirl (not in the Gem Mine): no pile: it starts wild, then the gems circle the biggest one, and every merge changes the pattern; small gems first',
            sk.wires && '⚡ Wired (not in the Gem Mine): a gem that lands sends a spark through the gems it touches to its like, and the two merge',
            sk.beat && '🎵 The beat (not in the Gem Mine): on every beat alike gems hop together if you let go on the beat (and its merge counts double), apart if you let go off it',
            sk.twins && (sk.twins.same ? '♛ Royal twins (not in the Gem Mine): every gem falls as a pair, mirrored left and right'
                : '♛ Royal pairs (not in the Gem Mine): two different jewels fall at once, mirrored left and right'),
            sk.erupt && '🌋 Merges heat the volcano (not in the Gem Mine): when it is full you get a lava bomb that burns the small gems around where it lands',
            sk.heat && '🌋 Heat (not in the Gem Mine): the nearer the lava, the hotter; a bigger stone stands more heat; one left in too much melts, and the lava rises',
            sk.lava && '🌋 Feed the volcano (not in the Gem Mine): its lava rises with every drop; make the stone it asks for and the lava sinks and the cinders crumble; too late, and it erupts',
            sk.clash && '🌋 Fire and stone (not in the Gem Mine): a stone let go onto one 5 or more levels bigger burns up with it and leaves a cinder; only a big gem made beside a cinder breaks it',
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
