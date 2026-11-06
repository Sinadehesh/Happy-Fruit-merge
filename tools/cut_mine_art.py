# Cuts the Gem Mine art from the sheets in assets/mine/source (made from the prompts in ASSET_PROMPTS.md)
# into the files the game uses in assets/mine:
#   sheet1_crates.webp       -> crate.png, crate_strong.png, crate_cracked.png, splinter_1..6.png
#   sheet2_jar_parts.webp    -> icon_pickaxe.png, lantern.png   (its plank and peg didn't fit: see ASSET_PROMPTS.md)
#   sheet3_stage_buttons.webp-> node_open.png, node_current.png, node_locked.png, node_boss.png
#   map_background.webp      -> map_bg.jpg  (made to repeat top to bottom without a visible seam)
#   mine_entrance.webp       -> map_entrance.jpg
#   python3 tools/cut_mine_art.py
import pathlib
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'assets' / 'mine' / 'source', ROOT / 'assets' / 'mine'


def cut(rgb, count=1, keep_holes=True):
    """the `count` biggest items on a white background, as tight RGBA crops in reading order"""
    a = np.asarray(rgb.convert('RGB'))
    ai = a.astype(int)
    light = (ai.min(axis=2) > 215) & ((ai.max(axis=2) - ai.min(axis=2)) < 35)
    lab, _ = ndimage.label(light)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    obj = ~np.isin(lab, list(edge))
    if not keep_holes:   # enclosed white gaps are background too
        white = (ai.min(axis=2) > 232) & ((ai.max(axis=2) - ai.min(axis=2)) < 25) & obj
        hl, hn = ndimage.label(white)
        sizes = ndimage.sum(white, hl, range(1, hn + 1))
        obj &= ~np.isin(hl, [i + 1 for i in range(hn) if sizes[i] >= 40])
    obj = ndimage.binary_opening(obj, iterations=1)
    items, n = ndimage.label(ndimage.binary_dilation(obj, iterations=2))
    sizes = ndimage.sum(obj, items, range(1, n + 1))
    keep = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:count]
    boxes = {i: ndimage.find_objects(items)[i - 1] for i in keep}
    keep.sort(key=lambda i: (boxes[i][0].start // 120, boxes[i][1].start))   # rows, then left to right
    out = []
    for i in keep:
        m = ndimage.binary_erosion(obj & (items == i), iterations=1)
        alpha = np.array(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.7)))
        im = Image.fromarray(np.dstack([a, alpha]), 'RGBA')
        out.append(im.crop(Image.fromarray(alpha).getbbox()))
    return out


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

# ---------- the map background: made to repeat from top to bottom ----------
# The bottom strip of the picture and the top strip are overlapped and joined along the line where they
# look most alike (a minimum-error cut, found column by column), so nothing is cut in half and no seam shows.
img = np.asarray(Image.open(SRC / 'map_background.webp').convert('RGB')).astype(float)
H, W, _ = img.shape
K = 240                                        # overlap rows
B, T = img[H - K:], img[:K]                    # the rows that follow the tile's end, and the tile's first rows
err = ((B - T) ** 2).sum(axis=2)
cost = err.copy()
back = np.zeros((K, W), int)
for x in range(1, W):                          # dynamic programming: the cut moves at most a row per column
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
rows = np.arange(K)[:, None]
blend = np.clip((rows - cut_row[None, :]) / 6 + 0.5, 0, 1)[..., None]   # a soft 6-row edge along the cut
top = B * (1 - blend) + T * blend              # above the cut: what follows the tile's end; below: the top rows
tile = np.concatenate([top, img[K:H - K]], axis=0)
save(Image.fromarray(np.clip(tile, 0, 255).astype(np.uint8)), 'map_bg.jpg', quality=86)

# ---------- the mine's entrance, the top of the map ----------
save(Image.open(SRC / 'mine_entrance.webp').convert('RGB'), 'map_entrance.jpg', quality=88)
