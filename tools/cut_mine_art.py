# Cuts the Gem Mine art from the sheets in assets/mine/source and assets/fixes (made from the prompts in
# ASSET_PROMPTS.md) into the files the game uses in assets/mine, with the clean cut in tools/gemcut.py
# (no white rim, no white specks):
#   sheet1_crates.webp        -> crate.png, crate_strong.png, crate_cracked.png, splinter_1..6.png
#   sheet2_jar_parts.webp     -> icon_pickaxe.png, lantern.png
#   sheet3_stage_buttons.webp -> node_open.png, node_current.png, node_locked.png, node_boss.png
#   map_background.webp       -> map_bg.jpg  (made to repeat top to bottom without a visible seam)
#   mine_entrance.webp        -> map_entrance.jpg
#   fixes/fix1_mine_parts.webp-> beam.png (the plank's wood, repeating end to end), peg.png, sign.png
#   python3 tools/cut_mine_art.py
import sys, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gemcut

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'assets' / 'mine' / 'source', ROOT / 'assets' / 'mine'


def items(rgb, count):
    """boxes of the `count` biggest items on a white background, in reading order"""
    a = np.asarray(rgb.convert('RGB')).astype(int)
    ink = (a.min(axis=2) < 238) | (a.max(axis=2) - a.min(axis=2) > 18)
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=3))
    sizes = ndimage.sum(ink, lab, range(1, n + 1))
    keep = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:count]
    boxes = [ndimage.find_objects(lab)[i - 1] for i in keep]
    boxes.sort(key=lambda b: (b[0].start // 120, b[1].start))   # rows, then left to right
    H, W = a.shape[:2]
    return [(max(0, b[1].start - 6), max(0, b[0].start - 6), min(W, b[1].stop + 6), min(H, b[0].stop + 6)) for b in boxes]


def cut(rgb, count=1):
    """the `count` biggest items, each cut cleanly and cropped tight (RGBA, at the sheet's own size)"""
    return [gemcut.square(gemcut_rgba(rgb, box), size=0) for box in items(rgb, count)]


def gemcut_rgba(rgb, box):
    cell = np.asarray(rgb.convert('RGB')).astype(float)[box[1]:box[3], box[0]:box[2]]
    col, alpha = gemcut.unmix(cell, gemcut.solid_shape(cell))
    return np.dstack([col, alpha * 255]).astype(np.uint8)


def quadrants(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    return [im.crop((x, y, x + w // 2, y + h // 2)) for y in (0, h // 2) for x in (0, w // 2)]


def fit(im, canvas, body, body_size, centre=(0.5, 0.5)):
    """scale so the part `body` px tall becomes `body_size`, and centre it on a square canvas"""
    k = body_size / body
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    sq = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    sq.alpha_composite(im, (round(canvas * centre[0] - im.width / 2), round(canvas * centre[1] - im.height / 2)))
    return sq


def seamless(img, K):
    """make a picture repeat from top to bottom without a seam: its bottom K rows and top K rows are overlapped and
    joined along the line where they look most alike (a minimum-error cut, found column by column), so nothing is
    cut in half. Returns a picture K rows shorter."""
    H, W, _ = img.shape
    B, T = img[H - K:], img[:K]                # the rows that follow the end, and the first rows
    cost = ((B - T) ** 2).sum(axis=2)
    back = np.zeros((K, W), int)
    for x in range(1, W):                      # the cut moves at most a row per column
        prev = cost[:, x - 1]
        options = np.stack([np.roll(prev, 1), prev, np.roll(prev, -1)])
        options[0, 0] = options[2, -1] = np.inf
        pick = options.argmin(axis=0)
        cost[:, x] += options[pick, np.arange(K)]
        back[:, x] = np.arange(K) + (pick - 1)
    cut_row = np.zeros(W, int)
    cut_row[-1] = int(cost[:, -1].argmin())
    for x in range(W - 1, 0, -1):
        cut_row[x - 1] = back[cut_row[x], x]
    blend = np.clip((np.arange(K)[:, None] - cut_row[None, :]) / 6 + 0.5, 0, 1)[..., None]   # a soft edge along the cut
    return np.concatenate([B * (1 - blend) + T * blend, img[K:H - K]], axis=0)


def save(im, name, **kw):
    im.save(OUT / name, **kw)
    print('wrote', name, im.size)


# ---------- crates: the crate body (its height) is 150 px on a 172 px square; splinters fit 64 px ----------
q = quadrants(SRC / 'sheet1_crates.webp')
for name, quad in zip(('crate', 'crate_strong', 'crate_cracked'), q[:3]):
    c = cut(quad)[0]
    save(fit(c, 172, c.height, 150), f'{name}.png', optimize=True)
for k, s in enumerate(cut(q[3], count=6)):
    s.thumbnail((64, 64), Image.LANCZOS)
    save(s, f'splinter_{k + 1}.png', optimize=True)

# ---------- the pickaxe icon (square) and the lantern ----------
q = quadrants(SRC / 'sheet2_jar_parts.webp')
p = cut(q[2])[0]
save(fit(p, 160, max(p.size), 150), 'icon_pickaxe.png', optimize=True)
lantern = cut(q[3])[0]
lantern.thumbnail((120, 120), Image.LANCZOS)
save(lantern, 'lantern.png', optimize=True)

# ---------- stage buttons: the round button is 128 px wide, centred on a 192 px square (room for the
# boss's crown above and the padlock below) ----------
q = quadrants(SRC / 'sheet3_stage_buttons.webp')
for name, quad in zip(('open', 'current', 'locked', 'boss'), q):
    b = cut(quad)[0]
    D = b.width                                   # the circle is the widest part
    cy = b.height - D / 2 if name == 'boss' else D / 2   # the crown is on top; the padlock hangs below
    k = 128 / D
    b = b.resize((round(b.width * k), round(b.height * k)), Image.LANCZOS)
    sq = Image.new('RGBA', (192, 192), (0, 0, 0, 0))
    sq.alpha_composite(b, (round(96 - b.width / 2), round(96 - cy * k)))
    save(sq, f'node_{name}.png', optimize=True)

# ---------- the map background, made to repeat from top to bottom ----------
img = np.asarray(Image.open(SRC / 'map_background.webp').convert('RGB')).astype(float)
save(Image.fromarray(np.clip(seamless(img, 240), 0, 255).astype(np.uint8)), 'map_bg.jpg', quality=86)

# ---------- the mine's entrance, the top of the map ----------
save(Image.open(SRC / 'mine_entrance.webp').convert('RGB'), 'map_entrance.jpg', quality=88)

# ---------- the plank, the peg and the signpost (made again, assets/fixes) ----------
fix = Image.open(ROOT / 'assets' / 'fixes' / 'fix1_mine_parts.webp').convert('RGB')
plank_box, *rest = sorted(items(fix, 3), key=lambda b: -(b[2] - b[0]))   # the plank is the widest
peg_box, sign_box = sorted(rest, key=lambda b: b[0])                        # the peg is on the left, the sign on the right
a = np.asarray(fix).astype(float)
x0, y0, x1, y1 = plank_box
mid = a[y0:y1, (x0 + x1) // 2]
dark = np.nonzero(mid.max(axis=1) < 110)[0] + y0           # the plank's outline, top and bottom, down its middle
top_in = int(dark[dark < (y0 + y1) / 2].max()) + 3
bot_in = int(dark[dark > (y0 + y1) / 2].min()) - 3
strip = a[top_in:bot_in, x0 + 160:x1 - 160]                 # the wood inside the outline, away from the rounded ends
strip = seamless(strip.transpose(1, 0, 2), int(strip.shape[1] * 0.25)).transpose(1, 0, 2)   # repeats end to end
wood = Image.fromarray(np.clip(strip, 0, 255).astype(np.uint8))
save(wood.resize((round(wood.width * 48 / wood.height), 48), Image.LANCZOS), 'beam.png', optimize=True)
save(gemcut.square(gemcut_rgba(fix, peg_box), size=96), 'peg.png', optimize=True)
sign = gemcut.square(gemcut_rgba(fix, sign_box), size=0)
sign.thumbnail((320, 320), Image.LANCZOS)
save(sign, 'sign.png', optimize=True)
