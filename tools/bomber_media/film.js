// Films Zombie Bomber frame by frame at a fixed 60 fps, with the game's own sound (needs Playwright and ffmpeg).
//   node tools/bomber_media/film.js preview [seed]   stills 4 times a second and a log of what happened
//   node tools/bomber_media/film.js final [seed]     1080 x 1920, 60 fps, sound at -14 LUFS:
//                                                    android/build-bomber/media/zombie-bomber-gameplay.mp4
// The scene: level 150 with everything upgraded, wave 4 of 5 coming in; a showcase player (director.js)
// throws, merges, calls Air Strikes and saves the Mega Nuke for the Zombie Kings. The clock and the random
// numbers are fixed, so a preview and the final film play out the same way. Check a preview after changing
// the game: the player adapts, but the beats (and the cut points in cuts.js) may move.
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { openGame, FLAGS, OUT } = require('./page');
const MODE = process.argv[2] || 'preview', SEED = +(process.argv[3] || 7), FINAL = MODE === 'final';
const FPS = 60, MAX_S = 45, HOLD_AFTER_CLEAR = 2.9;
const SCENE = {
    level: 150, fromWave: 3, preroll: 3.2, coins: 2400, kingsAfter: 0,
    bay: [{ x: 104, y: 240, tier: 10, reserve: true }, { x: 335, y: 250, tier: 8 }, { x: 228, y: 80, tier: 6 }]
};
const SAVE = { level: 150, coins: 48250, gems: 260, streak: 6, tut: true, bestTier: 11, up: { soldiers: 8, weapons: 12, base: 20, bombs: 16 },
    boost: { air: 3, freeze: 2 }, kingLv: 145, zoneLv: 140, login: { last: 'x', n: 12 }, starter: true, flags: FLAGS };
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
function measure(file) {
    const r = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-vn', '-f', 'null', '-'], { encoding: 'utf8' });
    const t = r.stderr; return JSON.parse(t.slice(t.lastIndexOf('{'), t.lastIndexOf('}') + 1));
}
// brings a sound to -14 LUFS with peaks under -1 dB (two passes), as social video expects
function normalize(input, output) {
    const j = measure(input);
    ff(['-i', input, '-af', `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`, '-ar', '48000', output]);
    return j;
}
module.exports = { ff, measure, normalize };

if (require.main === module) (async () => {
    const dir = path.join(OUT, FINAL ? 'film' : 'preview');
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const g = await openGame({ save: SAVE, seed: SEED, film: true, audioSeconds: MAX_S + 4 });
    await g.page.addScriptTag({ path: path.join(__dirname, 'director.js') });
    console.log('setup', JSON.stringify(await g.page.evaluate(sc => DIR.setup(sc), SCENE)));
    let enc = null;
    if (FINAL) enc = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', path.join(dir, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    let frames = 0, clearedAt = null, shot = 0;
    while (frames < MAX_S * FPS) {
        const r = await g.page.evaluate(([n, every, q]) => DIR.step(n, every, q), [FINAL ? 20 : 30, FINAL ? 1 : 15, FINAL ? 0.93 : 0.62]);
        frames = r.f;
        for (const p of r.pics) {
            const buf = Buffer.from(p.split(',')[1], 'base64');
            if (FINAL) { if (!enc.stdin.write(buf)) await new Promise(res => enc.stdin.once('drain', res)); }
            else fs.writeFileSync(path.join(dir, `s${String(shot++).padStart(3, '0')}.jpg`), buf);
        }
        if (r.state === 'cleared' && clearedAt === null) clearedAt = frames;
        if (clearedAt !== null && frames - clearedAt >= HOLD_AFTER_CLEAR * FPS) break;
        if (r.state === 'over' || r.state === 'revive') { console.log('the base fell at', (frames / FPS).toFixed(1), 's'); break; }
        if (FINAL && frames % 300 === 0) console.log(`  ${(frames / FPS).toFixed(0)} s of film`);
    }
    const seconds = frames / FPS;
    const info = await g.page.evaluate(() => ({ log: DIR.log, baseHP: Math.round(baseHP), baseMax, stars }));
    console.log(info.log.join('\n'));
    console.log(`film ${seconds.toFixed(2)} s, cleared at ${clearedAt === null ? 'never' : (clearedAt / FPS).toFixed(2) + ' s'}, base ${info.baseHP}/${info.baseMax}, stars ${info.stars}`);
    if (FINAL) {
        enc.stdin.end(); await new Promise(res => enc.on('close', res));
        const snd = await g.page.evaluate(s => DIR.sound(s), seconds);
        fs.writeFileSync(path.join(dir, 'sound.wav'), Buffer.from(snd.wav, 'base64'));
        const j = normalize(path.join(dir, 'sound.wav'), path.join(dir, 'sound_norm.wav'));
        console.log(`sound ${j.input_i} LUFS (peak ${j.input_tp} dB) -> -14 LUFS`);
        const film = path.join(OUT, 'zombie-bomber-gameplay.mp4');
        ff(['-i', path.join(dir, 'video.mp4'), '-i', path.join(dir, 'sound_norm.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', film]);
        console.log('->', path.relative(process.cwd(), film));
    }
    console.log(g.errors().length ? g.errors().join('\n') : 'no page errors');
    await g.close();
})();
