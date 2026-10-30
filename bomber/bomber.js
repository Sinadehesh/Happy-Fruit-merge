// --- ZOMBIE BOMBER ---
// 300 levels. The player switches between two modes any time (MERGE | BOMB buttons):
//   MERGE: drop bombs into the bomb bay; two of the same merge into a bigger bomb (Happy Fruit Merge rules).
//   BOMB: tap a bomb in the bay and the plane drops it on the zombies below.
// Zombies keep walking toward your base the whole time, and soldiers on the base shoot at them.
// Zombies drop coins. Between levels the coins buy upgrades in the shop (Soldiers, Weapons, Base, Bombs).
// Level, coins and upgrades are saved in the browser.

const { Engine, Bodies, Body, Composite, Events, Query } = Matter;

// ---------- LAYOUT (logical pixels; the canvas is scaled to fit the screen) ----------
const W = 450, H = 800;
const HUD_H = 56;
const BATTLE_TOP = HUD_H;
const GROUND_Y = 290;            // top of the ground strip
const BATTLE_BOTTOM = 346;
const LANE_TOP = GROUND_Y + 6;   // zombies walk on lanes between these
const LANE_BOTTOM = BATTLE_BOTTOM - 8;
const IMPACT_Y = GROUND_Y + 22;
const PHASE_BAR = { y: 350, h: 28 };
const BAY = { x: 12, y: 384, w: 426, h: 406 };
const BAY_LINE = 70;             // overflow line, in bay coordinates
const BASE_X = 96;               // zombies reaching this x hit your base
const BASE_ART_SCALE = 0.42;     // base art is drawn at this many canvas px per sheet px (keeps the stages' relative sizes)
// Where soldiers stand: on the ground in front of the base, back and front rows
const SOLDIER_SPOTS = [{ x: 92, y: LANE_BOTTOM }, { x: 79, y: LANE_TOP + 12 }, { x: 66, y: LANE_BOTTOM },
    { x: 53, y: LANE_TOP + 12 }, { x: 40, y: LANE_BOTTOM }];
const SOLDIER_RANGE = 220;
const COIN_HUD = { x: 150, y: 30 };   // where dropped coins fly to

// ---------- BOMBS ----------
// Art for each level (cut from assets/bomber/bombs/source_sheet.webp). If an image can't load,
// that bomb is drawn in code instead. Hitboxes come from the sprite outlines in shapes.js.
const BOMB_SPRITES = ['firecracker', 'cherry_bomb', 'grenade', 'dynamite', 'tnt', 'cluster_bomb', 'aerial_bomb',
    'napalm', 'bunker_buster', 'thermobaric', 'mega_nuke', 'black_hole']
    .map((name, i) => `../assets/bomber/bombs/${String(i + 1).padStart(2, '0')}_${name}.png`);
const SPRITE_SIZE = 256;   // sprite images are 256x256
const SPRITE_FIT = 1.08;   // draw slightly bigger than the hitbox so the art touches

const BOMBS = [
    { name: 'Firecracker',   body: '#ff4757', band: '#ffd32a', icon: 'band' },
    { name: 'Cherry Bomb',   body: '#d63031', band: '#2ecc71', icon: 'leaf' },
    { name: 'Grenade',       body: '#6ab04c', band: '#2f5d1e', icon: 'pin' },
    { name: 'Dynamite',      body: '#e17055', band: '#2d3436', icon: 'sticks' },
    { name: 'TNT Barrel',    body: '#e84118', band: '#fbc531', icon: 'tnt' },
    { name: 'Cluster Bomb',  body: '#0984e3', band: '#dff9fb', icon: 'dots' },
    { name: 'Aerial Bomb',   body: '#57606f', band: '#fbc531', icon: 'rivets' },
    { name: 'Napalm',        body: '#ff9f1a', band: '#2d3436', icon: 'flame' },
    { name: 'Bunker Buster', body: '#2f3542', band: '#ff6b35', icon: 'hazard' },
    { name: 'Thermobaric',   body: '#8e44ad', band: '#f5f6fa', icon: 'skull' },
    { name: 'Mega Nuke',     body: '#f9ca24', band: '#2d3436', icon: 'rad' },
    { name: 'Black Hole',    body: '#1e1336', band: '#e056fd', icon: 'void' }
];
const BOMB_R = [22, 27, 33, 39, 46, 53, 61, 69, 78, 87, 97, 108];   // radius in the bay; even steps so no level dwarfs the rest
const blastRadius = t => (22 + t * 16) * stats().blastMul;          // on the battlefield
const blastDamage = t => Math.round(2 * Math.pow(1.75, t));

// ---------- ZOMBIES ----------
// Zombie art (cut from assets/bomber/zombies/source_sheet.webp); drawn in code if an image can't load
const ZOMBIE_SPRITES = {
    walker: '../assets/bomber/zombies/01_walker.png',
    runner: '../assets/bomber/zombies/02_runner.png',
    brute: '../assets/bomber/zombies/03_brute.png',
    boss: '../assets/bomber/zombies/04_boss.png',
    sprinter: '../assets/bomber/zombies2/01_sprinter.png',
    trooper: '../assets/bomber/zombies2/02_trooper.png',
    bloater: '../assets/bomber/zombies2/03_bloater.png',
    screamer: '../assets/bomber/zombies2/04_screamer.png',
    hulk: '../assets/bomber/zombies2/05_hulk.png',
    ghoul: '../assets/bomber/zombies2/06_ghoul.png',
    juggernaut: '../assets/bomber/zombies2/07_juggernaut.png',
    titan: '../assets/bomber/zombies2/08_titan.png'
};
// Soldier bullets, one per upgrade step (see bulletTier)
const BULLET_SPRITES = ['rifle', 'tracer', 'heavy', 'plasma'].map((n, i) => `../assets/bomber/bullets/0${i + 1}_${n}.png`);
// UI art (assets/bomber/ui); each falls back to the drawn look if it can't load
const UI_SPRITES = ['btn_green_long', 'btn_sound_on', 'btn_sound_off', 'btn_city', 'btn_play', 'ribbon',
    'icon_gift', 'icon_star', 'icon_heart', 'icon_zombie', 'icon_bomb', 'icon_trophy', 'icon_coin', 'panel', 'btn_purple_long'];
const PLANE_SPRITE = '../assets/bomber/plane.png';
// Soldier art, one image per Soldiers upgrade level (cut from assets/bomber/soldiers/source_sheet.webp)
const SOLDIER_SPRITES = ['recruit', 'rifleman', 'grenadier', 'machine_gunner', 'sniper', 'flamethrower', 'heavy_gunner', 'elite']
    .map((n, i) => `../assets/bomber/soldiers/0${i + 1}_${n}.png`);
// Base art, one image per stage (2 Base upgrade levels per stage), tight-cropped at sheet resolution
const BASE_SPRITES = ['outpost', 'bunker', 'fort', 'fortress'].map((n, i) => `../assets/bomber/base/0${i + 1}_${n}.png`);
// Drawn soldiers if the art can't load: each upgrade level gets its own colors and a longer gun
const SOLDIER_LOOKS = [
    { body: '#7a8f4a', helmet: '#5b6e33', gun: 9,  gunColor: '#2d3436' },
    { body: '#5a7d3a', helmet: '#4b6b2f', gun: 13, gunColor: '#2d3436' },
    { body: '#c2a36b', helmet: '#8b7d4b', gun: 13, gunColor: '#2d3436' },
    { body: '#3d5229', helmet: '#2f3d1f', gun: 16, gunColor: '#1e272e' },
    { body: '#6d7f4f', helmet: '#3f4d2a', gun: 20, gunColor: '#1e272e' },
    { body: '#e67e22', helmet: '#7f8c8d', gun: 14, gunColor: '#d35400' },
    { body: '#2e86de', helmet: '#34495e', gun: 17, gunColor: '#576574' },
    { body: '#2d3436', helmet: '#c0392b', gun: 17, gunColor: '#48dbfb' }
];

// Battlefield backgrounds, switched with the 🌆 button. groundRow = image row where the grass starts.
const BACKGROUNDS = [
    { src: '../assets/bomber/bg_city.webp', groundRow: 666 },
    { src: '../assets/bomber/bg_ruins.webp', groundRow: 806, fadeGround: true },
    { src: null }  // drawn in code
];

// 12 zombie types. The first four show up in the first 10 levels; after that a new type is discovered
// every 20 levels (20, 40, ... 160). `weight` = how common it is once discovered; `pts` also sets the coins it drops.
// look: extra details for the drawn version (types without art yet).
const ZOMBIES = {
    walker:     { name: 'Walker',     unlock: 1,   skin: '#7bd389', shirt: '#4a69bd', pants: '#353b48', size: 1.0,  hp: 3,   speed: 13,  dmg: 1,  pts: 10,  weight: 3 },
    runner:     { name: 'Runner',     unlock: 2,   skin: '#badc58', shirt: '#eb4d4b', pants: '#2f3640', size: 0.85, hp: 2,   speed: 30,  dmg: 1,  pts: 15,  weight: 2 },
    brute:      { name: 'Brute',      unlock: 3,   skin: '#4b9e6b', shirt: '#6d214f', pants: '#1e272e', size: 1.6,  hp: 16,  speed: 7,   dmg: 3,  pts: 50,  weight: 1 },
    boss:       { name: 'Zombie King', unlock: 5,  skin: '#26de81', shirt: '#130f40', pants: '#000000', size: 2.6,  hp: 90,  speed: 4.5, dmg: 10, pts: 400, weight: 0, boss: true, look: 'crown' },
    trooper:    { name: 'Trooper',    unlock: 20,  skin: '#8fbc8f', shirt: '#556b2f', pants: '#3b3b2e', size: 1.05, hp: 10,  speed: 12,  dmg: 2,  pts: 40,  weight: 1.2, look: 'helmet' },
    sprinter:   { name: 'Sprinter',   unlock: 40,  skin: '#c4e538', shirt: '#e84393', pants: '#2d3436', size: 0.8,  hp: 4,   speed: 48,  dmg: 1,  pts: 35,  weight: 1, look: 'mohawk' },
    bloater:    { name: 'Bloater',    unlock: 60,  skin: '#a3cb38', shirt: '#ffbe76', pants: '#6d4c41', size: 1.5,  hp: 30,  speed: 8,   dmg: 4,  pts: 80,  weight: 0.7, look: 'fat' },
    screamer:   { name: 'Screamer',   unlock: 80,  skin: '#d6a2e8', shirt: '#5f27cd', pants: '#2c2c54', size: 1.1,  hp: 14,  speed: 26,  dmg: 2,  pts: 70,  weight: 0.9, look: 'hood' },
    hulk:       { name: 'Hulk',       unlock: 100, skin: '#009432', shirt: '#2c2c54', pants: '#1e272e', size: 2.0,  hp: 60,  speed: 9,   dmg: 5,  pts: 150, weight: 0.5, look: 'horns' },
    ghoul:      { name: 'Ghoul',      unlock: 120, skin: '#c8d6e5', shirt: '#222f3e', pants: '#10161e', size: 1.2,  hp: 30,  speed: 34,  dmg: 3,  pts: 140, weight: 0.7, look: 'glow' },
    juggernaut: { name: 'Juggernaut', unlock: 140, skin: '#6ab04c', shirt: '#57606f', pants: '#2f3542', size: 2.2,  hp: 160, speed: 6,   dmg: 8,  pts: 300, weight: 0.3, look: 'armor' },
    titan:      { name: 'Titan',      unlock: 160, skin: '#1dd1a1', shirt: '#341f97', pants: '#130f40', size: 2.9,  hp: 400, speed: 4,   dmg: 15, pts: 900, weight: 0.12,   look: 'horns' }
};
for (const [kind, t] of Object.entries(ZOMBIES)) t.kind = kind;

const MAX_LEVEL = 300;

// Difficulty: only the number, speed and crowding of zombies go up with the level
const levelZombieCount = level => Math.min(150, Math.round(5 + level * 0.45));
const levelHpMul = level => 1 + (level - 1) * 0.035;
const levelSpeedMul = level => Math.min(2.2, 1 + (level - 1) * 0.004);
const levelSpawnEvery = level => Math.max(0.22, 2.3 - level * 0.025);
const levelGroupSize = level => 1 + Math.floor(level / 50);   // zombies arriving together

// ---------- UPGRADE SHOP ----------
// Zombies drop coins; between levels the coins buy levels in 4 upgrade tracks.
const UPGRADES = {
    soldiers: { name: 'SOLDIERS', max: 8,  price: 60 },
    weapons:  { name: 'WEAPONS',  max: 8,  price: 50 },
    base:     { name: 'BASE',     max: 8,  price: 40 },
    bombs:    { name: 'BOMBS',    max: 10, price: 80 }
};
const upgradePrice = (key, lv) => Math.round(UPGRADES[key].price * Math.pow(1.8, lv - 1));  // from lv to lv + 1
const SOLDIER_COUNT = [1, 1, 2, 2, 3, 3, 4, 5];
const coinsFor = type => Math.max(1, Math.round(type.pts / 5));

// Progress saved in the browser
const SAVE_KEY = 'zombieBomber.save';
let save = { level: 1, coins: 0, up: { soldiers: 1, weapons: 1, base: 1, bombs: 1 }, bestScore: 0, won: false };
try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) save = { ...save, level: s.level || 1, coins: s.coins || 0, bestScore: s.bestScore || 0, won: !!s.won, up: { ...save.up, ...(s.up || {}) } };
} catch (e) {}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// What the current upgrade levels do
function stats(up = save.up) {
    return {
        soldiers: SOLDIER_COUNT[up.soldiers - 1],
        soldierLook: up.soldiers - 1,                                   // one look per level
        soldierDmg: (1 + 0.25 * (up.soldiers - 1)) * (1 + 0.35 * (up.weapons - 1)),
        fireRate: 1 + 0.12 * (up.weapons - 1),
        bulletTier: Math.min(3, Math.floor((up.weapons - 1) / 2)),     // rifle, tracer, heavy, plasma
        baseHp: 10 + 8 * (up.base - 1),
        baseStage: Math.min(3, Math.floor((up.base - 1) / 2)),          // which base art to draw
        dropMin: Math.floor((up.bombs - 1) / 3),                        // smallest bomb you drop
        blastMul: 1 + 0.08 * (up.bombs - 1)
    };
}

// What the next level of a track gives, for the shop card
function upgradeEffect(key) {
    const now = stats(), next = stats({ ...save.up, [key]: save.up[key] + 1 });
    switch (key) {
        case 'soldiers': return next.soldiers > now.soldiers ? '+1 SOLDIER' : 'STRONGER SOLDIERS';
        case 'weapons': return next.bulletTier > now.bulletTier ? 'NEW BULLETS!' : '+35% DAMAGE';
        case 'base': return '+8 BASE HP';
        case 'bombs': return next.dropMin > now.dropMin ? 'BIGGER BOMB DROPS' : '+8% BLAST';
    }
}

// ---------- CANVAS ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let viewScale = 1;

function resize() {
    viewScale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${W * viewScale}px`;
    canvas.style.height = `${H * viewScale}px`;
    canvas.width = Math.round(W * viewScale * dpr);
    canvas.height = Math.round(H * viewScale * dpr);
    ctx.setTransform(viewScale * dpr, 0, 0, viewScale * dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
}
window.addEventListener('resize', resize);
resize();

const FONT = "'Luckiest Guy', 'Arial Black', system-ui, sans-serif";

function loadImages(paths) {
    return paths.map(src => { const img = new Image(); img.src = src; return img; });
}
const bombImgs = loadImages(BOMB_SPRITES);
const zombieImgs = Object.fromEntries(Object.entries(ZOMBIE_SPRITES).map(([k, src]) => [k, loadImages([src])[0]]));
const planeImg = loadImages([PLANE_SPRITE])[0];
const bulletImgs = loadImages(BULLET_SPRITES);
const soldierImgs = loadImages(SOLDIER_SPRITES);
const baseImgs = loadImages(BASE_SPRITES);
const uiImgs = Object.fromEntries(UI_SPRITES.map(n => [n, loadImages([`../assets/bomber/ui/${n}.png`])[0]]));
// Draw a UI image fitted (keeping its shape) into a box centred on (cx, cy); returns false if not loaded
function drawUi(name, cx, cy, w, h) {
    const img = uiImgs[name];
    if (!imgReady(img)) return false;
    const k = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    ctx.drawImage(img, cx - img.naturalWidth * k / 2, cy - img.naturalHeight * k / 2, img.naturalWidth * k, img.naturalHeight * k);
    return true;
}
const bgImgs = BACKGROUNDS.map(bg => bg.src ? loadImages([bg.src])[0] : null);
const imgReady = img => img && img.complete && img.naturalWidth > 0;
let bgIndex = 0;
try { bgIndex = Math.min(BACKGROUNDS.length - 1, Math.max(0, parseInt(localStorage.getItem('zombieBomber.bg'), 10) || 0)); } catch (e) {}
function nextBackground() {
    bgIndex = (bgIndex + 1) % BACKGROUNDS.length;
    try { localStorage.setItem('zombieBomber.bg', bgIndex); } catch (e) {}
}

// ---------- SOUND (synthesized, no files) ----------
const Sound = (() => {
    let ac = null, master = null, muted = false;
    function init() {
        if (ac) return;
        try {
            ac = new (window.AudioContext || window.webkitAudioContext)();
            master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
        } catch (e) { ac = null; }
    }
    function tone(freq, dur, type, vol, slide) {
        if (!ac || muted) return;
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
    }
    function noise(dur, vol, cutoff) {
        if (!ac || muted) return;
        const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        src.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.value = vol;
        src.connect(f); f.connect(g); g.connect(master); src.start();
    }
    return {
        init,
        toggle() { muted = !muted; return muted; },
        isMuted: () => muted,
        drop: () => tone(260, 0.09, 'triangle', 0.18, -120),
        merge: t => { tone(420 + t * 70, 0.14, 'sine', 0.22, 420); tone(840 + t * 140, 0.1, 'sine', 0.08, 300); },
        launch: () => tone(900, 0.28, 'sawtooth', 0.05, -700),
        shot: () => noise(0.05, 0.08, 3000),
        coin: () => tone(1500, 0.06, 'sine', 0.08, 500),
        buy: () => [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.15, 0), i * 70)),
        boom: t => { noise(0.35 + t * 0.09, 0.45 + t * 0.05, 1400 - t * 90); tone(90 - t * 4, 0.3 + t * 0.06, 'sine', 0.5, -50); },
        hurt: () => { tone(140, 0.25, 'square', 0.12, -80); noise(0.2, 0.2, 600); },
        win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.18, 0), i * 110)),
        lose: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.1, 0), i * 180))
    };
})();

// ---------- HELPERS ----------
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => clamp(Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt)), 0, 255);
    return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
BOMBS.forEach(b => { b.light = shade(b.body, 0.45); b.dark = shade(b.body, -0.45); b.outline = shade(b.body, -0.65); });

function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function ellipse(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function text(str, x, y, size, color, align = 'center', stroke = '#1a1026', strokeW = size * 0.18) {
    ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = strokeW; ctx.strokeStyle = stroke; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
}

// ---------- STATE ----------
let state = 'title';      // title | merge | bomb | cleared | shop | over | won
let time = 0, stateT = 0;
let level = 1, score = 0, baseHP = 10, baseMax = 10, baseFlash = 0;
let currentTier = 0, nextTier = 0;
let coinsThisLevel = 0, flyingCoins = [], tracers = [], soldiers = [], bullets = [];
let pointer = { x: W / 2, y: 0 };
let overflowT = 0;
let shake = 0;
let banner = null;
let spawnQueue = [], spawnT = 0, spawnEvery = 2;
let zombies = [], projectiles = [], explosions = [], particles = [], floats = [], craters = [];
let kills = 0, bestMerge = 0;
const plane = { x: 60, y: 118, vx: 95 };

// Scenery, generated once
const clouds = Array.from({ length: 6 }, (_, i) => ({ x: rand(0, W), y: rand(70, 200), s: rand(0.6, 1.4), v: rand(4, 12) }));
const skyline = [];
for (let x = -10; x < W + 20;) { const w = rand(18, 42); skyline.push({ x, w, h: rand(25, 85), broken: Math.random() < 0.4 }); x += w + rand(-4, 6); }
const stars = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(BATTLE_TOP, 200), r: rand(0.5, 1.5), p: rand(0, 6) }));

// ---------- BOMB BAY PHYSICS ----------
const engine = Engine.create({ positionIterations: 12, velocityIterations: 8 });
const wallOpts = { isStatic: true };
const bayFloor = Bodies.rectangle(BAY.w / 2, BAY.h + 25, BAY.w * 2, 50, wallOpts);
Composite.add(engine.world, [
    bayFloor,
    Bodies.rectangle(-25, BAY.h / 2 - BAY.h, 50, BAY.h * 4, wallOpts),
    Bodies.rectangle(BAY.w + 25, BAY.h / 2 - BAY.h, 50, BAY.h * 4, wallOpts)
]);

const bayBombs = () => Composite.allBodies(engine.world).filter(b => b.tier !== undefined);

function spawnBayBomb(x, y, tier, merged) {
    const r = BOMB_R[tier];
    const startR = merged ? Math.max(r * 0.35, 8) : r;
    const opts = { restitution: 0.12, friction: 0.4, density: 0.001 * (tier + 1) };
    const outline = typeof SHAPES !== 'undefined' && SHAPES[BOMB_SPRITES[tier]];
    let body, centre = null;
    if (outline) {
        // hitbox = the sprite's outline; Matter centres the body on the outline's centroid
        const pts = outline.map(([px, py]) => ({ x: px, y: py }));
        centre = Matter.Vertices.centre(pts);
        const s = spriteScale(startR);
        body = Bodies.fromVertices(x, y, [pts.map(p => ({ x: p.x * s, y: p.y * s }))], opts);
    } else {
        body = Bodies.circle(x, y, startR, opts);
    }
    body.centre = centre;
    body.tier = tier;
    body.currentRadius = startR;
    body.targetRadius = r;
    body.isGrowing = merged;
    body.isDropping = !merged;
    if (merged) Body.setVelocity(body, { x: 0, y: 2 });
    Body.setInertia(body, Infinity);  // bombs stay upright (fuse up) instead of tumbling
    Composite.add(engine.world, body);
    return body;
}

Events.on(engine, 'beforeUpdate', () => {
    for (const b of bayBombs()) {
        if (b.isGrowing) {
            const next = Math.min(b.targetRadius, b.currentRadius + b.targetRadius / 18);
            Body.scale(b, next / b.currentRadius, next / b.currentRadius);
            Body.setInertia(b, Infinity);  // scaling resets inertia; keep it upright
            b.currentRadius = next;
            if (next >= b.targetRadius) b.isGrowing = false;
        }
        if (b.isDropping) {
            b.dropAge = (b.dropAge || 0) + 1;
            if (b.dropAge > 60 && b.speed < 0.3) b.isDropping = false;
        }
    }
});

// Bombs only merge after landing (on the floor or on a landed bomb), like Happy Fruit Merge
const isLanded = b => b === bayFloor || (b.tier !== undefined && !b.isDropping);
function handleBayCollisions(e) {
    for (const pair of e.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        if (a.isDropping && isLanded(b)) a.isDropping = false;
        if (b.isDropping && isLanded(a)) b.isDropping = false;
        if (a.isDropping || b.isDropping) continue;
        if (a.tier === undefined || a.tier !== b.tier || a.tier >= BOMBS.length - 1) continue;
        if (a.isMerging || b.isMerging || a.launched || b.launched) continue;
        a.isMerging = b.isMerging = true;
        const t = a.tier + 1;
        const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
        Composite.remove(engine.world, [a, b]);
        spawnBayBomb(x, y, t, true);
        score += t * t * 2;
        if (t > bestMerge) {
            bestMerge = t;
            if (t >= 4) floatText(BAY.x + x, BAY.y + y - 20, `NEW: ${BOMBS[t].name.toUpperCase()}!`, '#ffd32a', 20);
        }
        Sound.merge(t);
        burst(BAY.x + x, BAY.y + y, 10 + t * 3, 'sparkle', BOMBS[t].light);
    }
}
Events.on(engine, 'collisionStart', handleBayCollisions);
Events.on(engine, 'collisionActive', handleBayCollisions);

// ---------- GAME FLOW ----------
function setupBase() {
    const st = stats();
    baseMax = st.baseHp; baseHP = baseMax;
    soldiers = Array.from({ length: st.soldiers }, (_, i) => ({ ...SOLDIER_SPOTS[i % SOLDIER_SPOTS.length], cd: rand(0, 1), recoil: 0, look: st.soldierLook }));
}

function startLevel(n) {
    for (const b of bayBombs()) Composite.remove(engine.world, b);
    level = n; score = 0; kills = 0; bestMerge = 0; coinsThisLevel = 0;
    setupBase();
    zombies = []; projectiles = []; explosions = []; particles = []; floats = []; craters = []; flyingCoins = []; tracers = []; bullets = [];
    currentTier = randomDropTier(); nextTier = randomDropTier();

    // the horde for this level
    const kinds = Object.values(ZOMBIES).filter(t => !t.boss && t.unlock <= level);
    const weightOf = t => (t.kind === 'walker' ? Math.max(0.6, 3 - level / 40) : t.weight);
    const total = kinds.reduce((s, t) => s + weightOf(t), 0);
    const list = [];
    for (let i = 0; i < levelZombieCount(level); i++) {
        let r = Math.random() * total;
        const t = kinds.find(k => (r -= weightOf(k)) < 0) || kinds[0];
        list.push(t.kind);
    }
    const isBossLevel = level % 5 === 0;
    if (isBossLevel) for (let i = 0; i < 1 + Math.floor(level / 60); i++) list.push('boss');
    spawnQueue = list;
    spawnEvery = levelSpawnEvery(level);
    spawnT = -3;  // first zombie after 3 seconds

    const discovered = Object.values(ZOMBIES).find(t => t.unlock === level && level > 1);
    startMerge(`LEVEL ${level}`, discovered ? `NEW ZOMBIE: ${discovered.name.toUpperCase()}!` : isBossLevel ? 'THE ZOMBIE KING IS COMING!' : 'MERGE BIGGER BOMBS!');
}

// The player picks the mode with the MERGE | BOMB buttons; these also switch it automatically
// when the bay is full (→ BOMB) or empty (→ MERGE).
function startMerge(title, sub) {
    state = 'merge'; stateT = 0; overflowT = 0;
    if (title) showBanner(title, sub, '#ffd32a');
}

function startBomb(note) {
    if (bayBombs().length === 0) { floatText(W / 2, BAY.y + 40, 'NO BOMBS YET · MERGE FIRST', '#ffd32a', 20); return; }
    state = 'bomb'; stateT = 0;
    if (note) floatText(W / 2, BAY.y + 40, note, '#ff9f43', 22);
}

function levelCleared() {
    state = 'cleared'; stateT = 0;
    const bonus = 100 * level;
    score += bonus;
    const coinBonus = 20 + level * 5;
    save.coins += coinBonus;
    save.bestScore = Math.max(save.bestScore, score);
    if (level >= MAX_LEVEL) save.won = true;
    save.level = Math.min(MAX_LEVEL, level + 1);
    writeSave();
    showBanner(`LEVEL ${level} CLEARED!`, `💰 +${coinsThisLevel + coinBonus} COINS`, '#7bed9f');
    Sound.win();
}

function openShop() {
    state = level >= MAX_LEVEL && save.won ? 'won' : 'shop';
    stateT = 0;
}

function buyUpgrade(card) {
    const key = card.key, lv = save.up[key];
    if (lv >= UPGRADES[key].max) return;
    const price = upgradePrice(key, lv);
    if (save.coins < price) { floatText(card.x + card.w / 2, card.y + card.h - 60, 'NOT ENOUGH COINS', '#ff6b81', 16); return; }
    save.coins -= price;
    save.up[key]++;
    writeSave();
    setupBase();  // new soldiers / base HP show right away
    Sound.buy();
    burst(card.x + card.w / 2, card.y + 60, 24, 'sparkle', '#ffd32a');
    floatText(card.x + card.w / 2, card.y + 40, 'LEVEL UP!', '#7bed9f', 24);
}

function gameOver() {
    state = 'over'; stateT = 0;
    Sound.lose();
    save.bestScore = Math.max(save.bestScore, score);
    writeSave();  // coins picked up this level are kept
}

function showBanner(title, sub, color) { banner = { title, sub, color, t: 0, dur: 2.2 }; }

function randomDropTier() { return Math.min(BOMBS.length - 1, stats().dropMin + Math.floor(Math.random() * 3)); }

// ---------- ACTIONS ----------
function dropIntoBay(px) {
    const r = BOMB_R[currentTier];
    const x = clamp(px - BAY.x, r + 2, BAY.w - r - 2);
    spawnBayBomb(x, r + 6, currentTier, false);
    currentTier = nextTier; nextTier = randomDropTier();
    Sound.drop();
}

function launchFromBay(px, py) {
    const lx = px - BAY.x, ly = py - BAY.y;
    const bombs = bayBombs().filter(b => !b.launched);
    let hit = Query.point(bombs, { x: lx, y: ly })[0];
    if (!hit) {  // forgiving taps on phones
        let bestD = 22;
        for (const b of bombs) {
            const d = Math.hypot(b.position.x - lx, b.position.y - ly) - b.currentRadius;
            if (d < bestD) { bestD = d; hit = b; }
        }
    }
    if (!hit) return;
    hit.launched = true;
    Composite.remove(engine.world, hit);
    const from = { x: BAY.x + hit.position.x, y: BAY.y + hit.position.y };
    projectiles.push({ x: plane.x, y: plane.y + 14, vx: plane.vx * 0.85, vy: 30, tier: hit.tier, rot: 0 });
    burst(from.x, from.y, 8, 'sparkle', BOMBS[hit.tier].light);
    Sound.launch();
}

function explode(x, tier) {
    const r = blastRadius(tier), dmg = blastDamage(tier);
    explosions.push({ x, y: IMPACT_Y, r, tier, t: 0 });
    craters.push({ x, y: IMPACT_Y + rand(-4, 4), r: Math.min(70, 10 + tier * 5), a: 1 });
    if (craters.length > 25) craters.shift();
    shake = Math.max(shake, 5 + tier * 2.2);
    Sound.boom(tier);

    // fire, smoke, dirt, sparks
    burst(x, IMPACT_Y - 6, 18 + tier * 9, 'fire');
    burst(x, IMPACT_Y - 10, 8 + tier * 5, 'smoke');
    burst(x, IMPACT_Y, 10 + tier * 4, 'debris');
    burst(x, IMPACT_Y - 6, 8 + tier * 3, 'spark');
    if (tier >= 10) burst(x, IMPACT_Y - 30, 40, 'mushroom');

    let killed = 0;
    for (const z of zombies) {
        if (z.dead) continue;
        const reach = r + 8 * z.type.size;
        const dx = Math.abs(z.x - x);
        if (dx > reach) continue;
        z.hp -= dmg;
        z.flash = 0.15;
        z.x += Math.sign(z.x - x || 1) * (4 + tier * 1.5) * (1 - dx / reach);
        if (z.hp <= 0) { killZombie(z); killed++; }
    }
    if (killed >= 2) {
        const words = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'MEGA!'];
        const bonus = killed * killed * 5;
        score += bonus;
        floatText(x, IMPACT_Y - 70 - tier * 4, `${words[Math.min(killed, 5)] || 'MEGA!'} x${killed}  +${bonus}`, '#ff6b81', 22 + Math.min(killed, 6) * 2);
    }
}

function killZombie(z) {
    z.dead = true; z.deadT = 0;
    kills++;
    score += z.type.pts;
    floatText(z.x, z.y - 40 * z.type.size, `+${z.type.pts}`, '#ffffff', 16 + z.type.size * 4);
    burst(z.x, z.y - 18 * z.type.size, 8 + Math.round(z.type.size * 6), 'gib', z.type.skin);
    // every zombie drops coins that fly up to the coin counter
    const amount = coinsFor(z.type);
    coinsThisLevel += amount;
    flyingCoins.push({ x: z.x, y: z.y - 30 * z.type.size, sx: z.x, sy: z.y - 30 * z.type.size, amount, t: 0 });
}

function soldierShoot(s, target) {
    s.recoil = 1;
    s.aim = Math.atan2(target.y - 22 * target.type.size - s.y, target.x - s.x);
    const st = stats();
    bullets.push({ x: s.x + 15, y: s.y - 29, target, dmg: 0.5 * st.soldierDmg * levelHpMul(level), tier: st.bulletTier, dy: rand(-6, 6) });
    Sound.shot();
}

function updateBullets(dt) {
    for (const b of bullets) {
        const z = b.target;
        const tx = z.x, ty = z.y - 22 * z.type.size + b.dy;
        const d = Math.hypot(tx - b.x, ty - b.y), step = 650 * dt;
        b.angle = Math.atan2(ty - b.y, tx - b.x);
        if (z.dead || d <= step) {
            b.done = true;
            if (!z.dead) {
                z.hp -= b.dmg; z.flash = 0.08;
                burst(tx, ty, 3, 'spark');
                if (z.hp <= 0) killZombie(z);
            }
        } else { b.x += (tx - b.x) / d * step; b.y += (ty - b.y) / d * step; }
    }
    bullets = bullets.filter(b => !b.done);
}

function drawBullet(b) {
    const img = bulletImgs[b.tier], len = 16 + b.tier * 4;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
    if (imgReady(img)) ctx.drawImage(img, -len, -len * img.naturalHeight / img.naturalWidth / 2, len, len * img.naturalHeight / img.naturalWidth);
    else { ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke(); }
    ctx.restore();
}

function floatText(x, y, str, color, size) { floats.push({ x, y, str, color, size, t: 0 }); }

// ---------- PARTICLES ----------
function burst(x, y, n, kind, color) {
    for (let i = 0; i < n && particles.length < 900; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(0.3, 1);
        const p = { x, y, kind, t: 0, color };
        if (kind === 'fire') Object.assign(p, { vx: Math.cos(a) * sp * 160, vy: Math.sin(a) * sp * 110 - 40, life: rand(0.3, 0.7), size: rand(5, 14), g: -60, drag: 3 });
        else if (kind === 'smoke') Object.assign(p, { vx: Math.cos(a) * sp * 50, vy: -rand(20, 70), life: rand(0.8, 1.8), size: rand(8, 18), g: -10, drag: 1.5 });
        else if (kind === 'debris') Object.assign(p, { vx: Math.cos(a) * sp * 170, vy: -rand(120, 320), life: rand(0.6, 1.2), size: rand(2, 5), g: 800, drag: 0.5, color: Math.random() < 0.5 ? '#6d4c41' : '#3e2723' });
        else if (kind === 'spark') Object.assign(p, { vx: Math.cos(a) * sp * 380, vy: Math.sin(a) * sp * 260 - 120, life: rand(0.2, 0.5), size: rand(1, 2.5), g: 500, drag: 1 });
        else if (kind === 'gib') Object.assign(p, { vx: Math.cos(a) * sp * 140, vy: -rand(80, 260), life: rand(0.5, 1), size: rand(2, 5), g: 700, drag: 0.5 });
        else if (kind === 'sparkle') Object.assign(p, { vx: Math.cos(a) * sp * 150, vy: Math.sin(a) * sp * 150, life: rand(0.3, 0.6), size: rand(2, 4), g: 0, drag: 4 });
        else if (kind === 'mushroom') Object.assign(p, { kind: 'smoke', x: x + rand(-25, 25), vx: rand(-15, 15), vy: -rand(60, 160), life: rand(1.5, 2.5), size: rand(14, 26), g: 30, drag: 1.2, color: Math.random() < 0.5 ? '#ff9f43' : null });
        particles.push(p);
    }
}

// ---------- UPDATE ----------
let physicsAcc = 0;
function update(dt) {
    time += dt; stateT += dt;

    plane.x += plane.vx * dt;
    if (plane.x > W + 70) plane.x = -70;
    plane.y = 118 + Math.sin(time * 1.6) * 5;
    for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 80) c.x = -80; }

    const playing = state === 'merge' || state === 'bomb' || state === 'cleared';
    physicsAcc = Math.min(physicsAcc + dt, 0.1);
    while (physicsAcc >= 1 / 60) {
        if (playing || state === 'over') Engine.update(engine, 1000 / 60);
        physicsAcc -= 1 / 60;
    }

    if (playing) {
        // spawn the horde, in bigger groups at higher levels
        if (spawnQueue.length) {
            spawnT += dt;
            if (spawnT >= spawnEvery) {
                spawnT = 0;
                for (let g = 0; g < levelGroupSize(level) && spawnQueue.length; g++) {
                    const kind = spawnQueue.shift();
                    const type = ZOMBIES[kind];
                    const hp = type.hp * levelHpMul(level);
                    zombies.push({ kind, type, x: W + 30 + g * 18, y: rand(LANE_TOP, LANE_BOTTOM), hp, maxHp: hp, walk: rand(0, 6), flash: 0, speedMul: rand(0.85, 1.15) * levelSpeedMul(level) });
                }
            }
        }
        // soldiers shoot the closest zombie in range
        const rate = stats().fireRate;
        for (const s of soldiers) {
            s.recoil = Math.max(0, s.recoil - dt * 8);
            s.cd -= dt;
            if (s.cd > 0 || state === 'cleared') continue;
            let target = null;
            for (const z of zombies) if (!z.dead && z.x < s.x + SOLDIER_RANGE && z.x < W - 10 && (!target || z.x < target.x)) target = z;
            if (target) { soldierShoot(s, target); s.cd = 1.3 / rate * rand(0.85, 1.15); }
        }
        for (const z of zombies) {
            if (z.dead) { z.deadT += dt; continue; }
            z.flash = Math.max(0, z.flash - dt);
            z.walk += dt * (6 + z.type.speed * 0.15);
            z.x -= z.type.speed * z.speedMul * dt;
            if (z.x <= BASE_X + 6 * z.type.size && state !== 'cleared') {
                z.dead = true; z.deadT = 0.35;
                baseHP -= z.type.dmg; baseFlash = 0.4;
                shake = Math.max(shake, 8 + z.type.dmg);
                burst(z.x, z.y - 15, 14, 'gib', z.type.skin);
                Sound.hurt();
                floatText(BASE_X + 10, GROUND_Y - 50, `-${z.type.dmg}`, '#ff4757', 26);
                if (baseHP <= 0) { baseHP = 0; gameOver(); }
            }
        }
        zombies = zombies.filter(z => !z.dead || z.deadT < 0.7);
    }

    // bombs falling from the plane
    for (const p of projectiles) {
        p.vy += 1100 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot = Math.sin(time * 9) * 0.12;  // falls upright with a little wobble
        if (Math.random() < 0.6) particles.push({ x: p.x, y: p.y, kind: 'smoke', t: 0, vx: 0, vy: -10, life: 0.35, size: 3 + p.tier * 0.5, g: 0, drag: 1 });
        if (p.y >= IMPACT_Y) { p.done = true; explode(p.x, p.tier); }
    }
    projectiles = projectiles.filter(p => !p.done);

    if (state === 'merge') {
        // bay overflow: a landed bomb completely above the line for a moment switches to BOMB
        const over = bayBombs().some(b => !b.isDropping && !b.isGrowing && b.bounds.max.y < BAY_LINE && b.speed < 1.5);
        overflowT = over ? overflowT + dt : 0;
        if (overflowT > 1.2) startBomb('BAY FULL! BOMB TIME');
    } else if (state === 'bomb') {
        if (bayBombs().length === 0 && projectiles.length === 0 && !waveDone()) { startMerge(); floatText(W / 2, BAY.y + 40, 'OUT OF BOMBS · MERGE MORE', '#ffd32a', 20); }
    }
    if ((state === 'merge' || state === 'bomb') && waveDone() && projectiles.length === 0) levelCleared();
    if (state === 'cleared' && stateT > 2.6 && flyingCoins.length === 0) openShop();

    // coins fly up to the coin counter
    let landed = false;
    for (const c of flyingCoins) {
        c.t += dt;
        const k = Math.min(1, c.t / 0.8), e = k * k;
        c.x = c.sx + (COIN_HUD.x - 14 - c.sx) * e;
        c.y = c.sy + (COIN_HUD.y - c.sy) * e - Math.sin(k * Math.PI) * 50;
        if (k >= 1 && !c.done) { c.done = true; save.coins += c.amount; landed = true; Sound.coin(); }
    }
    if (landed) writeSave();
    flyingCoins = flyingCoins.filter(c => !c.done);
    for (const tr of tracers) tr.t += dt;
    tracers = tracers.filter(tr => tr.t < 0.08);
    updateBullets(dt);

    for (const p of particles) {
        p.t += dt;
        p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt; p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if ((p.kind === 'debris' || p.kind === 'gib') && p.y > LANE_BOTTOM && p.y < BAY.y - 20) { p.y = LANE_BOTTOM; p.vy *= -0.3; p.vx *= 0.6; }
    }
    particles = particles.filter(p => p.t < p.life);
    for (const e of explosions) e.t += dt;
    explosions = explosions.filter(e => e.t < 0.6);
    for (const f of floats) f.t += dt;
    floats = floats.filter(f => f.t < 1.2);
    for (const c of craters) c.a = Math.max(0.35, c.a - dt * 0.05);
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
    shake = Math.max(0, shake - dt * 30);
    baseFlash = Math.max(0, baseFlash - dt);
}

const waveDone = () => spawnQueue.length === 0 && zombies.every(z => z.dead);

// ---------- DRAW: BATTLEFIELD ----------
function drawBattlefield() {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, BATTLE_TOP, W, BATTLE_BOTTOM - BATTLE_TOP); ctx.clip();

    const bg = BACKGROUNDS[bgIndex], bgImg = bgImgs[bgIndex];
    if (imgReady(bgImg)) drawBackgroundImage(bg, bgImg);
    else drawDrawnBackground();
    for (const c of craters) { ctx.fillStyle = `rgba(30, 20, 15, ${c.a * 0.6})`; ellipse(c.x, c.y, c.r, c.r * 0.28); ctx.fill(); }

    drawBase();

    // reticle: where a bomb dropped right now would land
    if (state === 'bomb') {
        const tFall = (-30 + Math.sqrt(30 * 30 + 2 * 1100 * (IMPACT_Y - plane.y - 14))) / 1100;
        const lx = plane.x + plane.vx * 0.85 * tFall;
        const pulse = 0.6 + 0.4 * Math.sin(time * 8);
        ctx.strokeStyle = `rgba(255, 80, 60, ${pulse})`; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ellipse(lx, IMPACT_Y, 16, 5); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(lx - 8, IMPACT_Y); ctx.lineTo(lx + 8, IMPACT_Y); ctx.moveTo(lx, IMPACT_Y - 4); ctx.lineTo(lx, IMPACT_Y + 4); ctx.stroke();
    }

    // plane shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ellipse(plane.x, GROUND_Y + 8, 26, 4); ctx.fill();

    [...zombies].sort((a, b) => a.y - b.y).forEach(drawZombie);
    for (const p of projectiles) drawBomb(p.x, p.y, 10 + p.tier * 1.6, p.tier, p.rot);
    for (const e of explosions) drawExplosion(e);
    drawPlane();
    ctx.restore();
}

// Background art, scaled to the canvas width and lined up so its grass starts at GROUND_Y
function drawBackgroundImage(bg, img) {
    const s = W / img.naturalWidth;
    ctx.drawImage(img, 0, GROUND_Y - bg.groundRow * s, W, img.naturalHeight * s);
    if (bg.fadeGround) {  // this art's grass strip is thin and turns black below; blend in more grass
        const g = ctx.createLinearGradient(0, GROUND_Y + 18, 0, BATTLE_BOTTOM);
        g.addColorStop(0, 'rgba(34, 92, 18, 0)'); g.addColorStop(0.4, '#225c12'); g.addColorStop(1, '#173f0c');
        ctx.fillStyle = g; ctx.fillRect(0, GROUND_Y + 18, W, BATTLE_BOTTOM - GROUND_Y - 18);
    }
}

// The original background, drawn in code
function drawDrawnBackground() {
    const sky = ctx.createLinearGradient(0, BATTLE_TOP, 0, GROUND_Y);
    sky.addColorStop(0, '#2c1b4d'); sky.addColorStop(0.55, '#b33771'); sky.addColorStop(1, '#ff9f43');
    ctx.fillStyle = sky; ctx.fillRect(0, BATTLE_TOP, W, GROUND_Y - BATTLE_TOP);
    for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(time * 2 + s.p)})`; circle(s.x, s.y, s.r); ctx.fill(); }
    // blood moon
    const mg = ctx.createRadialGradient(340, 120, 5, 340, 120, 70);
    mg.addColorStop(0, 'rgba(255,220,180,0.9)'); mg.addColorStop(0.35, 'rgba(255,120,80,0.5)'); mg.addColorStop(1, 'rgba(255,120,80,0)');
    ctx.fillStyle = mg; circle(340, 120, 70); ctx.fill();
    ctx.fillStyle = '#ffd8b0'; circle(340, 120, 24); ctx.fill();
    // clouds
    for (const c of clouds) {
        ctx.fillStyle = 'rgba(255, 190, 210, 0.22)';
        ellipse(c.x, c.y, 34 * c.s, 10 * c.s); ctx.fill();
        ellipse(c.x + 18 * c.s, c.y - 6 * c.s, 22 * c.s, 9 * c.s); ctx.fill();
    }
    // ruined city
    ctx.fillStyle = '#3d1f45';
    for (const b of skyline) {
        ctx.beginPath();
        ctx.moveTo(b.x, GROUND_Y);
        ctx.lineTo(b.x, GROUND_Y - b.h);
        if (b.broken) { ctx.lineTo(b.x + b.w * 0.4, GROUND_Y - b.h + 10); ctx.lineTo(b.x + b.w * 0.7, GROUND_Y - b.h - 6); }
        ctx.lineTo(b.x + b.w, GROUND_Y - b.h + (b.broken ? 14 : 0));
        ctx.lineTo(b.x + b.w, GROUND_Y);
        ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 200, 80, 0.5)';
    for (const b of skyline) for (let wy = GROUND_Y - b.h + 12; wy < GROUND_Y - 8; wy += 14) if ((b.x * 7 + wy) % 5 < 1.2) ctx.fillRect(b.x + 5, wy, 4, 5);

    // ground
    const gg = ctx.createLinearGradient(0, GROUND_Y, 0, BATTLE_BOTTOM);
    gg.addColorStop(0, '#5b8c3a'); gg.addColorStop(0.15, '#4a6b2f'); gg.addColorStop(1, '#2d3b1f');
    ctx.fillStyle = gg; ctx.fillRect(0, GROUND_Y, W, BATTLE_BOTTOM - GROUND_Y);
    ctx.fillStyle = '#7bb24a'; ctx.fillRect(0, GROUND_Y, W, 3);
}

function drawBase() {
    ctx.save();
    if (baseFlash > 0) ctx.translate(rand(-2, 2), 0);
    const img = baseImgs[stats().baseStage];
    if (imgReady(img)) {
        const w = img.naturalWidth * BASE_ART_SCALE, h = img.naturalHeight * BASE_ART_SCALE;
        if (baseFlash > 0) ctx.filter = 'brightness(1.8) saturate(0.6)';
        ctx.drawImage(img, -4, LANE_BOTTOM + 4 - h, w, h);
        ctx.filter = 'none';
        for (const s of soldiers) drawSoldier(s);
        ctx.restore();
        return;
    }
    // watchtower (drawn if the base art can't load)
    ctx.fillStyle = '#5d4037'; ctx.fillRect(12, GROUND_Y - 62, 6, 64); ctx.fillRect(34, GROUND_Y - 62, 6, 64);
    ctx.fillStyle = '#795548'; rrect(6, GROUND_Y - 74, 40, 16, 3); ctx.fill();
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(15, GROUND_Y - 58); ctx.lineTo(37, GROUND_Y - 20); ctx.moveTo(37, GROUND_Y - 58); ctx.lineTo(15, GROUND_Y - 20); ctx.stroke();
    // flag
    ctx.fillStyle = '#ddd'; ctx.fillRect(25, GROUND_Y - 100, 2, 28);
    ctx.fillStyle = baseFlash > 0 ? '#ff4757' : '#2ed573';
    ctx.beginPath(); ctx.moveTo(27, GROUND_Y - 100); ctx.lineTo(27 + 18 + Math.sin(time * 6) * 2, GROUND_Y - 94); ctx.lineTo(27, GROUND_Y - 88); ctx.fill();
    // sandbags
    for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 4 - row; i++) {
            ctx.fillStyle = (i + row) % 2 ? '#c8a96e' : '#b8955a';
            ellipse(10 + i * 13 + row * 6, LANE_BOTTOM - 4 - row * 9, 8, 5); ctx.fill();
            ctx.strokeStyle = '#7d6236'; ctx.lineWidth = 1; ctx.stroke();
        }
    }
    if (baseFlash > 0) { ctx.fillStyle = `rgba(255, 60, 60, ${baseFlash})`; ctx.fillRect(0, GROUND_Y - 110, BASE_X + 10, 160); }
    for (const s of soldiers) drawSoldier(s);
    ctx.restore();
}

function drawSoldier(s, scale = 1.25) {
    const look = SOLDIER_LOOKS[s.look || 0];
    ctx.save();
    ctx.translate(s.x - s.recoil * 2, s.y);
    ctx.scale(scale, scale);
    const img = soldierImgs[s.look || 0];
    if (imgReady(img)) {
        const h = 34, w = h * img.naturalWidth / img.naturalHeight;
        ctx.drawImage(img, -w / 2, -h, w, h);
        if (s.recoil > 0.6) { ctx.fillStyle = '#fff3a0'; circle(w * 0.36, -h * 0.68, 3 * s.recoil); ctx.fill(); }
        ctx.restore();
        return;
    }
    ctx.lineCap = 'round';
    // legs
    ctx.strokeStyle = shade(look.body, -0.45); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-3, 0); ctx.moveTo(0, -9); ctx.lineTo(3, 0); ctx.stroke();
    // body + head
    ctx.fillStyle = look.body; rrect(-4, -20, 8, 12, 2); ctx.fill();
    ctx.fillStyle = '#f5c6a5'; circle(0, -24, 4); ctx.fill();
    // helmet
    ctx.fillStyle = look.helmet; ctx.beginPath(); ctx.arc(0, -25, 5, Math.PI, 0); ctx.fill(); ctx.fillRect(-6, -25.5, 12, 1.8);
    // gun, aimed at the target
    ctx.save(); ctx.translate(2, -16); ctx.rotate(clamp(s.aim || 0, -0.6, 0.6));
    ctx.fillStyle = look.gunColor; ctx.fillRect(-2, -1.5, look.gun, 3);
    if (s.recoil > 0.6) { ctx.fillStyle = '#fff3a0'; circle(look.gun, 0, 3 * s.recoil); ctx.fill(); }
    ctx.restore();
    ctx.restore();
}

function drawPlane() {
    const { x, y } = plane;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 1.6 + 1) * 0.04);
    if (imgReady(planeImg)) {
        const w = 96, h = w * planeImg.naturalHeight / planeImg.naturalWidth;
        ctx.drawImage(planeImg, -w / 2, -h / 2, w, h);
        // spinning propeller blur over the art's propeller
        ctx.fillStyle = 'rgba(230, 230, 240, 0.35)';
        ellipse(w * 0.43, 0, 3, h * 0.45 * Math.abs(Math.sin(time * 40))); ctx.fill();
        ctx.restore();
        return;
    }
    // tail fin + stabilizer
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(-26, -3); ctx.lineTo(-40, -22); ctx.lineTo(-33, -22); ctx.lineTo(-18, -5); ctx.fill();
    ellipse(-30, 1, 10, 3.5); ctx.fill();
    // fuselage
    const fg = ctx.createLinearGradient(0, -12, 0, 12);
    fg.addColorStop(0, '#ff7675'); fg.addColorStop(0.5, '#e84118'); fg.addColorStop(1, '#a5281b');
    ctx.fillStyle = fg; ellipse(0, 0, 36, 12); ctx.fill();
    ctx.strokeStyle = '#6d1a10'; ctx.lineWidth = 2; ctx.stroke();
    // stripe + star
    ctx.fillStyle = '#ffd32a'; ctx.fillRect(-14, -2, 20, 4);
    // cockpit
    ctx.fillStyle = '#74b9ff'; ellipse(10, -8, 9, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ellipse(7, -10, 3, 1.6); ctx.fill();
    // wing
    ctx.fillStyle = '#ff6b6b'; ellipse(-2, 5, 20, 5); ctx.fill(); ctx.strokeStyle = '#6d1a10'; ctx.stroke();
    // bomb doors, open while bombing
    ctx.fillStyle = '#2f3542';
    const open = state === 'bomb' ? 4 : 0;
    ctx.fillRect(-8 - open, 9, 7, 3); ctx.fillRect(1 + open, 9, 7, 3);
    // nose + propeller
    ctx.fillStyle = '#dfe6e9'; circle(35, 0, 5); ctx.fill();
    ctx.fillStyle = 'rgba(40,40,40,0.8)';
    ellipse(39, 0, 2.5, 14 * Math.abs(Math.sin(time * 40))); ctx.fill();
    ctx.restore();
}

function drawZombie(z) {
    const t = z.type, s = t.size;
    ctx.save();
    ctx.translate(z.x, z.y);
    if (z.dead) {
        const k = Math.min(1, z.deadT / 0.7);
        ctx.globalAlpha = 1 - k;
        ctx.rotate(k * 1.4);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(0, 0, 10 * s, 3 * s); ctx.fill();
    const img = zombieImgs[z.kind];
    if (imgReady(img)) {
        // waddle: bob up and down and rock side to side while walking
        const h = 52 * s, w = h * img.naturalWidth / img.naturalHeight;
        if (!z.dead) { ctx.translate(0, -Math.abs(Math.sin(z.walk)) * 2.5 * s); ctx.rotate(Math.sin(z.walk) * 0.07); }
        if (z.flash > 0) ctx.filter = 'brightness(2.5)';
        ctx.drawImage(img, -w / 2, -h, w, h);
        ctx.filter = 'none';
    } else {
        ctx.scale(s, s);
        const step = Math.sin(z.walk);
        ctx.lineCap = 'round';
        // legs
        ctx.strokeStyle = t.pants; ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-4 + step * 4, 0); ctx.moveTo(0, -14); ctx.lineTo(4 - step * 4, 0); ctx.stroke();
        // back arm
        ctx.strokeStyle = shade(t.skin, -0.25); ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(1, -25); ctx.lineTo(-12, -21 - step * 1.5); ctx.stroke();
        // torso (torn shirt)
        ctx.fillStyle = t.shirt;
        if (t.look === 'fat') { ellipse(0, -21, 10, 10); ctx.fill(); } else { rrect(-6, -30, 12, 17, 3); ctx.fill(); }
        ctx.fillStyle = shade(t.shirt, -0.3);
        ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(-3, -18); ctx.lineTo(0, -14); ctx.lineTo(3, -17); ctx.lineTo(6, -14); ctx.lineTo(6, -13); ctx.lineTo(-6, -13); ctx.fill();
        // front arm reaching toward the base
        ctx.strokeStyle = t.skin; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(-1, -26); ctx.lineTo(-14, -24 + step * 1.5); ctx.stroke();
        // head
        ctx.fillStyle = t.skin; circle(-1, -36, 7.5); ctx.fill();
        ctx.strokeStyle = shade(t.skin, -0.4); ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#1e272e'; circle(-4.5, -37, 2.1); ctx.fill(); circle(0, -37.5, 2.1); ctx.fill();
        ctx.fillStyle = '#ff3838'; circle(-4.5, -37, 1.1); ctx.fill(); circle(0, -37.5, 1.1); ctx.fill();
        ctx.strokeStyle = '#1e272e'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-6, -32); ctx.lineTo(-3, -33); ctx.lineTo(-1, -31.5); ctx.stroke();
        drawZombieLook(t.look);
        if (z.flash > 0) {
            ctx.globalAlpha *= z.flash / 0.15;
            ctx.fillStyle = '#fff'; circle(-1, -36, 7.5); ctx.fill(); rrect(-6, -30, 12, 17, 3); ctx.fill();
        }
    }
    ctx.restore();
    if (!z.dead && z.hp < z.maxHp) {
        const w = 22 * Math.max(1, s * 0.8), y = z.y - 52 * s;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(z.x - w / 2 - 1, y - 1, w + 2, 5);
        ctx.fillStyle = z.hp / z.maxHp > 0.4 ? '#7bed9f' : '#ff4757'; ctx.fillRect(z.x - w / 2, y, w * Math.max(0, z.hp / z.maxHp), 3);
    }
}

// Extra details that tell the drawn zombie types apart
function drawZombieLook(look) {
    switch (look) {
        case 'crown':
            ctx.fillStyle = '#f9ca24';
            ctx.beginPath(); ctx.moveTo(-7, -42); ctx.lineTo(-6, -48); ctx.lineTo(-3, -44); ctx.lineTo(-1, -50); ctx.lineTo(1, -44); ctx.lineTo(4, -48); ctx.lineTo(5, -42); ctx.fill(); break;
        case 'helmet':
            ctx.fillStyle = '#4b5d2a'; ctx.beginPath(); ctx.arc(-1, -38, 8.5, Math.PI, 0); ctx.fill(); ctx.fillRect(-10, -38.5, 18, 2.5); break;
        case 'mohawk':
            ctx.fillStyle = '#ff3f34';
            for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-5 + i * 3, -42); ctx.lineTo(-3.5 + i * 3, -49 + (i % 2) * 2); ctx.lineTo(-2 + i * 3, -42); ctx.fill(); } break;
        case 'hood':
            ctx.fillStyle = '#341f97'; ctx.beginPath(); ctx.arc(0, -36, 9.5, Math.PI * 1.05, Math.PI * 2.15); ctx.lineTo(8, -28); ctx.lineTo(6, -33); ctx.arc(-1, -36, 7, 0, Math.PI, true); ctx.fill();
            ctx.fillStyle = '#1e272e'; ellipse(-3, -32, 2.5, 3); ctx.fill(); break;  // screaming mouth
        case 'horns':
            ctx.fillStyle = '#dfe4ea';
            ctx.beginPath(); ctx.moveTo(-7, -40); ctx.quadraticCurveTo(-13, -46, -9, -52); ctx.lineTo(-4, -42); ctx.fill();
            ctx.beginPath(); ctx.moveTo(4, -41); ctx.quadraticCurveTo(10, -47, 7, -53); ctx.lineTo(1, -43); ctx.fill(); break;
        case 'glow': {
            const g = ctx.createRadialGradient(-2, -37, 1, -2, -37, 10);
            g.addColorStop(0, 'rgba(0, 255, 255, 0.7)'); g.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = g; circle(-2, -37, 10); ctx.fill();
            ctx.fillStyle = '#7efff5'; circle(-4.5, -37, 1.6); ctx.fill(); circle(0, -37.5, 1.6); ctx.fill(); break;
        }
        case 'armor':
            ctx.fillStyle = '#a4b0be'; rrect(-7, -30, 14, 9, 2); ctx.fill();
            ctx.fillStyle = '#747d8c'; ctx.beginPath(); ctx.arc(-1, -38, 8.5, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#ff3838'; ctx.fillRect(-7, -38, 8, 1.6); break;
    }
}

function drawCoin(x, y, r) {
    if (drawUi('icon_coin', x, y, r * 2, r * 2)) return;
    ctx.fillStyle = '#f9ca24'; circle(x, y, r); ctx.fill();
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = Math.max(1, r * 0.15); ctx.stroke();
}

function drawExplosion(e) {
    const k = e.t / 0.6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (e.t < 0.1) { ctx.fillStyle = `rgba(255, 255, 230, ${1 - e.t / 0.1})`; circle(e.x, e.y - 8, e.r * 0.7 * (0.5 + e.t * 5)); ctx.fill(); }
    const fr = e.r * 0.75 * Math.min(1, e.t / 0.12) * (1 - k * 0.3);
    const g = ctx.createRadialGradient(e.x, e.y - 10, 0, e.x, e.y - 10, Math.max(1, fr));
    g.addColorStop(0, `rgba(255, 250, 200, ${1 - k})`); g.addColorStop(0.4, `rgba(255, 160, 40, ${0.9 * (1 - k)})`); g.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = g; circle(e.x, e.y - 10, fr); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * (1 - k)})`; ctx.lineWidth = 3 * (1 - k) + 1;
    ellipse(e.x, e.y, e.r * 1.1 * Math.min(1, e.t / 0.35), e.r * 0.3 * Math.min(1, e.t / 0.35)); ctx.stroke();
}

// ---------- DRAW: BOMBS ----------
const spriteScale = r => (r * 2 * SPRITE_FIT) / SPRITE_SIZE;

// centre: for bay bombs, the hitbox centroid in sprite pixels (the body's position), so art and hitbox line up
function drawBomb(x, y, r, tier, angle, alpha = 1, centre = null) {
    const b = BOMBS[tier];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (imgReady(bombImgs[tier])) {
        const s = spriteScale(r), c = centre || { x: SPRITE_SIZE / 2, y: SPRITE_SIZE / 2 };
        ctx.drawImage(bombImgs[tier], -c.x * s, -c.y * s, SPRITE_SIZE * s, SPRITE_SIZE * s);
        ctx.restore();
        return;
    }
    if (b.icon === 'void') {  // swirling glow
        const glow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.5);
        glow.addColorStop(0, 'rgba(224, 86, 253, 0.6)'); glow.addColorStop(1, 'rgba(224, 86, 253, 0)');
        ctx.fillStyle = glow; circle(0, 0, r * 1.5); ctx.fill();
    } else {  // cap + fuse + spark
        ctx.fillStyle = '#4b4b5a'; rrect(-r * 0.24, -r * 1.12, r * 0.48, r * 0.32, r * 0.08); ctx.fill();
        ctx.strokeStyle = '#d9b26f'; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -r * 1.08); ctx.quadraticCurveTo(r * 0.3, -r * 1.5, r * 0.5, -r * 1.32); ctx.stroke();
        const sp = r * 0.16 * (0.75 + 0.25 * Math.sin(time * 30 + tier * 2));
        ctx.fillStyle = 'rgba(255, 140, 0, 0.55)'; circle(r * 0.5, -r * 1.32, sp * 2); ctx.fill();
        ctx.fillStyle = '#fff7b0'; circle(r * 0.5, -r * 1.32, sp); ctx.fill();
    }
    // body
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, b.light); g.addColorStop(0.55, b.body); g.addColorStop(1, b.dark);
    ctx.fillStyle = g; circle(0, 0, r); ctx.fill();
    // decoration, clipped to the body
    ctx.save(); circle(0, 0, r); ctx.clip();
    drawBombIcon(b, r);
    ctx.restore();
    ctx.strokeStyle = b.outline; ctx.lineWidth = Math.max(1.5, r * 0.08); circle(0, 0, r); ctx.stroke();
    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ellipse(-r * 0.38, -r * 0.45, r * 0.3, r * 0.16, -0.6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(-r * 0.1, -r * 0.62, r * 0.07); ctx.fill();
    ctx.restore();
}

function drawBombIcon(b, r) {
    const c = b.band;
    ctx.fillStyle = c; ctx.strokeStyle = c;
    switch (b.icon) {
        case 'band':
            ctx.fillRect(-r, -r * 0.14, r * 2, r * 0.28); break;
        case 'leaf':
            ellipse(r * 0.15, -r * 0.7, r * 0.35, r * 0.15, -0.5); ctx.fill(); break;
        case 'pin':
            ctx.lineWidth = r * 0.08; ctx.globalAlpha *= 0.6;
            for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.38, -r); ctx.lineTo(i * r * 0.38, r); ctx.moveTo(-r, i * r * 0.38); ctx.lineTo(r, i * r * 0.38); ctx.stroke(); }
            ctx.globalAlpha /= 0.6; break;
        case 'sticks':
            for (let i = -1; i <= 1; i++) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(i * r * 0.55 - r * 0.04, -r, r * 0.08, r * 2); }
            ctx.fillStyle = c; ctx.fillRect(-r, -r * 0.18, r * 2, r * 0.36); break;
        case 'tnt':
            ctx.fillRect(-r, -r * 0.3, r * 2, r * 0.6);
            text('TNT', 0, r * 0.03, r * 0.5, '#2d3436', 'center', null); break;
        case 'dots':
            [[0, 0], [-0.45, -0.3], [0.45, -0.3], [-0.4, 0.4], [0.4, 0.4]].forEach(([dx, dy]) => { circle(dx * r, dy * r, r * 0.15); ctx.fill(); }); break;
        case 'rivets':
            ctx.fillRect(-r, -r * 0.5, r * 2, r * 0.12); ctx.fillRect(-r, r * 0.38, r * 2, r * 0.12);
            for (let i = -3; i <= 3; i++) { circle(i * r * 0.28, 0, r * 0.05); ctx.fill(); } break;
        case 'flame':
            ctx.beginPath(); ctx.moveTo(0, -r * 0.55);
            ctx.bezierCurveTo(r * 0.45, -r * 0.1, r * 0.4, r * 0.45, 0, r * 0.5);
            ctx.bezierCurveTo(-r * 0.4, r * 0.45, -r * 0.45, -r * 0.1, 0, -r * 0.55); ctx.fill();
            ctx.fillStyle = '#ffd32a'; ellipse(0, r * 0.2, r * 0.15, r * 0.22); ctx.fill(); break;
        case 'hazard':
            for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.5, -r); ctx.lineTo(i * r * 0.5 + r * 0.25, -r); ctx.lineTo(i * r * 0.5 + r * 0.25 - r, r); ctx.lineTo(i * r * 0.5 - r, r); ctx.fill(); }
            ctx.fillStyle = b.body; circle(0, 0, r * 0.45); ctx.fill(); break;
        case 'skull':
            circle(0, -r * 0.08, r * 0.38); ctx.fill(); rrect(-r * 0.22, r * 0.15, r * 0.44, r * 0.26, r * 0.06); ctx.fill();
            ctx.fillStyle = b.body; circle(-r * 0.14, -r * 0.1, r * 0.1); ctx.fill(); circle(r * 0.14, -r * 0.1, r * 0.1); ctx.fill(); break;
        case 'rad':
            for (let i = 0; i < 3; i++) {
                const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.62, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = b.body; circle(0, 0, r * 0.2); ctx.fill(); ctx.fillStyle = c; circle(0, 0, r * 0.12); ctx.fill(); break;
        case 'void':
            ctx.lineWidth = r * 0.09;
            for (let i = 0; i < 3; i++) {
                ctx.globalAlpha = 0.8 - i * 0.2;
                ctx.beginPath(); ctx.arc(0, 0, r * (0.75 - i * 0.2), time * (2 + i) + i * 2, time * (2 + i) + i * 2 + Math.PI * 1.2); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.fillStyle = '#000'; circle(0, 0, r * 0.22); ctx.fill(); break;
    }
}

// ---------- DRAW: BOMB BAY / ARMORY ----------
function drawBoxBackground(top, bottom, label, line = true) {
    ctx.fillStyle = '#1b1530'; rrect(BAY.x - 8, BAY.y - 8, BAY.w + 16, BAY.h + 14, 12); ctx.fill();
    ctx.save();
    rrect(BAY.x, BAY.y, BAY.w, BAY.h, 8); ctx.clip();
    const bg = ctx.createLinearGradient(0, BAY.y, 0, BAY.y + BAY.h);
    bg.addColorStop(0, top); bg.addColorStop(1, bottom);
    ctx.fillStyle = bg; ctx.fillRect(BAY.x, BAY.y, BAY.w, BAY.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    for (let y = BAY.y + 100; y < BAY.y + BAY.h; y += 100) { ctx.beginPath(); ctx.moveTo(BAY.x, y); ctx.lineTo(BAY.x + BAY.w, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = BAY.y + 12; y < BAY.y + BAY.h; y += 50) { circle(BAY.x + 8, y, 2.5); ctx.fill(); circle(BAY.x + BAY.w - 8, y, 2.5); ctx.fill(); }
    text(label, BAY.x + BAY.w / 2, BAY.y + BAY.h - 30, 34, 'rgba(255,255,255,0.05)', 'center', null);
    if (!line) return;
    const ly = BAY.y + BAY_LINE;
    ctx.save(); ctx.beginPath(); ctx.rect(BAY.x, ly - 4, BAY.w, 8); ctx.clip();
    for (let x = BAY.x - 20; x < BAY.x + BAY.w + 20; x += 16) {
        ctx.fillStyle = 'rgba(251, 197, 49, 0.55)';
        ctx.beginPath(); ctx.moveTo(x, ly + 4); ctx.lineTo(x + 8, ly - 4); ctx.lineTo(x + 16, ly - 4); ctx.lineTo(x + 8, ly + 4); ctx.fill();
    }
    ctx.restore();
}

// Upgrade shop: 4 cards in the bay area, tap a card to buy its next level
const SHOP_CARDS = ['soldiers', 'weapons', 'base', 'bombs'].map((key, i) => ({
    key, x: BAY.x + 8 + (i % 2) * 213, y: BAY.y + 42 + Math.floor(i / 2) * 180, w: 197, h: 172
}));

function drawShop() {
    drawBoxBackground('#3b2f5c', '#211a38', '', false);
    text('UPGRADES', BAY.x + BAY.w / 2, BAY.y + 22, 24, '#ffd32a');
    const st = stats();
    for (const c of SHOP_CARDS) {
        const lv = save.up[c.key], up = UPGRADES[c.key], maxed = lv >= up.max;
        const price = maxed ? 0 : upgradePrice(c.key, lv), afford = !maxed && save.coins >= price;
        // card frame
        const panel = uiImgs.panel;
        if (imgReady(panel)) ctx.drawImage(panel, c.x, c.y, c.w, c.h);
        else { ctx.fillStyle = '#2b2346'; rrect(c.x, c.y, c.w, c.h, 14); ctx.fill(); }
        if (afford) { ctx.strokeStyle = `rgba(123, 237, 159, ${0.5 + 0.4 * Math.sin(time * 5)})`; ctx.lineWidth = 3; rrect(c.x + 2, c.y + 2, c.w - 4, c.h - 4, 14); ctx.stroke(); }
        // picture of what you're upgrading
        const px = c.x + c.w / 2, py = c.y + 50;
        const nextSt = maxed ? st : stats({ ...save.up, [c.key]: lv + 1 });   // cards show what you're buying
        if (c.key === 'soldiers') {
            ctx.save(); ctx.translate(px - 8, py + 28); ctx.scale(2.1, 2.1);
            drawSoldier({ x: 0, y: 0, recoil: 0, aim: 0, look: nextSt.soldierLook }, 1);
            ctx.restore();
            text(`x${nextSt.soldiers}`, px + 46, py + 16, 18, '#fff');
        } else if (c.key === 'weapons') {
            const img = bulletImgs[st.bulletTier];
            if (imgReady(img)) { const w = 84, h = w * img.naturalHeight / img.naturalWidth; ctx.drawImage(img, px - w / 2, py - h / 2, w, h); }
        } else if (c.key === 'base') {
            const img = baseImgs[nextSt.baseStage];
            if (imgReady(img)) {
                const k = Math.min(110 / img.naturalWidth, 66 / img.naturalHeight);
                ctx.drawImage(img, px - 10 - img.naturalWidth * k / 2, py + 28 - img.naturalHeight * k, img.naturalWidth * k, img.naturalHeight * k);
            }
            drawUi('icon_heart', px + 54, py - 14, 30, 30);
            text(`${nextSt.baseHp}`, px + 54, py - 13, 12, '#fff');
        } else {
            drawBomb(px, py + 2, 30, Math.min(BOMBS.length - 1, st.dropMin + 2), 0);
        }
        // name, level, what the next level gives
        text(up.name, px, c.y + 90, 18, '#fff');
        text(maxed ? 'MAX LEVEL' : `LV ${lv} → ${lv + 1}`, px, c.y + 108, 13, '#d6ccff');
        if (!maxed) text(upgradeEffect(c.key), px, c.y + 124, 12, '#7bed9f');
        // price button
        const bx = c.x + 30, by = c.y + 136, bw = c.w - 60, bh = 28;
        if (!maxed) {
            const img = uiImgs[afford ? 'btn_green_long' : 'btn_purple_long'];
            ctx.globalAlpha = afford ? 1 : 0.55;
            if (imgReady(img)) ctx.drawImage(img, bx, by, bw, bh);
            else { ctx.fillStyle = afford ? '#2ed573' : '#6c5ce7'; rrect(bx, by, bw, bh, 10); ctx.fill(); }
            drawCoin(bx + 26, by + bh / 2, 9);
            text(`${price}`, bx + 40, by + bh / 2 + 1, 16, '#fff', 'left');
            ctx.globalAlpha = 1;
        }
    }
    ctx.restore();
}

function drawBay() {
    if (state === 'shop' || state === 'won') { drawShop(); return; }
    drawBoxBackground('#3a3f58', '#232638', 'BOMB BAY');
    if (overflowT > 0 && state === 'merge') { ctx.fillStyle = `rgba(255, 60, 60, ${0.25 + 0.2 * Math.sin(time * 20)})`; ctx.fillRect(BAY.x, BAY.y, BAY.w, BAY_LINE); }

    for (const b of bayBombs()) drawBomb(BAY.x + b.position.x, BAY.y + b.position.y, b.currentRadius, b.tier, b.angle, 1, b.centre);

    // the bomb you're about to drop hangs at the top during MERGE
    if (state === 'merge') {
        const r = BOMB_R[currentTier];
        const x = BAY.x + clamp(pointer.x - BAY.x, r + 2, BAY.w - r - 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, BAY.y + r * 2 + 8); ctx.lineTo(x, BAY.y + BAY.h); ctx.stroke(); ctx.setLineDash([]);
        drawBomb(x, BAY.y + r + 6, r, currentTier, 0, 0.75);
    }
    if (state === 'bomb') {
        const a = 0.35 + 0.25 * Math.sin(time * 6);
        ctx.strokeStyle = `rgba(255, 107, 53, ${a})`; ctx.lineWidth = 6; rrect(BAY.x + 3, BAY.y + 3, BAY.w - 6, BAY.h - 6, 8); ctx.stroke();
        text('TAP A BOMB TO DROP IT', BAY.x + BAY.w / 2, BAY.y + 24, 18, `rgba(255, 220, 200, ${0.5 + a})`);
    }
    ctx.restore();
}

function drawPhaseBar() {
    const { y, h } = PHASE_BAR;
    ctx.fillStyle = '#1b1530'; ctx.fillRect(0, y - 4, W, h + 8);
    if (state === 'merge' || state === 'bomb') {
        // MERGE | BOMB switch
        const m = MODE_BTNS.merge, b = MODE_BTNS.bomb;
        const onMerge = state === 'merge';
        ctx.fillStyle = onMerge ? '#ffb400' : '#3d3360'; rrect(m.x, m.y, m.w, m.h, 10); ctx.fill();
        ctx.fillStyle = !onMerge ? '#ff5e3a' : '#3d3360'; rrect(b.x, b.y, b.w, b.h, 10); ctx.fill();
        ctx.globalAlpha = onMerge ? 1 : 0.6;
        text('🔧 MERGE', m.x + m.w / 2 - 14, m.y + m.h / 2 + 1, 18, '#fff');
        drawBomb(m.x + m.w - 22, m.y + m.h / 2 + 2, 10, nextTier, 0);
        ctx.globalAlpha = !onMerge ? 1 : 0.6;
        text(`💣 BOMB · ${bayBombs().length}`, b.x + b.w / 2, b.y + b.h / 2 + 1, 18, '#fff');
        ctx.globalAlpha = 1;
    } else if (state === 'cleared') {
        text('GET READY…', W / 2, y + h / 2 + 1, 19, '#7bed9f');
    } else if (state === 'shop' || state === 'won') {
        drawCoin(28, y + h / 2, 12);
        text(`${save.coins}`, 46, y + h / 2 + 1, 20, '#ffd32a', 'left');
        if (state === 'shop') {
            const pulse = 1 + Math.sin(time * 5) * 0.03, cx = NEXT_BTN.x + NEXT_BTN.w / 2, cy = NEXT_BTN.y + NEXT_BTN.h / 2;
            const img = uiImgs.btn_green_long;
            if (imgReady(img)) ctx.drawImage(img, cx - NEXT_BTN.w * pulse / 2, cy - NEXT_BTN.h * pulse / 2, NEXT_BTN.w * pulse, NEXT_BTN.h * pulse);
            else { ctx.fillStyle = Math.sin(time * 5) > 0 ? '#2ed573' : '#26b862'; rrect(NEXT_BTN.x, NEXT_BTN.y, NEXT_BTN.w, NEXT_BTN.h, 10); ctx.fill(); }
            text(`LEVEL ${save.level} ▶`, NEXT_BTN.x + NEXT_BTN.w / 2, NEXT_BTN.y + NEXT_BTN.h / 2 + 1, 18, '#fff');
        }
    }
}
const NEXT_BTN = { x: W - 150, y: PHASE_BAR.y - 2, w: 138, h: PHASE_BAR.h + 4 };
const MODE_BTNS = {
    merge: { x: 12, y: PHASE_BAR.y - 2, w: (W - 32) / 2, h: PHASE_BAR.h + 4 },
    bomb: { x: W / 2 + 4, y: PHASE_BAR.y - 2, w: (W - 32) / 2, h: PHASE_BAR.h + 4 }
};
const inBox = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

function drawHUD() {
    const g = ctx.createLinearGradient(0, 0, 0, HUD_H);
    g.addColorStop(0, '#24183f'); g.addColorStop(1, '#1b1530');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HUD_H);
    text(`LEVEL ${state === 'shop' || state === 'won' ? save.level : level}`, 14, 20, 20, '#ffd32a', 'left');
    text(`${score}`, 14, 42, 17, '#fff', 'left');
    // coins
    drawCoin(COIN_HUD.x - 14, COIN_HUD.y, 11);
    text(`${save.coins}`, COIN_HUD.x + 2, COIN_HUD.y + 1, 17, '#ffd32a', 'left');
    // base health
    const bw = 110, bx = W - bw - 98, by = 14;
    if (!drawUi('icon_heart', bx - 14, by + 8, 20, 20)) text('BASE', bx - 8, by + 8, 14, '#c8c3e6', 'right');
    ctx.fillStyle = '#3d3360'; rrect(bx, by, bw, 16, 8); ctx.fill();
    ctx.fillStyle = baseHP / baseMax > 0.35 ? '#2ed573' : '#ff4757';
    rrect(bx, by, Math.max(0, bw * baseHP / baseMax), 16, 8); ctx.fill();
    text(`${baseHP}/${baseMax}`, bx + bw / 2, by + 9, 12, '#fff');
    const zCount = zombies.filter(z => !z.dead).length + spawnQueue.length;
    if (drawUi('icon_zombie', bx + 6, by + 32, 15, 15)) text(`${zCount}`, bx + 17, by + 33, 14, '#badc58', 'left');
    else text(`🧟 ${zCount}`, bx, by + 32, 14, '#badc58', 'left');
    // background switch + mute
    if (!drawUi('btn_city', W - 70, 28, 36, 36)) {
        ctx.fillStyle = '#3d3360'; rrect(W - 88, 10, 36, 36, 10); ctx.fill();
        text('🌆', W - 70, 29, 18, '#fff', 'center', null);
    }
    if (!drawUi(Sound.isMuted() ? 'btn_sound_off' : 'btn_sound_on', W - 27, 28, 42, 36)) {
        ctx.fillStyle = '#3d3360'; rrect(W - 46, 10, 36, 36, 10); ctx.fill();
        text(Sound.isMuted() ? '🔇' : '🔊', W - 28, 29, 18, '#fff', 'center', null);
    }
}

function drawParticles() {
    for (const p of particles) {
        const k = p.t / p.life;
        if (p.kind === 'fire') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = k < 0.3 ? `rgba(255, 230, 120, ${1 - k})` : `rgba(255, ${Math.round(140 - k * 100)}, 30, ${1 - k})`;
            circle(p.x, p.y, p.size * (1 - k * 0.6)); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        } else if (p.kind === 'smoke') {
            ctx.fillStyle = p.color ? `rgba(255, 159, 67, ${0.5 * (1 - k)})` : `rgba(70, 60, 75, ${0.55 * (1 - k)})`;
            circle(p.x, p.y, p.size * (0.6 + k)); ctx.fill();
        } else if (p.kind === 'spark') {
            ctx.strokeStyle = `rgba(255, 240, 150, ${1 - k})`; ctx.lineWidth = p.size;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
        } else if (p.kind === 'sparkle') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = p.color || '#fff'; ctx.globalAlpha = 1 - k;
            const s = p.size * (1 - k * 0.5);
            ctx.beginPath(); ctx.moveTo(p.x, p.y - s * 2); ctx.lineTo(p.x + s * 0.5, p.y); ctx.lineTo(p.x, p.y + s * 2); ctx.lineTo(p.x - s * 0.5, p.y); ctx.fill();
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.fillStyle = p.color; ctx.globalAlpha = 1 - k * k;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.globalAlpha = 1;
        }
    }
}

function drawOverlays() {
    for (const tr of tracers) {
        ctx.strokeStyle = `rgba(255, 240, 160, ${1 - tr.t / 0.08})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
    }
    for (const b of bullets) drawBullet(b);
    for (const c of flyingCoins) drawCoin(c.x, c.y, 7 + Math.min(6, c.amount / 10));
    for (const f of floats) {
        const k = f.t / 1.2;
        ctx.globalAlpha = 1 - k * k;
        text(f.str, f.x, f.y - k * 40, f.size * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1), f.color);
        ctx.globalAlpha = 1;
    }
    if (banner) {
        const b = banner, k = b.t;
        const pop = k < 0.25 ? 0.4 + (k / 0.25) * 0.75 : k < 0.35 ? 1.15 - (k - 0.25) * 1.5 : 1;
        const fade = b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(W / 2, 200);
        ctx.scale(pop, pop);
        drawUi('ribbon', 0, 4, 420, 96);
        text(b.title, 0, 0, 40, b.color);
        if (b.sub) text(b.sub, 0, 40, 20, '#fff');
        ctx.restore();
    }
}

function drawTitle() {
    ctx.fillStyle = 'rgba(15, 10, 30, 0.72)'; ctx.fillRect(0, 0, W, H);
    const bob = Math.sin(time * 2) * 6;
    text('ZOMBIE', W / 2, 170 + bob, 64, '#7bed9f');
    text('BOMBER', W / 2, 232 + bob, 72, '#ff6b35');
    drawBomb(W / 2, 360, 46, 10, Math.sin(time) * 0.2);
    const lines = ['MERGE: drop bombs in the bay,', 'two of the same make a BIGGER bomb', 'BOMB: tap a bomb to drop it', 'from the plane onto the zombies', 'Switch MERGE / BOMB any time!', 'Spend coins on UPGRADES'];
    lines.forEach((l, i) => text(l, W / 2, 425 + i * 28, 18, i % 2 === 0 ? '#ffd32a' : '#fff'));
    text(save.level > 1 ? `TAP TO PLAY · LEVEL ${save.level}` : 'TAP TO START', W / 2, 612, 26, '#fff');
    drawUi('btn_play', W / 2, 664, 60 + Math.sin(time * 5) * 3, 60 + Math.sin(time * 5) * 3);
    text(save.won ? '🏆 ALL 300 LEVELS CLEARED!' : `${MAX_LEVEL} LEVELS · 💰 ${save.coins} COINS`, W / 2, 724, 18, '#c8c3e6');
    if (save.bestScore > 0) text(`BEST LEVEL SCORE: ${save.bestScore}`, W / 2, 752, 16, '#8c85b0');
}

function drawGameOver() {
    ctx.fillStyle = `rgba(15, 5, 20, ${Math.min(0.8, stateT)})`; ctx.fillRect(0, 0, W, H);
    if (stateT < 0.4) return;
    text('THE BASE FELL!', W / 2, 220, 48, '#ff4757');
    text(`LEVEL ${level}`, W / 2, 300, 40, '#ffd32a');
    text(`SCORE ${score}`, W / 2, 352, 32, '#fff');
    text(`🧟 ${kills} ZOMBIES BLOWN UP`, W / 2, 400, 20, '#badc58');
    if (bestMerge > 0) text(`BIGGEST BOMB: ${BOMBS[bestMerge].name.toUpperCase()}`, W / 2, 432, 18, '#ff9f43');
    text(`💰 ${coinsThisLevel} COINS KEPT · SPEND THEM ON UPGRADES`, W / 2, 480, 16, '#ffd32a');
    if (stateT > 1) text(`TAP TO RETRY LEVEL ${level}`, W / 2, 580, 28 + Math.sin(time * 5) * 2, '#fff');
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1b1530'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    drawBattlefield();
    drawPhaseBar();
    drawBay();
    drawParticles();
    drawOverlays();
    ctx.restore();
    if (state !== 'title') drawHUD();
    if (state === 'title') drawTitle();
    if (state === 'over') drawGameOver();
    if (state === 'won') {
        text('🏆 YOU BEAT ALL 300 LEVELS!', W / 2, 200, 30, '#ffd32a');
        text('THE HORDE IS GONE. FOR NOW…', W / 2, 240, 18, '#fff');
    }
}

// ---------- INPUT ----------
function toLogical(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width * W, y: (e.clientY - rect.top) / rect.height * H };
}
canvas.addEventListener('pointermove', e => { pointer = toLogical(e); });
canvas.addEventListener('pointerdown', e => {
    const p = toLogical(e);
    pointer = p;
    Sound.init();
    if (p.x > W - 50 && p.y < HUD_H) { Sound.toggle(); return; }
    if (p.x > W - 92 && p.x <= W - 50 && p.y < HUD_H && state !== 'title') { nextBackground(); return; }
    if (state === 'title') { startLevel(save.level); return; }
    if (state === 'over') { if (stateT > 1) startLevel(level); return; }
    if (state === 'shop' && inBox(p, NEXT_BTN)) { startLevel(save.level); return; }
    if (state === 'shop' || state === 'won') {
        const card = SHOP_CARDS.find(c => inBox(p, c));
        if (card) buyUpgrade(card);
        return;
    }
    if (state === 'merge' || state === 'bomb') {
        if (inBox(p, MODE_BTNS.merge)) { if (state !== 'merge') startMerge(); return; }
        if (inBox(p, MODE_BTNS.bomb)) { if (state !== 'bomb') startBomb(); return; }
    }
    const inBay = p.x >= BAY.x && p.x <= BAY.x + BAY.w && p.y >= BAY.y && p.y <= BAY.y + BAY.h;
    if (!inBay) return;
    if (state === 'merge') dropIntoBay(p.x);
    else if (state === 'bomb') launchFromBay(p.x, p.y);
});

// ---------- LOOP ----------
let last = performance.now();
function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
