// --- MERGE FARMSTEAD: TOWNSFOLK EXPANSION ---

const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Composite = Matter.Composite,
      Events = Matter.Events;

const GAME_WIDTH = 450;
const GAME_HEIGHT = 800;
const DANGER_Y = 150; 

// Tycoon Game State
let unlocks = { barn: true, hay: false, farm: true, fert: false, aqua: false, flower: false };
let maxTier = 3; 
let money = 50;  
let feed = 0;    
let fertilizer = 20; 
let wheat = 0;       
let rawFertilizer = 0; 
let water = 0;
let nectar = 0;
let hearts = 0;
let isGameOver = false;
let currentMode = 'farm'; 

// Score: Suika-style triangular points for every merge, best kept across games
const BEST_KEY = 'happyFruitMerge.best';
let score = 0;
let bestScore = 0;
try { bestScore = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) {}
let isNewBest = false;

function addScore(tier) {
    score += (tier * (tier + 1) / 2) * 10;
    if (score > bestScore) {
        if (!isNewBest && bestScore > 0) toast('🏆 New best score!');
        isNewBest = true;
        bestScore = score;
        try { localStorage.setItem(BEST_KEY, bestScore); } catch (e) {}
    }
}

// UI Elements
const fertEl = document.getElementById('fert-val');
const wheatEl = document.getElementById('wheat-val');
const feedEl = document.getElementById('feed-val');
const rawEl = document.getElementById('raw-val');
const waterEl = document.getElementById('water-val');
const nectarEl = document.getElementById('nectar-val');
const moneyEl = document.getElementById('money-val');
const heartsEl = document.getElementById('hearts-val');
const scoreEl = document.getElementById('score-val');
const bestEl = document.getElementById('best-val');

const btnFarm = document.getElementById('btn-farm');
const btnHay = document.getElementById('btn-hay');
const btnBarn = document.getElementById('btn-barn');
const btnFert = document.getElementById('btn-fert');
const btnAqua = document.getElementById('btn-aqua');
const btnFlower = document.getElementById('btn-flower');
const btnTown = document.getElementById('btn-town');
const btnShop = document.getElementById('btn-shop');

const contFarm = document.getElementById('farm-container');
const contHay = document.getElementById('hay-container');
const contBarn = document.getElementById('barn-container');
const contFert = document.getElementById('fert-container');
const contAqua = document.getElementById('aqua-container');
const contFlower = document.getElementById('flower-container');
const contTown = document.getElementById('town-container');
const contShop = document.getElementById('shop-container');
const missionsList = document.getElementById('missions-list');
const shopList = document.getElementById('shop-list');

// Flavor Names for the Tiers
const NAMES = {
    'farm': ['Seed', 'Sprout', 'Strawberry', 'Tomato', 'Corn', 'Carrot', 'Cabbage', 'Pumpkin', 'Watermelon', 'Golden Apple', 'Giant Sun'],
    'hay': ['Stalk', 'Bundle', 'Small Bale', 'Medium Bale', 'Large Bale', 'Hay Stack', 'Hay Tower', 'Hay Silo', 'Golden Hay', 'Magic Hay', 'Infinite Hay'],
    'barn': ['Egg', 'Chick', 'Chicken', 'Piglet', 'Pig', 'Calf', 'Cow', 'Horse', 'Alpaca', 'Bull', 'Unicorn'],
    'fert': ['Dust', 'Ash', 'Scraps', 'Compost', 'Manure', 'Basic Fert', 'Quality Fert', 'Speed-Gro', 'Deluxe Fert', 'Magic Fert', 'Iridium Fert'],
    'aqua': ['Algae', 'Plankton', 'Shrimp', 'Goldfish', 'Clownfish', 'Turtle', 'Squid', 'Dolphin', 'Shark', 'Whale Shark', 'Kraken'],
    'flower': ['Seedling', 'Bud', 'Daisy', 'Tulip', 'Rose', 'Lily', 'Orchid', 'Lotus', 'Rafflesia', 'Crystal Flower', 'Tree of Life']
};
const TIERS = [20, 30, 40, 55, 70, 85, 100, 120, 145, 170, 200];

// Sprites cut from assets/<mode>/source_sheet.webp (index = tier).
// Boards without art fall back to coloured circles.
const SPRITES = {
    'farm': [
        'assets/farm/01_seed.png', 'assets/farm/02_sprout.png', 'assets/farm/03_strawberry.png',
        'assets/farm/04_tomato.png', 'assets/farm/05_corn.png', 'assets/farm/06_carrot.png',
        'assets/farm/07_cabbage.png', 'assets/farm/08_pumpkin.png', 'assets/farm/09_watermelon.png',
        'assets/farm/10_golden_apple.png', 'assets/farm/11_sunflower.png'
    ],
    'barn': [
        'assets/barn/01_egg.png', 'assets/barn/02_chick.png', 'assets/barn/03_chicken.png',
        'assets/barn/04_piglet.png', 'assets/barn/05_pig.png', 'assets/barn/06_calf.png',
        'assets/barn/08_cow.png', 'assets/barn/09_horse.png', 'assets/barn/10_alpaca.png',
        'assets/barn/11_bull.png', 'assets/barn/12_unicorn.png'
    ]
};
const SPRITE_SIZE = 256;   // px, every sprite is a 256x256 square
const SPRITE_FIT = 1.08;   // draw slightly bigger than the collider so art touches neighbours
Object.values(SPRITES).flat().forEach(src => { const img = new Image(); img.src = src; }); // preload

function spriteScale(radius) {
    return (radius * 2 * SPRITE_FIT) / SPRITE_SIZE;
}

// Small non-blocking message instead of alert()
const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// --- TOWNSFOLK SYSTEM ---
const npcs = [
    { id: 'mayor', name: 'Mayor Pelican', emoji: '🎩', pref: ['farm', 'fert'], deliveries: 0, request: null },
    { id: 'marnie', name: 'Marnie', emoji: '🐄', pref: ['barn'], deliveries: 0, request: null },
    { id: 'robin', name: 'Robin', emoji: '🪓', pref: ['hay'], deliveries: 0, request: null },
    { id: 'willy', name: 'Willy', emoji: '🎣', pref: ['aqua'], deliveries: 0, request: null },
    { id: 'sandy', name: 'Sandy', emoji: '🌸', pref: ['flower'], deliveries: 0, request: null }
];

function generateRequestFor(npc) {
    let availableModes = npc.pref.filter(m => unlocks[m]);
    if (availableModes.length === 0) {
        availableModes = Object.keys(unlocks).filter(k => unlocks[k]); // fallback if their pref isn't unlocked
    }
    const mode = availableModes[Math.floor(Math.random() * availableModes.length)];
    const targetTier = Math.floor(Math.random() * maxTier) + 1; 
    const itemName = NAMES[mode][targetTier];
    
    npc.request = {
        mode: mode,
        tier: targetTier,
        itemName: itemName,
        rewardMoney: targetTier * 30 + Math.floor(Math.random() * 20),
        rewardHearts: targetTier
    };
}

function initTown() {
    npcs.forEach(npc => generateRequestFor(npc));
    renderTown();
}

function renderTown() {
    missionsList.innerHTML = '';
    npcs.forEach(npc => {
        if (!npc.request) return; // shouldn't happen
        const r = npc.request;
        const level = Math.floor(npc.deliveries / 5) + 1;

        const div = document.createElement('div');
        div.style.background = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '8px';
        div.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        div.style.color = '#333';
        div.style.borderLeft = '4px solid #2980b9';
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <div style="font-weight: bold; font-size: 16px; color: #2c3e50;">
                    ${npc.emoji} ${npc.name}
                </div>
                <div style="font-size: 12px; color: #8e44ad; font-weight: bold;">
                    Lv.${level} (${npc.deliveries} Deliveries)
                </div>
            </div>
            <div style="font-size: 14px; margin-bottom: 10px;">I need a <b>${r.itemName}</b> (Tier ${r.tier} on the ${r.mode.toUpperCase()} board).</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 14px; font-weight: bold;">Reward: <span style="color:#f1c40f;">💵 ${r.rewardMoney}</span> | <span style="color:#e74c3c;">❤️ ${r.rewardHearts}</span></div>
                <button onclick="fulfillRequest('${npc.id}')" style="background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Deliver</button>
            </div>
        `;
        missionsList.appendChild(div);
    });
}

window.fulfillRequest = function(npcId) {
    const npc = npcs.find(n => n.id === npcId);
    if (!npc || !npc.request) return;
    const r = npc.request;

    let targetEngine;
    if (r.mode === 'farm') targetEngine = farmEngine;
    else if (r.mode === 'hay') targetEngine = hayEngine;
    else if (r.mode === 'barn') targetEngine = barnEngine;
    else if (r.mode === 'fert') targetEngine = fertEngine;
    else if (r.mode === 'aqua') targetEngine = aquaEngine;
    else if (r.mode === 'flower') targetEngine = flowerEngine;

    const bodies = Composite.allBodies(targetEngine.world);
    const itemBody = bodies.find(b => b.tier === r.tier && !b.isGrowing);

    if (itemBody) {
        Composite.remove(targetEngine.world, itemBody);
        money += r.rewardMoney;
        hearts += r.rewardHearts;
        npc.deliveries++;
        updateUI();
        
        generateRequestFor(npc);
        renderTown();
        
        toast(`Delivered ${r.itemName} to ${npc.name}! +💵 ${r.rewardMoney} +❤️ ${r.rewardHearts}`);
    } else {
        toast(`No fully grown ${r.itemName} on your ${r.mode.toUpperCase()} board yet!`);
    }
};

// --- CORE LOGIC ---

function switchMode(mode) {
    if (isGameOver) return;
    currentMode = mode;
    
    [btnFarm, btnHay, btnBarn, btnFert, btnAqua, btnFlower, btnTown, btnShop].forEach(b => b.classList.remove('active'));
    [contFarm, contHay, contBarn, contFert, contAqua, contFlower, contTown, contShop].forEach(c => c.style.display = 'none');
    
    if (mode === 'farm') { btnFarm.classList.add('active'); contFarm.style.display = 'block'; } 
    else if (mode === 'hay') { btnHay.classList.add('active'); contHay.style.display = 'block'; } 
    else if (mode === 'barn') { btnBarn.classList.add('active'); contBarn.style.display = 'block'; } 
    else if (mode === 'fert') { btnFert.classList.add('active'); contFert.style.display = 'block'; }
    else if (mode === 'aqua') { btnAqua.classList.add('active'); contAqua.style.display = 'block'; }
    else if (mode === 'flower') { btnFlower.classList.add('active'); contFlower.style.display = 'block'; }
    else if (mode === 'town') { btnTown.classList.add('active'); contTown.style.display = 'block'; }
    else if (mode === 'shop') { 
        btnShop.classList.add('active'); 
        contShop.style.display = 'block'; 
        renderShop(); 
    }
}

btnFarm.addEventListener('click', () => switchMode('farm'));
btnHay.addEventListener('click', () => switchMode('hay'));
btnBarn.addEventListener('click', () => switchMode('barn'));
btnFert.addEventListener('click', () => switchMode('fert'));
btnAqua.addEventListener('click', () => switchMode('aqua'));
btnFlower.addEventListener('click', () => switchMode('flower'));
btnTown.addEventListener('click', () => switchMode('town'));
btnShop.addEventListener('click', () => switchMode('shop'));

function updateUI() {
    fertEl.textContent = fertilizer;
    wheatEl.textContent = wheat;
    feedEl.textContent = feed;
    rawEl.textContent = rawFertilizer;
    waterEl.textContent = water;
    nectarEl.textContent = nectar;
    moneyEl.textContent = money;
    heartsEl.textContent = hearts;
    scoreEl.textContent = score;
    bestEl.textContent = bestScore;
    
    if (currentMode === 'shop') {
        renderShop(); 
    }
}

// Shop System
function renderShop() {
    shopList.innerHTML = '';

    function addShopItem(title, desc, cost, onBuy, isVisible = true, isSell = false) {
        if (!isVisible) return;
        const div = document.createElement('div');
        div.style.background = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '8px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.borderLeft = isSell ? '4px solid #e74c3c' : '4px solid #f1c40f';
        
        let canAfford = isSell ? isSell() : (money >= cost);
        let btnColor = canAfford ? (isSell ? '#e74c3c' : '#27ae60') : '#bdc3c7';
        let btnLabel = isSell ? `SELL (+💵 ${cost})` : `💵 ${cost}`;

        div.innerHTML = `
            <div>
                <div style="font-weight:bold; color:#2c3e50">${title}</div>
                <div style="font-size:12px; color:#7f8c8d">${desc}</div>
            </div>
            <button style="background: ${btnColor}; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: ${canAfford ? 'pointer' : 'not-allowed'};">${btnLabel}</button>
        `;
        div.querySelector('button').onclick = () => {
            if (canAfford) {
                if (!isSell) money -= cost;
                onBuy();
                updateUI();
            }
        };
        shopList.appendChild(div);
    }

    if (unlocks.flower) addShopItem('Export 🍯 Nectar', 'Sells 1 Nectar for profit!', 150, () => { nectar--; money += 150; }, true, () => nectar > 0);
    addShopItem('Sell 🌾 Wheat x5', 'Your Farm merges grow wheat. Cash it in!', 20, () => { wheat -= 5; money += 20; }, true, () => wheat >= 5);

    addShopItem('Buy 🌿 Feed', 'Required to spawn animals.', 5, () => { feed++; });
    if (unlocks.farm) addShopItem('Buy ✨ Fertilizer', 'Required to plant seeds.', 10, () => { fertilizer++; });
    if (unlocks.hay) addShopItem('Buy 🌾 Wheat', 'Required to bundle hay.', 8, () => { wheat++; });
    if (unlocks.fert) addShopItem('Buy 💩 Raw Fert', 'Required to process fertilizer.', 15, () => { rawFertilizer++; });
    if (unlocks.aqua) addShopItem('Buy 💧 Water', 'Spawn aquarium plants.', 50, () => { water++; });

    addShopItem('Unlock Hay Space', 'Bundle wheat into feed.', 150, () => { unlocks.hay = true; btnHay.style.display = 'block'; }, !unlocks.hay);
    addShopItem('Unlock Farm Space', 'Grow your own wheat.', 350, () => { unlocks.farm = true; btnFarm.style.display = 'block'; }, !unlocks.farm);
    addShopItem('Unlock Fert Space', 'Make your own fertilizer.', 800, () => { unlocks.fert = true; btnFert.style.display = 'block'; }, !unlocks.fert);
    addShopItem('Unlock Aquarium', 'Feed wheat to fish to generate water.', 5000, () => { unlocks.aqua = true; btnAqua.style.display = 'block'; }, !unlocks.aqua);
    addShopItem('Unlock Flower Garden', 'Use Water + Fert to grow Nectar.', 10000, () => { unlocks.flower = true; btnFlower.style.display = 'block'; }, !unlocks.flower);

    if (maxTier < TIERS.length - 1) {
        let nextTierName = NAMES['barn'][maxTier]; 
        addShopItem(`Unlock Tier ${maxTier + 1}`, `Increases your max merge limit.`, (maxTier) * 100, () => { 
            maxTier++; 
            initTown(); // recalculate new possible requests!
        });
    }
}


function setupWorld(containerEl, modeName, bgColor) {
    const engine = Engine.create();
    const render = Render.create({
        element: containerEl,
        engine: engine,
        options: { width: GAME_WIDTH, height: GAME_HEIGHT, wireframes: false, background: bgColor }
    });
    Render.run(render);

    const runner = Runner.create();
    Runner.run(runner, engine);
    runners.push({ runner, engine });

    const wallOptions = { isStatic: true, render: { fillStyle: '#34495e' } };
    const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 25, GAME_WIDTH, 50, wallOptions);
    const leftWall = Bodies.rectangle(-25, GAME_HEIGHT / 2, 50, GAME_HEIGHT, wallOptions);
    const rightWall = Bodies.rectangle(GAME_WIDTH + 25, GAME_HEIGHT / 2, 50, GAME_HEIGHT, wallOptions);
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

            if (body.tier !== undefined && !body.isGrowing) {
                if (body.position.y - body.currentRadius < DANGER_Y) {
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
                document.getElementById('gameover-text').textContent =
                    `Your ${modeName.toUpperCase()} board overflowed. Score: ${score}` + (isNewBest ? ' 🏆 New best!' : ` (Best: ${bestScore})`);
                document.getElementById('gameover').style.display = 'flex';
            }
        } else {
            dangerTimer = 0;
        }
    });

    containerEl.addEventListener('pointerdown', (e) => {
        if (isGameOver || Ads.isShowing()) return;
        
        if (modeName === 'farm') {
            if (fertilizer <= 0) { toast("Not enough ✨ Fertilizer! Buy some in the Shop."); return; }
            fertilizer--;
        } else if (modeName === 'hay') {
            if (wheat <= 0) { toast("Not enough 🌾 Wheat!"); return; }
            wheat--;
        } else if (modeName === 'barn') {
            if (feed <= 0) { toast("Not enough 🌿 Feed! Buy some from the Shop!"); return; }
            feed--;
        } else if (modeName === 'fert') {
            if (rawFertilizer <= 0) { toast("Not enough 💩 Raw Fertilizer!"); return; }
            rawFertilizer--;
        } else if (modeName === 'aqua') {
            if (wheat <= 0) { toast("Not enough 🌾 Wheat (used as fish food)!"); return; }
            wheat--;
        } else if (modeName === 'flower') {
            if (water <= 0 || fertilizer <= 0) { toast("Not enough 💧 Water or ✨ Fertilizer!"); return; }
            water--;
            fertilizer--;
        }
        updateUI();

        const rect = containerEl.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const clickX = (e.clientX - rect.left) * scaleX;
        const safeX = Math.max(TIERS[0], Math.min(GAME_WIDTH - TIERS[0], clickX));
        
        spawnItem(engine.world, safeX, 50, 0, modeName, false);
        Ads.onDrop();
    });

    // A dropped item lands when it touches the floor or an item that has already landed.
    // Only landed items may merge, so spamming drops can't merge items in mid-air at the top.
    function isLanded(body) {
        return body === ground || (body.tier !== undefined && !body.isDropping);
    }

    function handleCollisions(event) {
        if (isGameOver) return;
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const bodyA = pairs[i].bodyA;
            const bodyB = pairs[i].bodyB;

            if (bodyA.isDropping && isLanded(bodyB)) bodyA.isDropping = false;
            if (bodyB.isDropping && isLanded(bodyA)) bodyB.isDropping = false;
            if (bodyA.isDropping || bodyB.isDropping) continue;
            
            if (bodyA.tier !== undefined && bodyB.tier !== undefined) {
                if (bodyA.tier === bodyB.tier && bodyA.mode === bodyB.mode && bodyA.tier < TIERS.length - 1) {
                    
                    if (bodyA.tier >= maxTier) {
                        continue; 
                    }

                    if (bodyA.isMerging || bodyB.isMerging) continue;
                    bodyA.isMerging = true;
                    bodyB.isMerging = true;
                    
                    const nextTier = bodyA.tier + 1;
                    const mode = bodyA.mode;
                    
                    const rewardAmount = nextTier * 2;
                    if (mode === 'farm') wheat += rewardAmount;
                    else if (mode === 'hay') feed += rewardAmount;
                    else if (mode === 'barn') rawFertilizer += rewardAmount;
                    else if (mode === 'fert') fertilizer += rewardAmount;
                    else if (mode === 'aqua') water += rewardAmount;
                    else if (mode === 'flower') nectar += rewardAmount;
                    addScore(nextTier);
                    updateUI();
                    
                    const midX = (bodyA.position.x + bodyB.position.x) / 2;
                    const midY = (bodyA.position.y + bodyB.position.y) / 2;
                    
                    Composite.remove(engine.world, [bodyA, bodyB]);
                    spawnItem(engine.world, midX, midY, nextTier, mode, true);
                }
            }
        }
    }
    // collisionActive too: two drops that met in mid-air may merge once they're resting on the pile
    Events.on(engine, 'collisionStart', handleCollisions);
    Events.on(engine, 'collisionActive', handleCollisions);

    return engine;
}

function spawnItem(world, x, y, tier, mode, animateGrowth) {
    const targetRadius = TIERS[tier];
    const startRadius = animateGrowth ? Math.max(targetRadius * 0.3, 10) : targetRadius; 
    
    let hue;
    if (mode === 'farm') hue = (tier * 15 + 120) % 360; 
    else if (mode === 'hay') hue = (tier * 15 + 40) % 360; 
    else if (mode === 'barn') hue = (tier * 15 + 0) % 360; 
    else if (mode === 'fert') hue = (tier * 15 + 280) % 360; 
    else if (mode === 'aqua') hue = (tier * 15 + 200) % 360; 
    else if (mode === 'flower') hue = (tier * 15 + 320) % 360; 
    
    let renderOpts = {
        fillStyle: `hsl(${hue}, 80%, 60%)`,
        strokeStyle: `hsl(${hue}, 80%, 40%)`,
        lineWidth: Math.max(1, 4 * (startRadius / targetRadius))
    };
    if (SPRITES[mode]) {
        const scale = spriteScale(startRadius);
        renderOpts = { sprite: { texture: SPRITES[mode][tier], xScale: scale, yScale: scale } };
    }

    const body = Bodies.circle(x, y, startRadius, {
        restitution: 0.15,
        friction: 0.5,
        density: 0.001 * (tier + 1),
        render: renderOpts,
        tier: tier,
        mode: mode
    });
    
    if (animateGrowth) Body.setVelocity(body, { x: 0, y: 2 }); // slight downward push (dev plan §4)
    body.isDropping = !animateGrowth; // merge results are already in the pile
    body.isGrowing = animateGrowth;
    body.currentRadius = startRadius;
    body.targetRadius = targetRadius;
    
    Composite.add(world, body);
}

function syncSprite(body) {
    if (body.render.sprite && body.render.sprite.texture) {
        const scale = spriteScale(body.currentRadius);
        body.render.sprite.xScale = scale;
        body.render.sprite.yScale = scale;
    }
}

// Drop preview: the tier-0 item follows the pointer along the top of each sprite board
[contFarm, contBarn].forEach(cont => {
    const guide = cont.querySelector('.drop-guide');
    cont.addEventListener('pointermove', (e) => {
        const rect = cont.getBoundingClientRect();
        const r = TIERS[0] * (rect.width / GAME_WIDTH);
        const x = Math.max(r, Math.min(rect.width - r, e.clientX - rect.left));
        guide.style.left = `${x}px`;
    });
});

document.getElementById('btn-restart').addEventListener('click', () => {
    Ads.showInterstitial(() => location.reload());
});

// Physics is paused while an ad is on screen
const runners = [];
function pauseGame() { runners.forEach(r => Runner.stop(r.runner)); }
function resumeGame() { runners.forEach(r => Runner.run(r.runner, r.engine)); }
Ads.init({ onPause: pauseGame, onResume: resumeGame });

// Initialize Everything
const farmEngine = setupWorld(contFarm, 'farm', '#e8f8f5');
const hayEngine = setupWorld(contHay, 'hay', '#fef9e7');
const barnEngine = setupWorld(contBarn, 'barn', '#fdedec');
const fertEngine = setupWorld(contFert, 'fert', '#f4ecf8');
const aquaEngine = setupWorld(contAqua, 'aqua', '#eaf2f8'); 
const flowerEngine = setupWorld(contFlower, 'flower', '#fce8f3'); 

updateUI();
initTown();
switchMode('farm');
