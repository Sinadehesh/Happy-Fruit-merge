// --- SOUND ---
// Soft, cute sound effects made in code with Web Audio, and background songs by Kevin MacLeod
// (assets/music, CC BY 4.0, credited in the settings and assets/music/CREDITS.txt).
// Sound can be switched off and the song picked (or switched off) in the settings; the choice is remembered.

const Sound = (() => {
    const KEY = 'happyFruitMerge.audio';
    // music = index into SONGS, or -1 for off
    let prefs = { sfx: true, music: 0 };
    try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) {}
    if (typeof prefs.music !== 'number') prefs.music = prefs.music === false ? -1 : 0;   // older saves stored true/false
    const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };

    let ac = null, sfxBus = null;

    // Start audio on the first tap (browsers block sound until then)
    function unlock() {
        if (!ac) {
            try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
            sfxBus = ac.createGain(); sfxBus.gain.value = prefs.sfx ? 0.9 : 0;
            sfxBus.connect(ac.destination);
        }
        if (ac.state === 'suspended') ac.resume();
        Music.play();
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (ac) ac.suspend(); Music.pause(); }
        else { if (ac) ac.resume(); Music.play(); }
    });

    // ---------- building blocks ----------

    function tone(freq, dur, { type = 'sine', gain = 0.2, slideTo = null, attack = 0.005, when = 0 } = {}) {
        if (!ac) return;
        const t = ac.currentTime + when;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur * 0.8);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(sfxBus);
        o.start(t); o.stop(t + dur + 0.05);
    }

    function noise(dur, { gain = 0.05, type = 'bandpass', freq = 2000, q = 1, when = 0 } = {}) {
        if (!ac) return;
        const t = ac.currentTime + when;
        const len = Math.ceil(ac.sampleRate * dur);
        const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = gain;
        src.connect(f); f.connect(g); g.connect(sfxBus);
        src.start(t);
    }

    // music-box bell: soft sine with a quiet overtone
    function bell(freq, { gain = 0.16, dur = 0.9, when = 0 } = {}) {
        tone(freq, dur, { type: 'sine', gain, when });
        tone(freq * 2, dur * 0.5, { type: 'sine', gain: gain * 0.25, when });
        tone(freq * 3.01, dur * 0.25, { type: 'triangle', gain: gain * 0.08, when });
    }

    // C major pentatonic, step 0 = C5
    const PENTA = [0, 2, 4, 7, 9];
    const pentaFreq = step => 523.25 * Math.pow(2, (PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);

    // ---------- game sounds ----------

    const sfx = {
        // releasing a fruit: a tiny rising "bloop"
        drop() { tone(380, 0.09, { slideTo: 640, gain: 0.09 }); },
        // landing on the pile: soft squishy thud, bigger items a little deeper
        land(tier) {
            tone(190 - tier * 8, 0.13, { slideTo: 80, gain: 0.1 });
            noise(0.07, { type: 'lowpass', freq: 650, gain: 0.05 });
        },
        // merging: juicy bubble pop, lower for bigger fruit
        pop(tier) {
            const f = Math.max(260, 1150 - tier * 75);
            tone(f, 0.16, { slideTo: f * 0.45, gain: 0.26 });
            tone(f * 1.5, 0.06, { slideTo: f * 0.8, gain: 0.06, when: 0.012 });
            noise(0.025, { freq: 3200, q: 2, gain: 0.05 });
        },
        // each step of a combo: a music-box note, one step higher each time
        combo(step) { bell(pentaFreq(Math.min(step, 12)), { gain: 0.13 }); },
        // praise word: a quick sparkly arpeggio
        praise() { [0, 2, 4, 7].forEach((s, i) => bell(pentaFreq(s + 5), { gain: 0.11, dur: 0.7, when: i * 0.07 })); },
        // biggest item made
        maxMerge() { [0, 2, 4, 5, 7, 10].forEach((s, i) => bell(pentaFreq(s + 3), { gain: 0.12, dur: 1.2, when: i * 0.09 })); },
        newBest() { [0, 4, 7, 9].forEach((s, i) => bell(pentaFreq(s), { gain: 0.12, dur: 0.9, when: i * 0.12 })); },
        gameOver() { [7, 4, 2, 0].forEach((s, i) => bell(pentaFreq(s) / 2, { gain: 0.14, dur: 1.1, when: i * 0.28 })); },
        tap() { tone(1400, 0.05, { slideTo: 1000, gain: 0.05 }); }
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

    function setSfx(on) { prefs.sfx = on; savePrefs(); if (sfxBus) sfxBus.gain.value = on ? 0.9 : 0; }
    // next song, and after the last one: off
    function nextMusic() {
        prefs.music = prefs.music + 1 >= SONGS.length ? -1 : prefs.music + 1;
        savePrefs();
        if (prefs.music < 0) Music.stop(); else Music.play();
    }
    const songTitle = () => prefs.music < 0 ? null : SONGS[prefs.music].title;

    return { unlock, play, setSfx, nextMusic, songTitle, prefs: () => ({ ...prefs }) };
})();
