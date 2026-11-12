# Gem Jar ad: the captured gameplay (frames + game sounds), the music under it, and an end card with the set's gems.
#   python3 make_ad.py <capture dir> <set id> <set name> <out.mp4> [music file] [music start s]
import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
D = os.environ.get('ADS_WORK') or os.path.join(HERE, 'work')   # frames, sounds and the finished videos
os.makedirs(D, exist_ok=True)
import sys, os, subprocess, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter
cap, set_id, set_name, out = sys.argv[1:5]
music = sys.argv[5] if len(sys.argv) > 5 else f'{REPO}/assets/music/carefree.mp3'
mstart = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
FONT = os.path.join(HERE, 'TitanOne-Regular.ttf')   # Titan One, SIL Open Font License (TitanOne-OFL.txt)
W, H = 1080, 1920
frames = sorted(glob.glob(f'{cap}/f*.jpg'))
play = len(frames) / 30
END = 3.0; XF = 0.4; total = play + END - XF
song = os.path.basename(music).rsplit('.', 1)[0]
TITLES = {'carefree': 'Carefree', 'easy_lemon': 'Easy Lemon', 'wallpaper': 'Wallpaper', 'monkeys_spinning_monkeys': 'Monkeys Spinning Monkeys'}

# ---------- the end card ----------
first = Image.open(frames[0]).convert('RGB')
top, bot = first.getpixel((W // 2, 8)), first.getpixel((W // 2, H - 8))
card = Image.new('RGB', (W, H))
d = ImageDraw.Draw(card)
for y in range(H):
    k = y / (H - 1)
    d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3)))
# a soft light behind the gems
glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse([90, 640, W - 90, 1330], fill=120)
card.paste(Image.new('RGB', (W, H), (255, 236, 255)), (0, 0), glow.filter(ImageFilter.GaussianBlur(120)))
logo = Image.open(f'{REPO}/assets/fx/logo_gemjar.png').convert('RGBA')
lw = 860; logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
card.paste(logo, ((W - lw) // 2, 210), logo)
def text(y, s, size, fill=(255, 255, 255), stroke=(60, 30, 120), sw=6):
    f = ImageFont.truetype(FONT, size)
    w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=fill, stroke_width=sw, stroke_fill=stroke)
text(500, 'Merge 2 alike gems,', 64)
text(580, 'make a bigger one!', 64)
# the set's 12 gems, 4 x 3, growing a little
sprites = sorted(glob.glob(f'{REPO}/assets/{set_id}/[01]*.png'))[:12]
for i, src in enumerate(sprites):
    g = Image.open(src).convert('RGBA')
    sz = 170 + i * 4
    g = g.resize((sz, sz), Image.LANCZOS)
    cx = 180 + (i % 4) * 240; cy = 790 + (i // 4) * 215
    card.paste(g, (cx - sz // 2, cy - sz // 2), g)
text(1440, set_name.upper(), 58, fill=(255, 228, 120))
text(1510, '+ 10 more gem sets to collect', 44)
# the button
bx0, by0, bx1, by1 = 170, 1610, W - 170, 1745
d.rounded_rectangle([bx0, by0 + 10, bx1, by1 + 10], radius=68, fill=(40, 110, 30))
d.rounded_rectangle([bx0, by0, bx1, by1], radius=68, fill=(124, 194, 66))
d.rounded_rectangle([bx0 + 14, by0 + 10, bx1 - 14, by0 + 52], radius=30, fill=(160, 222, 104))
f = ImageFont.truetype(FONT, 60); s = 'PLAY FREE'
d.text(((W - d.textlength(s, font=f)) / 2, by0 + 30), s, font=f, fill=(255, 255, 255), stroke_width=5, stroke_fill=(40, 110, 30))
f = ImageFont.truetype(FONT, 34); s = 'on Google Play'
d.text(((W - d.textlength(s, font=f)) / 2, by1 + 34), s, font=f, fill=(255, 255, 255), stroke_width=4, stroke_fill=(60, 30, 120))
f = ImageFont.truetype(FONT, 22); s = f'Music: "{TITLES.get(song, song)}" Kevin MacLeod (incompetech.com), CC BY 4.0'
d.text(((W - d.textlength(s, font=f)) / 2, H - 52), s, font=f, fill=(225, 215, 255))
card_path = f'{cap}/endcard.png'
card.save(card_path)

# ---------- the video ----------
fc = (f"[0:v]fps=30,format=yuv420p[g];[1:v]fps=30,format=yuv420p,trim=duration={END}[e];"
      f"[g][e]xfade=transition=fade:duration={XF}:offset={play - XF:.3f}[v];"
      f"[2:a]aresample=44100,apad=whole_dur={total:.3f},alimiter=limit=0.89:level=false[s];"
      f"[3:a]aresample=44100,atrim=start={mstart}:duration={total:.3f},asetpts=N/SR/TB,volume=0.30,afade=t=in:d=0.6,afade=t=out:st={total - 1.4:.3f}:d=1.4[m];"
      f"[s][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=11[a]")
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{cap}/f%05d.jpg', '-loop', '1', '-t', str(END), '-i', card_path,
       '-i', f'{cap}/sfx.wav', '-i', music, '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
       '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-t', f'{total:.3f}', out]
subprocess.run(cmd, check=True)
print(out, f'{total:.1f} s', f'{os.path.getsize(out) / 1e6:.1f} MB')
