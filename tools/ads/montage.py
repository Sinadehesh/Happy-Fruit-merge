# a montage ad: the liveliest 2.5 s of every set's capture (by its game sounds), its name on top, one song under
# all of it, and an end card with each set's final gem
import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
D = os.environ.get('ADS_WORK') or os.path.join(HERE, 'work')   # frames, sounds and the finished videos
os.makedirs(D, exist_ok=True)
import sys, os, glob, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONT = os.path.join(HERE, 'TitanOne-Regular.ttf')   # Titan One, SIL Open Font License (TitanOne-OFL.txt)
SETS = [('rocks', 'Rocks & Gems'), ('crystal', 'Crystal Cave'), ('ocean', 'Ocean Jewels'), ('royal', 'Royal Treasury'), ('cosmic', 'Cosmic Gems'), ('volcano', 'Volcano Gems'),
        ('pixel', 'Pixel Treasure'), ('odd', 'Odd Shapes'), ('cyber', 'Cyber Circuit'), ('neon', 'Neon Nights'), ('pets', 'Gem Pets')]
SEG, XF, END = 2.5, 0.25, 3.0
W, H = 1080, 1920
music = f'{REPO}/assets/music/easy_lemon.mp3'
out = f'{D}/ad_all_sets.mp4'
work = f'{D}/montage'; os.makedirs(work, exist_ok=True)
segs = []
for sid, name in SETS:
    cap = f'{D}/cap_{sid}'
    if not os.path.exists(f'{cap}/sfx.wav'): continue
    w = wave.open(f'{cap}/sfx.wav'); sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
    e = (a ** 2).mean(axis=1)
    n = int(SEG * sr); c = np.concatenate([[0], np.cumsum(e)])
    best, bt = -1, 0.5
    for t in np.arange(0.5, len(a) / sr - SEG - 0.3, 0.1):
        i = int(t * sr); v = c[i + n] - c[i]
        if v > best: best, bt = v, t
    # its name, in a pill near the top of the jar
    lab = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lab)
    f = ImageFont.truetype(FONT, 66); tw = d.textlength(name.upper(), font=f)
    x0 = (W - tw) / 2 - 44; y0 = 330
    d.rounded_rectangle([x0, y0, x0 + tw + 88, y0 + 112], radius=56, fill=(30, 14, 70, 190))
    d.text((x0 + 44, y0 + 18), name.upper(), font=f, fill=(255, 230, 120), stroke_width=5, stroke_fill=(60, 25, 110))
    lab.save(f'{work}/label_{sid}.png')
    segs.append((sid, name, round(float(bt), 2)))
print('segments', segs)
# end card: the final gem of every set
first = Image.open(sorted(glob.glob(f'{D}/cap_rocks/f*.jpg'))[0]).convert('RGB')
top, bot = first.getpixel((W // 2, 8)), first.getpixel((W // 2, H - 8))
card = Image.new('RGB', (W, H)); d = ImageDraw.Draw(card)
for y in range(H):
    k = y / (H - 1); d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3)))
glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse([60, 700, W - 60, 1300], fill=120)
card.paste(Image.new('RGB', (W, H), (255, 236, 255)), (0, 0), glow.filter(ImageFilter.GaussianBlur(120)))
logo = Image.open(f'{REPO}/assets/fx/logo_gemjar.png').convert('RGBA'); lw = 860
logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS); card.paste(logo, ((W - lw) // 2, 210), logo)
def text(y, s, size, fill=(255, 255, 255), stroke=(60, 30, 120), sw=6):
    f = ImageFont.truetype(FONT, size); d.text(((W - d.textlength(s, font=f)) / 2, y), s, font=f, fill=fill, stroke_width=sw, stroke_fill=stroke)
text(500, 'Merge alike gems.', 64); text(580, 'Collect every set!', 64)
for i, (sid, name, _) in enumerate(segs):
    src = sorted(glob.glob(f'{REPO}/assets/{sid}/[01]*.png'))[11]
    g = Image.open(src).convert('RGBA').resize((150, 150), Image.LANCZOS)
    per = 6 if len(segs) > 10 else 5
    row = segs[(i // per) * per:(i // per + 1) * per]
    cx = W // 2 + ((i % per) - (len(row) - 1) / 2) * (174 if per == 6 else 200); cy = 860 + (i // per) * 230
    card.paste(g, (int(cx - 75), int(cy - 75)), g)
text(1300, '11 GEM SETS', 70, fill=(255, 228, 120)); text(1390, '20 Gem Mine stages, daily gifts', 44)
bx0, by0, bx1, by1 = 170, 1560, W - 170, 1695
d.rounded_rectangle([bx0, by0 + 10, bx1, by1 + 10], radius=68, fill=(40, 110, 30)); d.rounded_rectangle([bx0, by0, bx1, by1], radius=68, fill=(124, 194, 66))
d.rounded_rectangle([bx0 + 14, by0 + 10, bx1 - 14, by0 + 52], radius=30, fill=(160, 222, 104))
f = ImageFont.truetype(FONT, 60); s = 'PLAY FREE'; d.text(((W - d.textlength(s, font=f)) / 2, by0 + 30), s, font=f, fill=(255, 255, 255), stroke_width=5, stroke_fill=(40, 110, 30))
f = ImageFont.truetype(FONT, 34); s = 'on Google Play'; d.text(((W - d.textlength(s, font=f)) / 2, by1 + 34), s, font=f, fill=(255, 255, 255), stroke_width=4, stroke_fill=(60, 30, 120))
f = ImageFont.truetype(FONT, 22); s = 'Music: "Easy Lemon" Kevin MacLeod (incompetech.com), CC BY 4.0'
d.text(((W - d.textlength(s, font=f)) / 2, H - 52), s, font=f, fill=(225, 215, 255))
card.save(f'{work}/endcard.png')
# the video: each segment from its frames, with its label; crossfades; the end card
inputs, fc, k = [], [], 0
for sid, name, t in segs:
    f0 = int(t * 30) + 1
    inputs += ['-framerate', '30', '-start_number', str(f0), '-i', f'{D}/cap_{sid}/f%05d.jpg', '-loop', '1', '-i', f'{work}/label_{sid}.png']
    fc.append(f'[{k}:v]trim=duration={SEG},setpts=PTS-STARTPTS,format=rgba[b{k}];[{k + 1}:v]trim=duration={SEG},format=rgba,fade=t=in:st=0:d=0.2:alpha=1[l{k}];'
              f'[b{k}][l{k}]overlay=0:0,format=yuv420p,fps=30[s{k}]')
    k += 2
inputs += ['-loop', '1', '-t', str(END), '-i', f'{work}/endcard.png']; endi = k; k += 1
fc.append(f'[{endi}:v]fps=30,format=yuv420p,trim=duration={END}[end]')
# chain the crossfades
prev, off = 's0', SEG - XF
for i in range(1, len(segs)):
    fc.append(f'[{prev}][s{2 * i}]xfade=transition=fade:duration={XF}:offset={off:.3f}[x{i}]'); prev = f'x{i}'; off += SEG - XF
fc.append(f'[{prev}][end]xfade=transition=fade:duration=0.4:offset={off:.3f}[v]')
total = off + END
# audio: each segment's game sounds, one after another (slightly overlapped like the picture), and the song
sr = 44100; mix = np.zeros(int((total + 1) * sr), dtype=np.float32)
pos = 0.0
for sid, name, t in segs:
    w = wave.open(f'{D}/cap_{sid}/sfx.wav'); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32).mean(axis=1) / 32768
    seg = a[int(t * sr): int((t + SEG) * sr)].copy(); ramp = int(0.05 * sr); seg[:ramp] *= np.linspace(0, 1, ramp); seg[-ramp:] *= np.linspace(1, 0, ramp)
    i = int(pos * sr); mix[i:i + len(seg)] += seg[:len(mix) - i]; pos += SEG - XF
mix = np.clip(mix, -1, 1)
ww = wave.open(f'{work}/sfx.wav', 'wb'); ww.setnchannels(1); ww.setsampwidth(2); ww.setframerate(sr); ww.writeframes((mix * 32767).astype(np.int16).tobytes()); ww.close()
inputs += ['-i', f'{work}/sfx.wav', '-i', music]
ai, mi = endi + 1, endi + 2
fc.append(f'[{ai}:a]aresample=44100,atrim=duration={total:.3f},alimiter=limit=0.89:level=false[s];'
          f'[{mi}:a]aresample=44100,atrim=duration={total:.3f},asetpts=N/SR/TB,volume=0.32,afade=t=in:d=0.5,afade=t=out:st={total - 1.4:.3f}:d=1.4[m];'
          f'[s][m]amix=inputs=2:duration=longest:normalize=0,atrim=duration={total:.3f},loudnorm=I=-15:TP=-1.5:LRA=11[a]')
cmd = ['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '[a]',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '160k', '-t', f'{total:.3f}', out]
subprocess.run(cmd, check=True)
print(out, f'{total:.1f} s', f'{os.path.getsize(out) / 1e6:.1f} MB')
