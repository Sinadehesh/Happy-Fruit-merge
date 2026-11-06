# Cutting gems (and other art) out of sheets made on a white background, with nothing of the white left.
# Used by tools/cut_sets.py and tools/cut_mine_art.py.
#
#   1. the background: every pixel close to the sheet's white that the outside can reach without crossing the
#      art. This takes the white out of notches, from between gear teeth and from every step of pixel art too.
#      (The cut before this one closed the item's outline to keep it in one piece, and that kept the white in
#      such corners: the white dots around the pixel gems.)
#   2. the item: everything else, its biggest piece (loose specks off); white enclosed by the art stays (eyes,
#      highlights), unless the item has a real gap through it (`holes`)
#   3. the edge, a few pixels deep: each pixel there is a mix of the item's own colour just inside it and the
#      sheet's white, which says how see-through it is, and it takes the item's colour (never the white's)
# Pale items (pearls, clear crystals), whose colour is too close to white to tell apart, keep a soft edge.
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import ConvexHull

TOL = 12        # how far (0-255, any channel) from the sheet's white a pixel may be and still be background
DEPTH = 3.0     # how deep (px) the soft edge between the item and the white is on these sheets


def disk(r):
    yy, xx = np.ogrid[-r:r + 1, -r:r + 1]
    return xx * xx + yy * yy <= r * r


def closed(m, r):
    """binary closing with a disk, on a padded copy so shapes at the border aren't eaten"""
    p = np.pad(m, r + 1)
    return ndimage.binary_fill_holes(ndimage.binary_closing(p, structure=disk(r)))[r + 1:-r - 1, r + 1:-r - 1]


def biggest(m):
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n == 0: return m
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    return lab == np.argmax(sizes) + 1


def find_items(sheet, rows, cols):
    """boxes (x0, y0, x1, y1) of the rows x cols items on a white sheet, in reading order"""
    a = np.asarray(sheet.convert('RGB')).astype(int)
    ink = (a.min(axis=2) < 238) | (a.max(axis=2) - a.min(axis=2) > 18)
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=3))   # an item with its glow as one piece
    sizes = ndimage.sum(ink, lab, range(1, n + 1))
    keep = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:rows * cols]
    boxes = sorted((ndimage.find_objects(lab)[i - 1] for i in keep), key=lambda b: (b[0].start + b[0].stop) / 2)
    out = []
    for r in range(rows):
        out += sorted(boxes[r * cols:(r + 1) * cols], key=lambda b: b[1].start)
    H, Wd = a.shape[:2]
    pad = 6
    return [(max(0, b[1].start - pad), max(0, b[0].start - pad), min(Wd, b[1].stop + pad), min(H, b[0].stop + pad)) for b in out]


def bg_colour(cell):
    """the sheet's white, measured along the cell's border (a little off pure white)"""
    e = np.concatenate([cell[:2].reshape(-1, 3), cell[-2:].reshape(-1, 3), cell[:, :2].reshape(-1, 3), cell[:, -2:].reshape(-1, 3)])
    return np.median(e, axis=0)


def touching_border(m):
    lab, _ = ndimage.label(m)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    return np.isin(lab, edge[edge > 0])


def from_outside(region, short=50):
    """the part of `region` the outside reaches, without running up a long channel under 5 px wide (a white
    highlight line that touches the edge isn't the background); a short one (the tip of a V-shaped gap between
    two parts) is"""
    region = touching_border(region)
    wide = touching_border(ndimage.binary_opening(region, structure=disk(2)))
    out = ndimage.binary_dilation(wide, structure=np.ones((3, 3)), iterations=2, mask=region)
    rest = region & ~out
    lab, n = ndimage.label(rest, structure=np.ones((3, 3)))
    if n:
        sizes = ndimage.sum(rest, lab, range(1, n + 1))
        out |= np.isin(lab, [i + 1 for i in range(n) if sizes[i] <= short])
    return out


def distance_from_white(cell, bg):
    return np.abs(cell - bg).max(axis=2)


def background(cell, tol=TOL):
    """the white around the item: pixels close to the sheet's white, connected to the cell's border.
    Faint sketch lines (light, under 3 px thin) don't stop it, and the small light-grey pockets such lines wall
    off between themselves and the art (in the steps of pixel art) are background too"""
    bg = bg_colour(cell)
    d = distance_from_white(cell, bg)
    near = d <= tol
    sketch = ~near & ~ndimage.binary_opening(~near, structure=disk(1)) & (d <= 70)
    B = from_outside(near | sketch)
    light = (d <= 30) & ~B
    lab, n = ndimage.label(light)
    if n:
        sizes = ndimage.sum(light, lab, range(1, n + 1))
        touch = np.unique(lab[ndimage.binary_dilation(B & sketch, structure=np.ones((3, 3))) & light])
        B |= np.isin(lab, [i for i in touch if i > 0 and sizes[i - 1] <= 600])
    return B, bg


def solid_shape(cell, keep=0, holes=0, outline=False):
    """the item's shape. keep: a closing radius, for an item with a white sparkle on its edge that should stay
    part of it. holes: open enclosed white areas at least this big (px), for an item with a real gap through it.
    outline: the item is drawn inside a dark outline all round, so anything light outside the outline (pencil
    marks, a pale rim) goes too"""
    B, bg = background(cell)
    m = biggest(ndimage.binary_opening(~B, structure=disk(1)))    # 1-px hairs and loose specks off
    if outline:
        dark = ndimage.binary_opening(distance_from_white(cell, bg) > 90, structure=disk(1))   # pencil strokes off
        line = closed(dark, 2)                                     # the outline and all inside it
        if (line & m).sum() >= 0.85 * m.sum():                     # (only if the outline is closed all round)
            m = biggest(m & ndimage.binary_dilation(line, structure=disk(1)))
    if keep: m = closed(m, keep)
    m = ndimage.binary_fill_holes(m)
    if holes:
        lab, n = ndimage.label((distance_from_white(cell, bg) <= TOL) & m)
        for i in range(1, n + 1):
            if (lab == i).sum() >= holes: m &= lab != i
    return m


def unmix(cell, m, depth=DEPTH):
    """alpha and colour of an item with the sheet's white taken out of its edge"""
    bg = bg_colour(cell)
    dist = ndimage.distance_transform_edt(m)
    interior = dist > depth
    if not interior.any(): interior = dist >= dist.max()
    _, (iy, ix) = ndimage.distance_transform_edt(~interior, return_indices=True)
    inside = cell[iy, ix]                                       # the item's own colour, carried out to the edge
    d_in, d_obs = bg - inside, bg - cell
    denom = (d_in ** 2).sum(axis=2)
    a = np.clip((d_obs * d_in).sum(axis=2) / np.maximum(denom, 1), 0, 1)
    soft = ndimage.gaussian_filter(m.astype(float), 0.8)
    a = np.where(denom > 40 ** 2, a, np.minimum(soft, np.maximum(a, soft * 0.6)))   # pale items: a soft edge
    alpha = np.where(interior, 1.0, np.where(m, a, 0.0))
    alpha = ndimage.gaussian_filter(alpha, 0.45)
    alpha[interior] = 1.0
    safe = np.maximum(alpha, 1e-3)[..., None]
    rec = np.clip((cell - (1 - safe) * bg) / safe, 0, 255)      # the edge's own colour with the white taken out
    w = np.clip((alpha - 0.4) / 0.4, 0, 1)[..., None]           # ...trusted only where the pixel is mostly item
    col = np.where(interior[..., None], cell, w * rec + (1 - w) * inside)
    return col, alpha


def square(rgba, size=256, margin=0.0):
    img = Image.fromarray(rgba, 'RGBA')
    box = Image.fromarray((rgba[..., 3] > 6).astype(np.uint8) * 255).getbbox()
    img = img.crop(box)
    s = int(round(max(img.size) * (1 + 2 * margin)))
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
    return sq.resize((size, size), Image.LANCZOS) if size else sq


def rgba(cell, m):
    col, alpha = unmix(cell, m)
    return np.dstack([col, alpha * 255]).round().astype(np.uint8)


def cut(sheet, box, size=256, **shape):
    """one item (not glowing) cut cleanly from a white sheet, centred on a size x size square
    (shape: keep, holes, outline, see solid_shape)"""
    cell = np.asarray(sheet.convert('RGB')).astype(float)[box[1]:box[3], box[0]:box[2]]
    return square(rgba(cell, solid_shape(cell, **shape)), size)


def pale_body(cell, grow=9):
    """a pale gem whose white edge melts into its glow: the outline around its coloured faces, grown out to the edge"""
    mn, mx = cell.min(axis=2), cell.max(axis=2)
    coloured = ndimage.binary_opening((mx - mn > 40) & (mn < 235), structure=disk(1))
    lab, n = ndimage.label(coloured)
    sizes = ndimage.sum(coloured, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i in range(n) if sizes[i] >= 40])
    ys, xs = np.nonzero(keep)
    pts = np.stack([xs, ys], 1)
    hull = pts[ConvexHull(pts).vertices]
    mask = Image.new('L', (cell.shape[1], cell.shape[0]), 0)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in hull], fill=255)
    return ndimage.binary_dilation(np.asarray(mask) > 0, structure=disk(grow))


def cut_glow(sheet, box, size=256, pale=False):
    """a glowing item: a solid body cut cleanly, and the pale glow around it as a see-through halo"""
    cell = np.asarray(sheet.convert('RGB')).astype(float)[box[1]:box[3], box[0]:box[2]]
    B, bg = background(cell)
    mn, mx = cell.min(axis=2), cell.max(axis=2)
    if pale:
        core = pale_body(cell) & ~B
        col = cell
        core_a = ndimage.gaussian_filter(core.astype(float), 1.2)
    else:
        core = ((mn < 175) & (mx - mn > 70)) | (mx < 120)
        core = ndimage.binary_closing(core, structure=np.ones((3, 3)), iterations=3)
        core = ndimage.binary_fill_holes(biggest(core))
        core = closed(core, 8)                                    # white sparkles on the edge belong to the gem
        core = ndimage.binary_opening(core, structure=disk(2)) & ~B   # ...but never the sheet's white
        col, core_a = unmix(cell, biggest(core))
    # the halo: how far from white, un-mixed from the white background, fading out well inside the box
    ga = np.clip((bg.min() - mn) / 110.0, 0, 1) ** 1.2
    ga = ndimage.gaussian_filter(ga, 1.5) * 0.85
    h, w = mn.shape
    dist = ndimage.distance_transform_edt(~core)
    reach = 0.12 * max(h, w)
    ga *= np.clip(1 - dist / reach, 0, 1)                      # the glow hugs the body and fades out evenly
    smooth = ndimage.gaussian_filter(cell, (2.5, 2.5, 0))     # the glow's colour, without the sheet's noise
    safe = np.maximum(ga, 0.12)[..., None]
    glow_rgb = np.clip((smooth - (1 - safe) * bg) / safe, 0, 255)
    alpha = np.maximum(core_a, ga)
    rgb = col * core_a[..., None] + glow_rgb * (1 - core_a[..., None])
    return square(np.dstack([rgb, alpha * 255]).round().astype(np.uint8), size)
