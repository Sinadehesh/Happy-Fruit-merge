# Cutting gems (and other art) out of sheets made on a white background, without white fringes or dots.
# Used by tools/cut_sets.py.
#
# The old cut (tools/cut_light.py) kept the edge pixels as they were on the sheet: half gem, half white
# background, but almost fully solid, so a pale rim showed around every gem on the dark jar, plus a few
# white specks that the shape had swallowed. Here the edge is "un-mixed" from the white instead:
#   1. the gem's solid shape: everything that isn't plain white, gaps closed, holes filled, the biggest
#      piece only, then a small opening so specks and thin bits stuck to the rim come off
#   2. a thin band around the edge: each pixel there is compared with the gem's own colour just inside
#      the edge, which says how much of it is gem and how much is white (its transparency)
#   3. the white is taken back out of those pixels' colour
# Pale gems (pearls, clear crystals), whose colour is too close to white to tell apart, keep a soft edge.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from scipy.spatial import ConvexHull

W = 255.0


def disk(r):
    yy, xx = np.ogrid[-r:r + 1, -r:r + 1]
    return xx * xx + yy * yy <= r * r


def closed(m, r):
    """binary closing with a disk, on a padded copy so shapes at the border aren't eaten"""
    p = np.pad(m, r + 1)
    return ndimage.binary_fill_holes(ndimage.binary_closing(p, structure=disk(r)))[r + 1:-r - 1, r + 1:-r - 1]


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


def solid_shape(cell):
    mn, mx = cell.min(axis=2), cell.max(axis=2)
    ink = (mn < 246) | (mx - mn > 12)
    ink = ndimage.binary_closing(ink, structure=np.ones((3, 3)), iterations=3)
    lab, n = ndimage.label(ink)
    sizes = ndimage.sum(ink, lab, range(1, n + 1))
    m = ndimage.binary_fill_holes(lab == np.argmax(sizes) + 1)
    m = closed(m, 6)                                          # a white sparkle on the edge stays part of the gem
    m = ndimage.binary_opening(m, structure=disk(2))          # specks and hairlines stuck to the rim come off
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    return ndimage.binary_fill_holes(lab == np.argmax(sizes) + 1)


def unmix(cell, m):
    """alpha and colour with the white background taken out of the edge pixels"""
    interior = ndimage.binary_erosion(m, structure=disk(1), iterations=2)
    band = ndimage.binary_dilation(m, structure=disk(1), iterations=2) & ~interior
    _, (iy, ix) = ndimage.distance_transform_edt(~interior, return_indices=True)
    inside = cell[iy, ix]                                      # the gem's own colour, carried out to the edge
    d_in, d_obs = W - inside, W - cell
    denom = (d_in ** 2).sum(axis=2)
    a_est = np.clip((d_obs * d_in).sum(axis=2) / np.maximum(denom, 1), 0, 1)
    soft = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.8))) / 255.0
    a_est = np.where(denom > 40 ** 2, a_est, np.minimum(soft, np.maximum(a_est, soft * 0.6)))   # pale gems: a soft edge
    alpha = np.where(interior, 1.0, np.where(band, a_est, 0.0))
    alpha = ndimage.gaussian_filter(alpha, 0.45)
    alpha[interior] = 1.0
    safe = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip((cell - (1 - safe) * W) / safe, 0, 255)
    col = np.where(alpha[..., None] > 0.3, col, inside)        # nearly see-through pixels take the gem's colour
    return col, alpha


def square(rgba, size=256, margin=0.0):
    img = Image.fromarray(rgba, 'RGBA')
    box = Image.fromarray((rgba[..., 3] > 6).astype(np.uint8) * 255).getbbox()
    img = img.crop(box)
    s = int(round(max(img.size) * (1 + 2 * margin)))
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
    return sq.resize((size, size), Image.LANCZOS) if size else sq


def cut(sheet, box, size=256):
    """one item (not glowing) cut cleanly from a white sheet, centred on a size x size square"""
    cell = np.asarray(sheet.convert('RGB')).astype(float)[box[1]:box[3], box[0]:box[2]]
    m = solid_shape(cell)
    col, alpha = unmix(cell, m)
    return square(np.dstack([col, alpha * 255]).astype(np.uint8), size)


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
    mn, mx = cell.min(axis=2), cell.max(axis=2)
    if pale:
        core = pale_body(cell)
        col = cell
        core_a = ndimage.gaussian_filter(core.astype(float), 1.2)
    else:
        core = ((mn < 175) & (mx - mn > 70)) | (mx < 120)
        core = ndimage.binary_closing(core, structure=np.ones((3, 3)), iterations=3)
        lab, n = ndimage.label(core)
        sizes = ndimage.sum(core, lab, range(1, n + 1))
        core = ndimage.binary_fill_holes(lab == np.argmax(sizes) + 1)
        core = closed(core, 8)                                    # white sparkles on the edge belong to the gem
        core = ndimage.binary_opening(core, structure=disk(2))
        col, core_a = unmix(cell, core)
    # the halo: how far from white, un-mixed from the white background, fading out well inside the box
    ga = np.clip((252 - mn) / 110.0, 0, 1) ** 1.2
    ga = ndimage.gaussian_filter(ga, 1.5) * 0.85
    h, w = mn.shape
    dist = ndimage.distance_transform_edt(~core)
    reach = 0.12 * max(h, w)
    ga *= np.clip(1 - dist / reach, 0, 1)                      # the glow hugs the body and fades out evenly
    smooth = ndimage.gaussian_filter(cell, (2.5, 2.5, 0))     # the glow's colour, without the sheet's noise
    safe = np.maximum(ga, 0.12)[..., None]
    glow_rgb = np.clip((smooth - (1 - safe) * W) / safe, 0, 255)
    alpha = np.maximum(core_a, ga)
    rgb = col * core_a[..., None] + glow_rgb * (1 - core_a[..., None])
    return square(np.dstack([rgb, alpha * 255]).astype(np.uint8), size)
