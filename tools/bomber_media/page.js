// Opens Zombie Bomber (bomber/ in this repo) in a headless browser for the media tools: a small web server
// for the repo, and Matter.js and the Luckiest Guy font from the copies the Android build packs
// (android/build-bomber/assets/www/bomber/vendor/), so nothing is fetched from the internet. Without those
// copies (run tools/build_bomber_android.py once) they are fetched from their usual addresses.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const VENDOR = path.join(ROOT, 'android', 'build-bomber', 'assets', 'www', 'bomber', 'vendor');
const OUT = path.join(ROOT, 'android', 'build-bomber', 'media');   // kept out of git, like the other builds
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const FONTS = { latin: '_gP_1RrxsjcxVyin9l9n_j2hTd52.woff2', 'latin-ext': '_gP_1RrxsjcxVyin9l9n_j2hQ952mDo.woff2' };

function serve() {
    const server = http.createServer((req, res) => {
        const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            const index = path.join(file, 'index.html');
            if (file.startsWith(ROOT) && fs.existsSync(index)) { res.writeHead(200, { 'Content-Type': 'text/html' }); return fs.createReadStream(index).pipe(res); }
            res.writeHead(404); return res.end();
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

// The init script: fixed random numbers, and (film: true) a clock the recorder drives and sound recorded
// offline on that clock (an OfflineAudioContext whose currentTime is the film's time).
function initScript({ seed, film, audioSeconds }) {
    let s = seed >>> 0 || 1;
    Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    window.requestAnimationFrame = () => 0;   // nothing runs by itself: the tools step the game
    if (!film) return;
    window.__simMs = 0; window.__simT = 0;
    const t0 = 1.8e12;
    Date.now = () => t0 + window.__simMs;
    performance.now = () => window.__simMs;
    const AC = function () {
        const oc = new OfflineAudioContext(2, Math.ceil(48000 * audioSeconds), 48000);
        Object.defineProperty(oc, 'currentTime', { get: () => window.__simT });
        Object.defineProperty(oc, 'state', { get: () => 'running' });
        oc.resume = () => Promise.resolve(); oc.suspend = () => Promise.resolve();
        window.__oc = oc;
        return oc;
    };
    window.AudioContext = AC; window.webkitAudioContext = AC;
}

// A saved game set up before the page's scripts run.
const FLAGS = { o_daily: 1, o_missions: 1, o_wheel: 1, o_awards: 1, o_store: 1, boosterHint: 1, starter: 1, u_daily: 1, u_missions: 1, u_wheel: 1, u_awards: 1, u_store: 1, u_crate: 1, u_booster: 1, u_offline: 1 };

async function openGame({ save, seed = 7, film = false, audioSeconds = 50, dpr = 2 } = {}) {
    const server = await serve(), port = server.address().port;
    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    // 540 x 960 css px at 2x: a 1080 x 1920 canvas, and the game's 9:16 layout (450 x 800)
    const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: dpr });
    const logs = [];
    page.on('console', m => logs.push(m.type() + ': ' + m.text()));
    page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
    const local = fs.existsSync(path.join(VENDOR, 'matter.min.js'));
    await page.route('**/*', route => {
        const url = route.request().url();
        if (url.startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
        if (!local) return route.continue();
        if (url.includes('matter.min.js')) return route.fulfill({ path: path.join(VENDOR, 'matter.min.js'), contentType: 'application/javascript' });
        if (url.includes('fonts.googleapis.com')) {
            const face = (file, range) => `@font-face { font-family: 'Luckiest Guy'; font-style: normal; font-weight: 400; font-display: swap; src: url(https://fonts.gstatic.com/s/luckiestguy/v25/${file}) format('woff2'); unicode-range: ${range}; }`;
            return route.fulfill({ contentType: 'text/css', body: face(FONTS['latin-ext'], 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF') + '\n' + face(FONTS.latin, 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD') });
        }
        if (url.includes(FONTS.latin)) return route.fulfill({ path: path.join(VENDOR, 'luckiest-guy-latin.woff2'), contentType: 'font/woff2' });
        if (url.includes(FONTS['latin-ext'])) return route.fulfill({ path: path.join(VENDOR, 'luckiest-guy-latin-ext.woff2'), contentType: 'font/woff2' });
        return route.abort();   // nothing else from outside
    });
    await page.addInitScript(initScript, { seed, film, audioSeconds });
    if (save) await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('zombieBomber.save', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(save));
    await page.goto(`http://127.0.0.1:${port}/bomber/`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
        await document.fonts.load(`40px ${FONT}`); await document.fonts.ready;
        if (!document.fonts.check(`40px ${FONT}`)) throw new Error('the game font did not load');
        for (let i = 0; i < 200 && !(bombImgs.every(imgReady) && Object.values(zombieImgs).every(imgReady) && Object.values(uiImgs).every(imgReady)); i++) await new Promise(r => setTimeout(r, 50));
        while (Meta.t.panel) Meta.t.close();
        Meta.t.queue.length = 0;
    });
    const close = async () => { await browser.close(); server.close(); };
    return { page, logs, close, errors: () => logs.filter(l => l.startsWith('PAGEERROR')) };
}

module.exports = { openGame, FLAGS, ROOT, OUT };
