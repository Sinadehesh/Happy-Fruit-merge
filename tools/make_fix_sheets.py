# Template sheets for the art that needs making again (prompts in ASSET_PROMPTS.md, "Fixes"), in assets/templates:
#   fix_overview.jpg       what went wrong, marked on the sheets that came in (for you, not for the generator)
#   fix1_mine_parts.jpg    the plank, the peg and the signpost for the Gem Mine
#   fix2_pixel_treasure.jpg the Pixel Treasure layout, if it is made again from scratch
#   fix3_feature_graphic.jpg the Google Play feature graphic: where the art goes and where the title goes
#   python3 tools/make_fix_sheets.py
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'templates'
OUT.mkdir(parents=True, exist_ok=True)
INK, GREY, RED = (60, 40, 30), (200, 200, 210), (230, 40, 60)


def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        if pathlib.Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def items(sheet, rows, cols):
    """boxes of the 12 items on a sheet, in reading order"""
    a = np.asarray(sheet.convert('RGB')).astype(int)
    ink = (a.min(axis=2) < 238) | (a.max(axis=2) - a.min(axis=2) > 18)
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=3))
    sizes = ndimage.sum(ink, lab, range(1, n + 1))
    keep = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:rows * cols]
    boxes = sorted((ndimage.find_objects(lab)[i - 1] for i in keep), key=lambda b: (b[0].start + b[0].stop) / 2)
    out = []
    for r in range(rows):
        out += sorted(boxes[r * cols:(r + 1) * cols], key=lambda b: b[1].start)
    return [(b[1].start, b[0].start, b[1].stop, b[0].stop) for b in out]


def save(im, name):
    im.convert('RGB').save(OUT / name, quality=90)
    print('wrote', (OUT / name).relative_to(ROOT), im.size)


# ---------- what went wrong, on the sheets as they came in ----------
panels = [
    ('Cosmic Gems: redo 5', 'it looks like 4: make it a white crescent moon', ROOT / 'assets/cosmic/source_sheet.webp', 3, 4, [5], [4]),
    ('Volcano Gems: redo 11', 'it looks like 7: make it a gold feathered egg', ROOT / 'assets/volcano/source_sheet.webp', 3, 4, [11], [7]),
    ('Neon Nights: redo 9 to 12', 'round discs: make each one its own shape', ROOT / 'assets/neon/source_sheet.webp', 3, 4, [9, 10, 11, 12], []),
    ('Pixel Treasure: clean all 12', 'glitch fringes and streaks: remove them', ROOT / 'assets/pixel/source_sheet.webp', 3, 4, 'all', []),
]
P = 560
W = len(panels) * (P + 30) + 30
ov = Image.new('RGB', (W, P + 150), (255, 255, 255))
d = ImageDraw.Draw(ov)
for k, (title, note, path, rows, cols, redo, like) in enumerate(panels):
    sheet = Image.open(path).convert('RGB')
    s = P / sheet.width
    x0, y0 = 30 + k * (P + 30), 110
    ov.paste(sheet.resize((P, round(sheet.height * s))), (x0, y0))
    d.text((x0, 18), title, fill=RED, font=font(28))
    d.text((x0, 60), note, fill=INK, font=font(19))
    if redo == 'all':   # the whole sheet (its glitch streaks join some items together)
        d.rounded_rectangle((x0 + 4, y0 + 40, x0 + P - 4, y0 + P - 40), 16, outline=RED, width=5)
        continue
    for i, (bx0, by0, bx1, by1) in enumerate(items(sheet, rows, cols), start=1):
        box = (x0 + bx0 * s - 4, y0 + by0 * s - 4, x0 + bx1 * s + 4, y0 + by1 * s + 4)
        if i in redo: d.rounded_rectangle(box, 10, outline=RED, width=5)
        elif i in like: d.rounded_rectangle(box, 10, outline=(255, 170, 0), width=4)
save(ov, 'fix_overview.jpg')


# ---------- 1: the plank, the peg and the signpost ----------
im = Image.new('RGB', (1024, 1024), (255, 255, 255))
d = ImageDraw.Draw(im)
d.text((30, 24), 'Gem Mine parts', fill=INK, font=font(36))
d.text((30, 72), 'plain white background, flat front view, nothing touching', fill=(120, 90, 70), font=font(22))
d.rectangle((30, 130, 994, 430), outline=GREY, width=3)
plank = Image.open(ROOT / 'assets/mine/beam.png').convert('RGBA')
plank = plank.resize((900, round(900 * plank.height / plank.width)))
im.paste(plank, (62, 280 - plank.height // 2), plank)
d.text((44, 440), '1. One long flat plank, 8 times as long as it is tall', fill=INK, font=font(22))
for k, (label, art) in enumerate((('2. Round peg (a perfect circle)', ROOT / 'assets/mine/peg.png'), ('3. Signpost with a blank sign', None))):
    bx = 30 + k * 492
    d.rectangle((bx, 500, bx + 472, 940), outline=GREY, width=3)
    if art:
        a = Image.open(art).convert('RGBA').resize((260, 260))
        im.paste(a, (bx + 106, 590), a)
    d.text((bx + 14, 952), label, fill=INK, font=font(22))
save(im, 'fix1_mine_parts.jpg')


# ---------- 2: Pixel Treasure, 3 rows of 4 ----------
names = ['Grey pebble', 'Copper coin', 'Green slime drop', 'Blue potion', 'Red heart', 'Gold coin',
         'Purple magic orb', 'Emerald', 'Ruby + sparkle', 'Treasure chest', 'Gold crown', 'Pixel Diamond']
im = Image.new('RGB', (1024, 1024), (255, 255, 255))
d = ImageDraw.Draw(im)
d.text((30, 24), 'Pixel Treasure: clean pixel art, no glitch', fill=INK, font=font(34))
d.text((30, 70), 'plain white background, 3 rows of 4, nothing touching', fill=(120, 90, 70), font=font(22))
for i, n in enumerate(names):
    cx, cy = 30 + (i % 4) * 245, 120 + (i // 4) * 300
    d.rectangle((cx, cy, cx + 228, cy + 240), outline=GREY, width=3)
    d.text((cx + 10, cy + 248), f'{i + 1}. {n}', fill=INK, font=font(20))
save(im, 'fix2_pixel_treasure.jpg')


# ---------- 3: the feature graphic, 1024 x 500 ----------
im = Image.new('RGB', (1024, 500), (106, 70, 194))
d = ImageDraw.Draw(im)
d.rectangle((0, 0, 340, 500), fill=(84, 52, 170))
d.text((40, 200), 'title goes here', fill=(230, 220, 255), font=font(30))
d.text((40, 245), '(leave this part calm)', fill=(200, 185, 245), font=font(20))
d.rounded_rectangle((470, 40, 820, 470), 40, outline=(255, 255, 255), width=5)
d.text((520, 230), 'a jar full of gems', fill=(255, 255, 255), font=font(28))
save(im, 'fix3_feature_graphic.jpg')
