// From the gameplay film (film.js final) and the brand pieces (brand.js), with ffmpeg:
//   android/build-bomber/media/zombie-bomber-ad-15s.mp4   1080 x 1920: three stretches of the film and the end card
//                                                         ("PLAY FREE": for ads, not for the store page)
//   android/build-bomber/media/zombie-bomber-16x9.mp4     1920 x 1080: the whole film in the middle of a blurred copy
//                                                         of itself, the side panels on top (fits the store page)
//   node tools/bomber_media/cuts.js [cut points in seconds, default 0-5.2,6.55-11,15.25-end]
// The cut points fit the film as it plays today: after the game changes, check them against a preview.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { OUT } = require('./page');
const { ff, measure, normalize } = require('./film');
const M = path.join(OUT, 'zombie-bomber-gameplay.mp4'), B = path.join(OUT, 'brand'), T = path.join(OUT, 'cuts');
const FPS = 60;
const duration = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();

fs.mkdirSync(T, { recursive: true });
const end = duration(M);
const cuts = (process.argv[2] || '0-5.2,6.55-11,15.25-end').split(',').map(s => s.split('-').map(v => v === 'end' ? end : +v));
// ---- the end card: the film's last frame dissolves into a blurred, darker one, the card drawn over it
ff(['-sseof', '-0.04', '-i', M, '-frames:v', '1', '-update', '1', path.join(T, 'last.png')]);
ff(['-loop', '1', '-framerate', String(FPS), '-t', '1.8', '-i', path.join(T, 'last.png'),
    '-loop', '1', '-framerate', String(FPS), '-t', '1.8', '-i', path.join(T, 'last.png'),
    '-framerate', String(FPS), '-i', path.join(B, 'end', 'e%03d.png'), '-i', path.join(B, 'end_sound.wav'),
    '-filter_complex', '[0:v]gblur=sigma=30,format=rgb24,colorchannelmixer=rr=0.5:gg=0.5:bb=0.5[bg];[1:v]format=rgba,fade=t=out:st=0:d=0.3:alpha=1[sharp];[bg][sharp]overlay=0:0[b2];[b2][2:v]overlay=0:0:format=auto,format=yuv420p,setsar=1[v]',
    '-map', '[v]', '-map', '3:a', '-t', '1.8', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', path.join(T, 'endcard.mkv')]);
// ---- the ad: the stretches (short sound fades at each cut), then the end card; then its sound to -14 LUFS
let fc = '', ins = '';
cuts.forEach(([a, b], i) => {
    const d = b - a;
    fc += `[0:v]trim=start_frame=${Math.round(a * FPS)}:end_frame=${Math.round(b * FPS)},setpts=PTS-STARTPTS[v${i}];`;
    fc += `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${(d - 0.03).toFixed(3)}:d=0.03[a${i}];`;
    ins += `[v${i}][a${i}]`;
});
const n = cuts.length;
fc += `[1:v]setpts=PTS-STARTPTS[v${n}];[1:a]asetpts=PTS-STARTPTS,afade=t=in:d=0.02[a${n}];${ins}[v${n}][a${n}]concat=n=${n + 1}:v=1:a=1[v][a]`;
ff(['-i', M, '-i', path.join(T, 'endcard.mkv'), '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-ar', '48000', path.join(T, 'ad_raw.mkv')]);
ff(['-i', path.join(T, 'ad_raw.mkv'), '-vn', path.join(T, 'ad_sound.wav')]);
normalize(path.join(T, 'ad_sound.wav'), path.join(T, 'ad_sound_norm.wav'));
const ad = path.join(OUT, 'zombie-bomber-ad-15s.mp4');
ff(['-i', path.join(T, 'ad_raw.mkv'), '-i', path.join(T, 'ad_sound_norm.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', ad]);
// ---- 16:9: the film in the middle, a blurred copy behind it, the side panels on top
const wide = path.join(OUT, 'zombie-bomber-16x9.mp4');
ff(['-i', M, '-loop', '1', '-i', path.join(B, 'side_panels.png'), '-filter_complex',
    '[0:v]split[a][b];[a]scale=1920:-2,crop=1920:1080:0:300,gblur=sigma=36,format=rgb24,colorchannelmixer=rr=0.42:gg=0.42:bb=0.48[bg];[b]scale=-2:1080[game];[bg][game]overlay=(W-w)/2:0[c];[c][1:v]overlay=0:0:shortest=1:format=auto,format=yuv420p,setsar=1[v]',
    '-map', '[v]', '-map', '0:a', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', wide]);
for (const f of [ad, wide]) { const j = measure(f); console.log(`${path.relative(process.cwd(), f)}: ${duration(f).toFixed(2)} s, sound ${j.input_i} LUFS, peak ${j.input_tp} dB`); }
