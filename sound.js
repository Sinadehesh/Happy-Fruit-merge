// --- SOUND ---
// Soft, cute "ASMR" sounds and a music-box lullaby, all made in code with Web Audio (no files yet).
// Sound and music can be switched off in the settings; the choice is remembered.

const Sound = (() => {
    const KEY = 'happyFruitMerge.audio';
    let prefs = { sfx: true, music: true };
    try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) {}
    const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };

    let ac = null, sfxBus = null, musicBus = null;

    // Start audio on the first tap (browsers block sound until then)
    function unlock() {
        if (!ac) {
            try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
            const master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
            // a little dreamy echo shared by everything
            const echo = ac.createDelay(); echo.delayTime.value = 0.22;
            const feedback = ac.createGain(); feedback.gain.value = 0.28;
            const wet = ac.createGain(); wet.gain.value = 0.22;
            const soften = ac.createBiquadFilter(); soften.type = 'lowpass'; soften.frequency.value = 2600;
            echo.connect(feedback); feedback.connect(echo); echo.connect(soften); soften.connect(wet); wet.connect(master);
            sfxBus = ac.createGain(); sfxBus.gain.value = prefs.sfx ? 1 : 0;
            musicBus = ac.createGain(); musicBus.gain.value = prefs.music ? 0.5 : 0;
            for (const bus of [sfxBus, musicBus]) { bus.connect(master); bus.connect(echo); }
        }
        if (ac.state === 'suspended') ac.resume();
        if (prefs.music) Music.start();
    }
    document.addEventListener('visibilitychange', () => {
        if (!ac) return;
        if (document.hidden) ac.suspend(); else ac.resume();
    });

    // ---------- building blocks ----------

    function tone(freq, dur, { type = 'sine', gain = 0.2, slideTo = null, attack = 0.005, when = 0, bus = sfxBus } = {}) {
        if (!ac) return;
        const t = ac.currentTime + when;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur * 0.8);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus);
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
    function bell(freq, { gain = 0.16, dur = 0.9, when = 0, bus = sfxBus } = {}) {
        tone(freq, dur, { type: 'sine', gain, when, bus });
        tone(freq * 2, dur * 0.5, { type: 'sine', gain: gain * 0.25, when, bus });
        tone(freq * 3.01, dur * 0.25, { type: 'triangle', gain: gain * 0.08, when, bus });
    }

    // C major pentatonic, step 0 = C5
    const PENTA = [0, 2, 4, 7, 9];
    const pentaFreq = step => 523.25 * Math.pow(2, (PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);
    const midi = m => 440 * Math.pow(2, (m - 69) / 12);

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

    // ---------- music: a slow music-box lullaby (C - Am - F - G), looping ----------

    const Music = (() => {
        const BPM = 78, EIGHTH = 60 / BPM / 2;
        const CHORDS = [[72, 76, 79, 84], [69, 72, 76, 81], [65, 69, 72, 77], [67, 71, 74, 79]];
        const BASS = [48, 45, 41, 43];
        const A = [0, 1, 2, 3, 2, 1, 2, 1], B = [3, 2, 1, 2, 0, -1, 1, -1], END = [0, 1, 2, 3, -1, -1, -1, -1];
        const BARS = [[0, A], [1, A], [2, A], [3, B], [0, A], [1, A], [2, B], [3, END]];
        let timer = null, nextAt = 0, step = 0;

        function schedule() {
            while (nextAt < ac.currentTime + 0.3) {
                const bar = Math.floor(step / 8) % BARS.length, i = step % 8;
                const [chord, pattern] = BARS[bar];
                const when = nextAt - ac.currentTime;
                if (pattern[i] >= 0) bell(midi(CHORDS[chord][pattern[i]]), { gain: 0.07, dur: 1.4, when, bus: musicBus });
                if (i === 0 || i === 4) tone(midi(BASS[chord]), 1.2, { gain: 0.06, when, bus: musicBus, attack: 0.02 });
                nextAt += EIGHTH; step++;
            }
        }
        return {
            start() {
                if (timer || !ac) return;
                nextAt = ac.currentTime + 0.1;
                timer = setInterval(schedule, 60);
            },
            stop() { clearInterval(timer); timer = null; }
        };
    })();

    function play(name, ...args) { if (ac && prefs.sfx && sfx[name]) sfx[name](...args); }

    function setSfx(on) { prefs.sfx = on; savePrefs(); if (sfxBus) sfxBus.gain.value = on ? 1 : 0; }
    function setMusic(on) {
        prefs.music = on; savePrefs();
        if (!ac) return;
        musicBus.gain.value = on ? 0.5 : 0;
        if (on) Music.start(); else Music.stop();
    }

    return { unlock, play, setSfx, setMusic, prefs: () => ({ ...prefs }) };
})();
