# Stand-in art for Gem Mine (assets/mine), drawn in code: the wood strip for shelves and posts and the peg
# (until their real art is redone), and the template sheets that show where each piece of art goes.
# The crates, the pickaxe icon, the stage buttons, the lantern and the map are real art now (tools/cut_mine_art.py).
# Candy style: warm glossy wood, chocolate outline.
#   python3 tools/make_mine_art.py
import math, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'mine'
OUT.mkdir(parents=True, exist_ok=True)
SS = 4                                   # draw 4x bigger, then shrink: smooth edges
CHOC = (74, 33, 15, 255)

def hexc(h, a=255):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)

def shrink(im, size):
    return im.resize((size, size) if isinstance(size, int) else size, Image.LANCZOS)

def rrect(d, box, r, fill, outline=None, width=0):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)

def gloss(im, box, r, alpha=110):
    """a soft white streak along the top-left of a box"""
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    rrect(d, (x0, y0, x0 + (x1 - x0) * 0.55, y0 + (y1 - y0) * 0.16), r, (255, 255, 255, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(3 * SS))
    im.alpha_composite(layer)

def nail(d, cx, cy, r):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(96, 80, 92, 255), outline=CHOC, width=max(2, r // 3))
    d.ellipse((cx - r * 0.45, cy - r * 0.55, cx + r * 0.05, cy - r * 0.05), fill=(255, 255, 255, 200))

def crate(kind):
    N = 128 * SS
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    o = 5 * SS                                  # margin
    R = 18 * SS
    ow = 6 * SS                                 # chocolate outline
    frame, plank, plank2, groove = hexc('#d9893a'), hexc('#f3b65f'), hexc('#ecaa52'), hexc('#a85a22')
    # outline + frame
    rrect(d, (o, o, N - o, N - o), R, CHOC)
    rrect(d, (o + ow, o + ow, N - o - ow, N - o - ow), R - ow, frame)
    # inner panel with 3 planks
    f = 20 * SS
    ix0, iy0, ix1, iy1 = o + ow + f, o + ow + f, N - o - ow - f, N - o - ow - f
    rrect(d, (ix0 - 3 * SS, iy0 - 3 * SS, ix1 + 3 * SS, iy1 + 3 * SS), 6 * SS, groove)
    ph = (iy1 - iy0) / 3
    for k in range(3):
        y0 = iy0 + k * ph + (2 * SS if k else 0)
        rrect(d, (ix0, y0, ix1, iy0 + (k + 1) * ph - (2 * SS if k < 2 else 0)), 4 * SS, plank if k % 2 == 0 else plank2)
        # wood grain
        for g in range(3):
            gy = y0 + ph * (0.3 + 0.22 * g)
            pts = [(x, gy + math.sin(x / (14 * SS) + k * 2 + g) * 1.6 * SS) for x in np.linspace(ix0 + 6 * SS, ix1 - 6 * SS, 30)]
            d.line(pts, fill=hexc('#d48f3f', 150), width=int(1.4 * SS))
    # diagonal brace, bottom-left to top-right
    bw = 15 * SS
    a = math.atan2(-(iy1 - iy0), ix1 - ix0)
    cx, cy, L = (ix0 + ix1) / 2, (iy0 + iy1) / 2, math.hypot(ix1 - ix0, iy1 - iy0) + 8 * SS
    def rot(px, py):
        return (cx + px * math.cos(a) - py * math.sin(a), cy + px * math.sin(a) + py * math.cos(a))
    for w, col in ((bw / 2 + 3 * SS, CHOC), (bw / 2, frame)):
        d.polygon([rot(-L / 2, -w), rot(L / 2, -w), rot(L / 2, w), rot(-L / 2, w)], fill=col)
    # highlight on the brace
    d.line([rot(-L / 2 + 6 * SS, -bw / 2 + 3 * SS), rot(L / 2 - 6 * SS, -bw / 2 + 3 * SS)], fill=(255, 230, 180, 160), width=2 * SS)
    # the frame drawn again over the brace ends, so it looks nailed inside
    for side in ((o + ow, o + ow, N - o - ow, o + ow + f), (o + ow, N - o - ow - f, N - o - ow, N - o - ow),
                 (o + ow, o + ow, o + ow + f, N - o - ow), (N - o - ow - f, o + ow, N - o - ow, N - o - ow)):
        pass
    if kind == 'strong':
        steel, steel_d = hexc('#c3cfe0'), hexc('#7d8aa3')
        # steel corner brackets and a band across the middle, with rivets
        L2 = 34 * SS
        for (x, y, sx, sy) in ((o, o, 1, 1), (N - o, o, -1, 1), (o, N - o, 1, -1), (N - o, N - o, -1, -1)):
            poly = [(x, y), (x + sx * L2, y), (x + sx * L2, y + sy * 13 * SS), (x + sx * 13 * SS, y + sy * 13 * SS), (x + sx * 13 * SS, y + sy * L2), (x, y + sy * L2)]
            d.polygon(poly, fill=steel, outline=CHOC, width=int(2.5 * SS))
        by = N / 2
        d.rounded_rectangle((o + ow - 2 * SS, by - 9 * SS, N - o - ow + 2 * SS, by + 9 * SS), 4 * SS, fill=steel, outline=CHOC, width=int(2.5 * SS))
        d.line([(o + ow + 4 * SS, by - 5 * SS), (N - o - ow - 4 * SS, by - 5 * SS)], fill=(255, 255, 255, 150), width=2 * SS)
        for rx in np.linspace(o + 26 * SS, N - o - 26 * SS, 4):
            d.ellipse((rx - 3.5 * SS, by - 3.5 * SS, rx + 3.5 * SS, by + 3.5 * SS), fill=steel_d, outline=CHOC, width=SS)
        for (x, y) in ((o + 9 * SS, o + 9 * SS), (N - o - 9 * SS, o + 9 * SS), (o + 9 * SS, N - o - 9 * SS), (N - o - 9 * SS, N - o - 9 * SS)):
            nail(d, x, y, int(4 * SS))
    else:
        for (x, y) in ((o + ow + f / 2, o + ow + f / 2), (N - o - ow - f / 2, o + ow + f / 2), (o + ow + f / 2, N - o - ow - f / 2), (N - o - ow - f / 2, N - o - ow - f / 2)):
            nail(d, x, y, int(4.5 * SS))
    if kind == 'cracked':
        rng = np.random.default_rng(3)
        # a chipped-off corner and jagged cracks running in from the edges
        chip = [(N - o - ow - 2 * SS, o + 30 * SS), (N - o - 24 * SS, o + 36 * SS), (N - o - 30 * SS, o + 22 * SS), (N - o - 16 * SS, o + ow + 2 * SS), (N - o - ow - 2 * SS, o + ow + 2 * SS)]
        d.polygon(chip, fill=hexc('#7a4018'), outline=CHOC, width=int(2.5 * SS))
        for (sx, sy, ang, ln) in ((o + 14 * SS, N * 0.38, 0.25, 60), (N * 0.62, N - o - 10 * SS, -1.9, 55), (N * 0.36, o + 12 * SS, 1.35, 48)):
            pts, x, y = [(sx, sy)], sx, sy
            for k in range(6):
                ang += rng.uniform(-0.6, 0.6)
                step = ln * SS / 6
                x += math.cos(ang) * step; y += math.sin(ang) * step
                pts.append((x, y))
            d.line(pts, fill=CHOC, width=int(3.2 * SS), joint='curve')
            d.line([(px + 1.5 * SS, py + 1.5 * SS) for px, py in pts], fill=(255, 220, 170, 110), width=int(1.2 * SS))
    # soft shade toward the bottom, gloss on top
    shade = Image.new('RGBA', im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for k in range(40):
        y = N * 0.55 + k * N * 0.4 / 40
        sd.line([(o, y), (N - o, y)], fill=(80, 30, 0, int(k * 1.4)), width=int(N * 0.4 / 40) + 1)
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((o + ow, o + ow, N - o - ow, N - o - ow), R - ow, fill=255)
    im.paste(Image.alpha_composite(im, shade), (0, 0), mask)
    gloss(im, (o + ow + 6 * SS, o + ow + 4 * SS, N - o - ow - 6 * SS, N - o - ow), 8 * SS, 120)
    return shrink(im, 128)

def wood_strip():
    """tileable wood for shelves, posts and slopes: 256 x 48, the grain repeats every 256 px"""
    W, H = 256 * SS, 48 * SS
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    px = np.zeros((H, W, 4), np.uint8)
    top, bot = np.array(hexc('#f6c172')), np.array(hexc('#c97a33'))
    for y in range(H):
        t = y / (H - 1)
        px[y, :, :] = (top * (1 - t) + bot * t).astype(np.uint8)
    im = Image.fromarray(px, 'RGBA')
    d = ImageDraw.Draw(im)
    for g in range(6):
        base = H * (0.18 + 0.13 * g)
        amp = (1.5 + g % 3) * SS
        pts = [(x, base + amp * math.sin(2 * math.pi * x / W * (1 + g % 2) + g)) for x in np.linspace(0, W, 120)]
        d.line(pts, fill=hexc('#b8692a', 120), width=int(1.6 * SS))
    for kx in (0.23, 0.71):                    # two knots
        cx, cy = W * kx, H * 0.55
        d.ellipse((cx - 7 * SS, cy - 4 * SS, cx + 7 * SS, cy + 4 * SS), outline=hexc('#a85a22', 170), width=int(1.6 * SS))
    return im.resize((256, 48), Image.LANCZOS)

def peg():
    N = 96 * SS
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    o = 6 * SS
    d.ellipse((o, o, N - o, N - o), fill=CHOC)
    inner = (o + 6 * SS, o + 6 * SS, N - o - 6 * SS, N - o - 6 * SS)
    # glossy amethyst knob: lighter in the middle, darker at the rim
    for k in range(30, 0, -1):
        t = k / 30
        c = np.array(hexc('#6a3fc8')) * t + np.array(hexc('#c9a2ff')) * (1 - t)
        r = (inner[2] - inner[0]) / 2 * t
        cx, cy = N / 2 - (1 - t) * 6 * SS, N / 2 - (1 - t) * 8 * SS
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=tuple(int(v) for v in c[:3]) + (255,))
    d.ellipse((N * 0.3, N * 0.24, N * 0.52, N * 0.4), fill=(255, 255, 255, 210))
    d.ellipse((N * 0.6, N * 0.62, N * 0.66, N * 0.68), fill=(255, 255, 255, 140))
    return shrink(im, 96)

def pickaxe():
    """drawn upright (handle down the middle, an arched steel head on top), then tilted 45 degrees"""
    N = 128 * SS
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, w = N / 2, N * 0.06
    # wooden handle
    d.rounded_rectangle((cx - w - 4 * SS, N * 0.22, cx + w + 4 * SS, N * 0.97), w, fill=CHOC)
    d.rounded_rectangle((cx - w, N * 0.24, cx + w, N * 0.95), w - 4 * SS, fill=hexc('#d98a3c'))
    d.line([(cx - w * 0.45, N * 0.32), (cx - w * 0.45, N * 0.9)], fill=(255, 225, 170, 210), width=3 * SS)
    for y in (N * 0.62, N * 0.74):   # grip bands
        d.line([(cx - w, y), (cx + w, y)], fill=hexc('#9c5420'), width=3 * SS)
    # the head: an arch with pointed ends
    def arch(k_out, k_in):
        top, bottom = [], []
        for i in range(61):
            t = -1 + 2 * i / 60
            x = cx + t * N * 0.43 * k_out
            y = N * 0.17 + t * t * N * 0.17
            th = (1 - abs(t) ** 1.8) * N * 0.105 * k_in + N * 0.006
            top.append((x, y - th * 0.35))
            bottom.append((x, y + th * 0.65))
        return top + bottom[::-1]
    d.polygon(arch(1.0, 1.0), fill=CHOC)
    inner = [(x, y) for x, y in arch(0.95, 0.78)]
    d.polygon(inner, fill=hexc('#c9d3e3'))
    d.line([(cx + t * N * 0.36, N * 0.15 + t * t * N * 0.15) for t in np.linspace(-0.85, 0.85, 40)], fill=(255, 255, 255, 230), width=3 * SS)
    # a pink gem set in the middle of the head
    gy = N * 0.19
    d.ellipse((cx - 10 * SS, gy - 10 * SS, cx + 10 * SS, gy + 10 * SS), fill=hexc('#ff5fa8'), outline=CHOC, width=2 * SS)
    d.ellipse((cx - 6 * SS, gy - 7 * SS, cx - 1 * SS, gy - 2 * SS), fill=(255, 255, 255, 230))
    im = im.rotate(-40, resample=Image.BICUBIC, center=(cx, N * 0.55))
    return shrink(im, 128)

def stage_button(kind):
    """the map's stage buttons (drawn in the page itself; this is for the template): open, current, locked, boss"""
    N = 160 * SS
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cols = {'open': ('#ffe8a3', '#f2a93b', '#c46f1a'), 'current': ('#d4ffc7', '#4fd66a', '#1f9a3b'),
            'locked': ('#c2bad3', '#7d7394', '#514a63'), 'boss': ('#ffb3c7', '#ff3d6e', '#b0123f')}[kind]
    o = 18 * SS if kind != 'boss' else 8 * SS
    top = o + (22 * SS if kind == 'boss' else 0)
    side = (top - o) / 2   # the boss's crown takes room at the top: keep the button round
    box = (o + side, top, N - o - side, N - o)
    d.ellipse(box, fill=CHOC)
    rim = 7 * SS
    if kind == 'boss':
        d.ellipse((box[0] + rim, box[1] + rim, box[2] - rim, box[3] - rim), fill=hexc('#f7b62c'))
        rim += 6 * SS
    inner = (box[0] + rim, box[1] + rim, box[2] - rim, box[3] - rim)
    c0, c1, c2 = (np.array(hexc(c)[:3], float) for c in cols)
    for k in range(40, 0, -1):
        t = k / 40
        c = c1 * (1 - t) + c2 * t if t > 0.55 else c0 * (1 - t / 0.55) + c1 * (t / 0.55)
        r = (inner[2] - inner[0]) / 2 * t
        cx = (inner[0] + inner[2]) / 2 - (1 - t) * 10 * SS
        cy = (inner[1] + inner[3]) / 2 - (1 - t) * 12 * SS
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=tuple(int(v) for v in c) + (255,))
    gloss_layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss_layer)
    w = inner[2] - inner[0]
    gd.ellipse((inner[0] + w * 0.16, inner[1] + w * 0.1, inner[0] + w * 0.5, inner[1] + w * 0.3), fill=(255, 255, 255, 200))
    im.alpha_composite(gloss_layer.filter(ImageFilter.GaussianBlur(2 * SS)))
    if kind == 'locked':   # a small golden padlock at the bottom
        cx, by = N / 2, box[3] - 6 * SS
        d.arc((cx - 13 * SS, by - 44 * SS, cx + 13 * SS, by - 14 * SS), 180, 360, fill=CHOC, width=8 * SS)
        d.arc((cx - 13 * SS, by - 44 * SS, cx + 13 * SS, by - 14 * SS), 180, 360, fill=hexc('#ffd36b'), width=4 * SS)
        d.rounded_rectangle((cx - 20 * SS, by - 30 * SS, cx + 20 * SS, by + 4 * SS), 7 * SS, fill=hexc('#f7b62c'), outline=CHOC, width=3 * SS)
        d.ellipse((cx - 4 * SS, by - 18 * SS, cx + 4 * SS, by - 10 * SS), fill=CHOC)
    if kind == 'boss':     # a golden crown on top
        cx, cy = N / 2, top + 4 * SS
        crown = [(cx - 34 * SS, cy + 6 * SS), (cx - 38 * SS, cy - 26 * SS), (cx - 16 * SS, cy - 8 * SS), (cx, cy - 34 * SS),
                 (cx + 16 * SS, cy - 8 * SS), (cx + 38 * SS, cy - 26 * SS), (cx + 34 * SS, cy + 6 * SS)]
        d.polygon(crown, fill=hexc('#f7b62c'), outline=CHOC, width=3 * SS)
        for (x, y) in ((cx - 38 * SS, cy - 26 * SS), (cx, cy - 34 * SS), (cx + 38 * SS, cy - 26 * SS)):
            d.ellipse((x - 6 * SS, y - 6 * SS, x + 6 * SS, y + 6 * SS), fill=hexc('#ffe08a'), outline=CHOC, width=2 * SS)
    return shrink(im, 160)

def save(im, name):
    im.save(OUT / name)
    print('wrote', (OUT / name).relative_to(ROOT), im.size)

# the crates, the pickaxe icon, the stage buttons, the lantern and the map art now come from the real art
# (tools/cut_mine_art.py); the plank and the peg are still drawn here until their art is redone
save(wood_strip(), 'beam.png')
save(peg(), 'peg.png')

# ---------- template sheets: what to make, where each piece goes ----------
def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        if pathlib.Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()

def sheet(name, title, cells, cols, cell=(420, 420)):
    rows = math.ceil(len(cells) / cols)
    W, H = cols * cell[0], rows * (cell[1] + 70) + 90
    im = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    head, _, sub = title.partition(' (')
    d.text((24, 14), head, fill=(60, 40, 30), font=font(32))
    if sub: d.text((24, 54), sub.rstrip(')'), fill=(120, 90, 70), font=font(20))
    for i, (label, art, size) in enumerate(cells):
        cx, cy = (i % cols) * cell[0], 90 + (i // cols) * (cell[1] + 70)
        d.rectangle((cx + 10, cy, cx + cell[0] - 10, cy + cell[1]), outline=(200, 200, 210), width=3)
        if art is not None:
            a = art.copy()
            a.thumbnail(size, Image.LANCZOS)
            im.alpha_composite(a, (cx + (cell[0] - a.width) // 2, cy + (cell[1] - a.height) // 2))
        d.text((cx + 20, cy + cell[1] + 12), f'{i + 1}. {label}', fill=(60, 40, 30), font=font(24))
    (OUT / 'sheets').mkdir(exist_ok=True)
    im.convert('RGB').save(OUT / 'sheets' / name, quality=92)
    print('wrote', (OUT / 'sheets' / name).relative_to(ROOT), im.size)

big = lambda im, s: im.resize((s, s) if im.width == im.height else (s, int(s * im.height / im.width)), Image.LANCZOS)
sheet('sheet1_crates.jpg', 'Sheet 1: crates (each on its own, plain white background)', [
    ('Crate', big(crate('plain'), 360), (360, 360)),
    ('Strong crate', big(crate('strong'), 360), (360, 360)),
    ('Cracked crate', big(crate('cracked'), 360), (360, 360)),
    ('6 splinters', None, (360, 360)),
], cols=2)
sheet('sheet2_jar_parts.jpg', 'Sheet 2: jar parts and icons (plain white background)', [
    ('Plank (repeats)', big(wood_strip(), 360), (360, 90)),
    ('Peg', big(peg(), 300), (300, 300)),
    ('Pickaxe icon', big(pickaxe(), 330), (330, 330)),
    ('Mine lantern', None, (300, 300)),
], cols=2)
sheet('sheet3_stage_buttons.jpg', 'Sheet 3: stage buttons for the map (no numbers on them)', [
    ('Open stage', big(stage_button('open'), 300), (300, 300)),
    ('Current stage', big(stage_button('current'), 300), (300, 300)),
    ('Locked stage', big(stage_button('locked'), 300), (300, 300)),
    ('Boss stage', big(stage_button('boss'), 300), (300, 300)),
], cols=2)
