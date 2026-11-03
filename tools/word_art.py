# Candy word art for the combo praise words: chunky letters with a little bounce and tilt, jelly gradient,
# bevel, white glossy streaks, darker inner outline, thick chocolate outline with 3D depth.
# Font: Titan One (SIL Open Font License, Google Fonts). Base colour "rainbow" gives every letter its own colour.
# Usage: python3 tools/word_art.py TitanOne.ttf out.png "TEXT" "#35d47f" [stars|sparkles] [letter gap]
import sys, math, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage as nd
font_path, out, text, base = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
deco = sys.argv[5] if len(sys.argv) > 5 else ''
GAP = float(sys.argv[6]) if len(sys.argv) > 6 else 1
SS = 2                       # supersample
FS = 150 * SS
font = ImageFont.truetype(font_path, FS)
hexc = lambda h: np.array([int(h[i:i+2], 16) for i in (1, 3, 5)], float)
RAINBOW = ['#ff5fa8', '#ff9a1f', '#ffd21f', '#4fd36b', '#2fb3ff', '#a35cff']
B = hexc(base if base != 'rainbow' else '#ffd21f')
mix = lambda a, b, t: a * (1 - t) + b * t
light, dark = mix(B, np.array([255, 255, 255.]), 0.45), mix(B, np.array([60, 20, 0.]), 0.35)
choc = hexc('#4a210f')

# lay out letters with a little bounce and tilt
rng = np.random.default_rng(7)
pad = 60 * SS
letters = []
x = pad
for i, ch in enumerate(text):
    bb = font.getbbox(ch)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    im = Image.new('L', (w + 40 * SS, int(FS * 1.4)), 0)
    ImageDraw.Draw(im).text((20 * SS - bb[0], 10 * SS), ch, font=font, fill=255)
    ang = (-5 if i % 2 == 0 else 4) * (0.6 + 0.4 * rng.random()) if ch != '!' else -8
    im = im.rotate(ang, resample=Image.BICUBIC, expand=True)
    dy = (-6 if i % 2 else 5) * SS * (0.5 + 0.5 * rng.random())
    ib = im.getbbox()                      # ink box after rotation
    letters.append((ch, im, x - ib[0] + 20 * SS, dy))
    x += (ib[2] - ib[0]) + GAP * SS
Wd = int(x + pad); Ht = int(FS * 1.4 + 2 * pad)
M = np.zeros((Ht, Wd), float)
boxes = []
for ch, im, lx, dy in letters:
    a = np.asarray(im, float) / 255
    y0 = int(pad + dy - (im.height - FS * 1.4) / 2)
    x0 = int(lx - 20 * SS - (im.width - im.width) / 2)
    hh, ww = a.shape
    M[y0:y0 + hh, x0:x0 + ww] = np.maximum(M[y0:y0 + hh, x0:x0 + ww], a)
    ys, xs = np.nonzero(a > 0.5)
    boxes.append((ch, x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max(), a > 0.5, x0, y0))
inside = M > 0.5
ys, xs = np.nonzero(inside)
top, bot = ys.min(), ys.max()

def dil(m, r):
    yy, xx = np.ogrid[-r:r + 1, -r:r + 1]
    return nd.binary_dilation(m, structure=(xx * xx + yy * yy) <= r * r)

# layers, back to front
img = np.zeros((Ht, Wd, 4), float)
def put(mask, rgb, alpha=1.0):
    a = mask.astype(float) * alpha
    img[..., :3] = img[..., :3] * (1 - a[..., None]) + np.array(rgb)[None, None] * a[..., None]
    img[..., 3] = np.maximum(img[..., 3], a)

outer = dil(inside, 15 * SS)
depth = outer.copy()
for k in range(1, 9 * SS):  # 3D depth below the outline
    depth |= np.roll(outer, k, axis=0)
put(depth, mix(choc, np.zeros(3), 0.35))
put(outer, choc)
if base == 'rainbow':
    for i, (ch, x0, y0, x1, y1, m, ox, oy) in enumerate(boxes):
        lm = np.zeros_like(inside); lm[oy:oy + m.shape[0], ox:ox + m.shape[1]] = m
        put(dil(lm, 6 * SS), mix(hexc(RAINBOW[i % 6]), np.array([40, 10, 0.]), 0.5))
else:
    put(dil(inside, 6 * SS), mix(B, np.array([40, 10, 0.]), 0.5))
# jelly fill: light at the top, base, darker at the bottom
yy = (np.arange(Ht)[:, None] - top) / max(1, bot - top)
g = np.clip(yy, 0, 1)[..., None]
def jelly(c):
    lt, dk = mix(c, np.array([255, 255, 255.]), 0.45), mix(c, np.array([60, 20, 0.]), 0.35)
    return np.where(g < 0.5, mix(lt, c, g / 0.5), mix(c, dk, (g - 0.5) / 0.5))
if base == 'rainbow':
    for i, (ch, x0, y0, x1, y1, m, ox, oy) in enumerate(boxes):
        lm = np.zeros_like(inside); lm[oy:oy + m.shape[0], ox:ox + m.shape[1]] = m
        a = lm.astype(float)
        img[..., :3] = img[..., :3] * (1 - a[..., None]) + jelly(hexc(RAINBOW[i % 6])) * a[..., None]
else:
    a = inside.astype(float)
    img[..., :3] = img[..., :3] * (1 - a[..., None]) + jelly(B) * a[..., None]
# bevel: darker rim along the bottom inside edge, lighter along the top
lower = inside & ~np.roll(inside, -9 * SS, axis=0)
upper = inside & ~np.roll(inside, 7 * SS, axis=0)
put(nd.gaussian_filter(lower.astype(float), 2 * SS) * inside > 0.25, mix(dark, np.array([60, 20, 0.]), 0.3), 0.55)
put(nd.gaussian_filter(upper.astype(float), 2 * SS) * inside > 0.25, mix(light, np.array([255, 255, 255.]), 0.5), 0.6)

core = nd.binary_erosion(inside, iterations=7 * SS)
canvas = Image.new('L', (Wd, Ht), 0)
dr = ImageDraw.Draw(canvas)
# little decorations inside the letters (stars or sparkles), lighter tint
if deco:
    deco_layer = Image.new('L', (Wd, Ht), 0); dd = ImageDraw.Draw(deco_layer)
    for ch, x0, y0, x1, y1, m, ox, oy in boxes:
        for j in range(2 if ch != '!' else 0):
            cx = x0 + (x1 - x0) * (0.3 + 0.4 * rng.random()); cy = y0 + (y1 - y0) * (0.45 + 0.35 * rng.random())
            r = (7 + 4 * rng.random()) * SS
            if deco == 'stars':
                pts = [(cx + (r if k % 2 == 0 else r * 0.45) * math.cos(-math.pi / 2 + k * math.pi / 5),
                        cy + (r if k % 2 == 0 else r * 0.45) * math.sin(-math.pi / 2 + k * math.pi / 5)) for k in range(10)]
            else:  # four-point sparkle
                pts = [(cx + (r * 1.2 if k % 2 == 0 else r * 0.32) * math.cos(k * math.pi / 4),
                        cy + (r * 1.2 if k % 2 == 0 else r * 0.32) * math.sin(k * math.pi / 4)) for k in range(8)]
            star = Image.new('L', (Wd, Ht), 0); ImageDraw.Draw(star).polygon(pts, fill=255)
            sm = np.asarray(star) > 127
            if (sm & ~core).sum() == 0: dd.polygon(pts, fill=255)   # only stars that fit inside the letter
    dm = (np.asarray(deco_layer) > 127) & core
    put(dm, mix(dark, np.array([40, 10, 0.]), 0.15) if deco == 'stars' else mix(light, np.array([255, 255, 255.]), 0.6), 0.8)
# white glossy shine on the upper left of each letter
for ch, x0, y0, x1, y1, m, ox, oy in boxes:
    w, h = x1 - x0, y1 - y0
    if ch == '!':
        dr.ellipse([x0 + w * 0.25, y0 + h * 0.08, x0 + w * 0.6, y0 + h * 0.3], fill=255)
        continue
    # a long glossy streak along the top left, plus a small dot after it
    t = max(9 * SS, h * 0.085)
    p1, p2 = (x0 + w * 0.16, y0 + h * 0.30), (x0 + w * 0.40, y0 + h * 0.13)
    dr.line([p1, p2], fill=255, width=int(t))
    for px, py in (p1, p2): dr.ellipse([px - t / 2, py - t / 2, px + t / 2, py + t / 2], fill=255)
    d = t * 0.75; qx, qy = x0 + w * 0.55, y0 + h * 0.11
    dr.ellipse([qx - d / 2, qy - d / 2, qx + d / 2, qy + d / 2], fill=255)
shine = (np.asarray(canvas) > 127) & nd.binary_erosion(inside, iterations=5 * SS)
put(nd.gaussian_filter(shine.astype(float), 1.2 * SS) > 0.4, (255, 255, 255), 0.92)

im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8) if False else np.dstack([np.clip(img[..., :3], 0, 255), np.clip(img[..., 3] * 255, 0, 255)]).astype(np.uint8), 'RGBA')
bb = im.getbbox(); im = im.crop(bb)
im = im.resize((im.width // SS, im.height // SS), Image.LANCZOS)
im.save(out)
print(out, im.size)
