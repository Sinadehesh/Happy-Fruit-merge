// --- SOUND ---
// Recorded sound effects (assets/sfx, CC0: Kenney + OpenGameArt pops, see assets/sfx/CREDITS.txt),
// optional combo voice lines (assets/voice), and background songs by Kevin MacLeod
// (assets/music, CC BY 4.0, credited in the settings and assets/music/CREDITS.txt).
// Sound can be switched off and the song picked (or switched off) in the settings; the choice is remembered.

const Sound = (() => {
    const KEY = 'happyFruitMerge.audio';
    // music = index into SONGS, or -1 for off
    let prefs = { sfx: true, music: 0 };
    try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) {}
    if (typeof prefs.music !== 'number') prefs.music = prefs.music === false ? -1 : 0;   // older saves stored true/false
    const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };

    // ---------- recordings ----------

    const SAMPLES = ['drop', 'land', 'pop_1', 'pop_2', 'pop_3', 'pop_4', 'pop_5', 'pop_6', 'bubble_1', 'bubble_2', 'bubble_3',
        'bubble_big', 'chime', 'praise', 'fanfare', 'gameover', 'tap', 'voice_new_highscore', 'voice_game_over', 'voice_congratulations']
        .map(n => [n, `assets/sfx/${n}.wav`]);
    // Combo praise voice, one file per word (SWEET! ... DELICIOUS!), played deeper and punchier the
    // higher the combo. Add the recordings to assets/voice and list their names here, in ladder order.
    const PRAISE_VOICES = [];   // e.g. ['sweet', 'yummy', 'juicy', 'tasty', 'delicious']
    PRAISE_VOICES.forEach(n => SAMPLES.push([`praise_${n}`, `assets/voice/${n}.mp3`]));

    // download everything now; decode once audio is unlocked
    const raw = {}, buffers = {};
    SAMPLES.forEach(([name, url]) => {
        raw[name] = fetch(url).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    });
    function decodeAll() {
        SAMPLES.forEach(([name]) => raw[name].then(data => {
            if (!data || buffers[name]) return;
            ac.decodeAudioData(data.slice(0), b => { buffers[name] = b; }, () => {});
        }));
    }

    let ac = null, sfxBus = null;

    // Start audio on the first tap (browsers block sound until then)
    function unlock() {
        if (!ac) {
            try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
            sfxBus = ac.createGain(); sfxBus.gain.value = prefs.sfx ? 1 : 0;
            sfxBus.connect(ac.destination);
            decodeAll();
        }
        if (ac.state === 'suspended') ac.resume();
        Music.play();
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (ac) ac.suspend(); Music.pause(); }
        else { if (ac) ac.resume(); Music.play(); }
    });

    // play a recording; rate < 1 is lower and slower, > 1 higher and quicker
    function sample(name, { gain = 1, rate = 1, when = 0, out = sfxBus } = {}) {
        const b = buffers[name];
        if (!ac || !b) return;
        const src = ac.createBufferSource(), g = ac.createGain();
        src.buffer = b; src.playbackRate.value = rate; g.gain.value = gain;
        src.connect(g); g.connect(out);
        src.start(ac.currentTime + when);
    }
    const pick = (...names) => names[Math.floor(Math.random() * names.length)];
    const jitter = (r, amount = 0.04) => r * (1 + (Math.random() * 2 - 1) * amount);   // so repeats don't sound identical
    const semitones = n => Math.pow(2, n / 12);
    const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];   // combo chime climbs a pentatonic scale

    // Combo voice: each step up the ladder plays deeper (slower), louder and more compressed (punchier)
    function praiseVoice(level) {
        const name = `praise_${PRAISE_VOICES[Math.min(level, PRAISE_VOICES.length - 1)]}`;
        if (!ac || !buffers[name]) return;
        const warm = ac.createBiquadFilter(); warm.type = 'lowshelf'; warm.frequency.value = 220; warm.gain.value = 2 + level * 1.5;
        const punch = ac.createDynamicsCompressor();
        punch.threshold.value = -20 - level * 3; punch.ratio.value = 3 + level; punch.attack.value = 0.003; punch.release.value = 0.15;
        warm.connect(punch); punch.connect(sfxBus);
        sample(name, { rate: 1 - level * 0.035, gain: 0.9 + level * 0.12, out: warm });
    }

    // ---------- game sounds ----------

    const sfx = {
        // releasing a fruit
        drop() { sample('drop', { gain: 0.35, rate: jitter(1) }); },
        // landing on the pile: soft thud, bigger items a little deeper
        land(tier) { sample('land', { gain: 0.3, rate: jitter(Math.max(0.6, 1.15 - tier * 0.05)) }); },
        // merging: a mouth pop plus a bubble, lower for bigger items; big ones get a deep bubble
        pop(tier) {
            const r = Math.max(0.6, 1.25 - tier * 0.06);
            sample(pick('pop_1', 'pop_2', 'pop_3', 'pop_4', 'pop_5', 'pop_6'), { gain: 0.7, rate: jitter(r) });
            if (tier >= 5) sample('bubble_big', { gain: 0.55, rate: jitter(Math.max(0.7, 1.15 - (tier - 5) * 0.06)) });
            else sample(pick('bubble_1', 'bubble_2', 'bubble_3'), { gain: 0.45, rate: jitter(r * 1.05), when: 0.015 });
        },
        // each step of a combo: a glassy chime, one note higher each time
        combo(step) { sample('chime', { gain: 0.4, rate: semitones(PENTA[Math.min(step, PENTA.length - 1)]) }); },
        // praise word (SWEET! ... DELICIOUS!): sparkle plus the voice line if recorded
        praise(level) {
            sample('praise', { gain: 0.45, rate: semitones(level) });
            praiseVoice(level);
        },
        // biggest item made
        maxMerge() { sample('fanfare', { gain: 0.5 }); sample('voice_congratulations', { gain: 0.85, when: 0.25 }); },
        newBest() { sample('voice_new_highscore', { gain: 0.85 }); sample('praise', { gain: 0.35, rate: semitones(7), when: 0.9 }); },
        gameOver() { sample('gameover', { gain: 0.45 }); sample('voice_game_over', { gain: 0.85, when: 0.3 }); },
        tap() { sample('tap', { gain: 0.35 }); }
    };

    // ---------- music: songs by Kevin MacLeod, one plays on repeat ----------

    const SONGS = [
        { title: 'Carefree', file: 'carefree' },
        { title: 'Easy Lemon', file: 'easy_lemon' },
        { title: 'Wallpaper', file: 'wallpaper' },
        { title: 'Monkeys Spinning Monkeys', file: 'monkeys_spinning_monkeys' }
    ];
    const MUSIC_VOLUME = 0.35;

    const Music = (() => {
        let audio = null, loaded = -1, started = false;
        return {
            play() {
                if (prefs.music < 0) return;
                if (!audio) { audio = new Audio(); audio.loop = true; audio.volume = MUSIC_VOLUME; }
                if (loaded !== prefs.music) { audio.src = `assets/music/${SONGS[prefs.music].file}.mp3`; loaded = prefs.music; }
                started = true;
                audio.play().catch(() => {});   // blocked until the first tap; unlock() calls this again then
            },
            pause() { if (audio) audio.pause(); },
            stop() { if (audio) { audio.pause(); audio.currentTime = 0; } }
        };
    })();

    function play(name, ...args) { if (ac && prefs.sfx && sfx[name]) sfx[name](...args); }

    function setSfx(on) { prefs.sfx = on; savePrefs(); if (sfxBus) sfxBus.gain.value = on ? 1 : 0; }
    // next song, and after the last one: off
    function nextMusic() {
        prefs.music = prefs.music + 1 >= SONGS.length ? -1 : prefs.music + 1;
        savePrefs();
        if (prefs.music < 0) Music.stop(); else Music.play();
    }
    const songTitle = () => prefs.music < 0 ? null : SONGS[prefs.music].title;

    return { unlock, play, setSfx, nextMusic, songTitle, prefs: () => ({ ...prefs }) };
})();
