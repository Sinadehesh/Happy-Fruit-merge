# Cut the N biggest items from a sheet on a white background into 256x256 transparent PNGs.
# Background = near-white pixels connected to the sheet's edge, plus enclosed near-white gaps (see HOLE_MIN).
# The item edge is trimmed by a pixel and softened, so no light fringe from the background is left.
# Usage: python3 tools/cut_flood.py sheet out_dir name1,name2,... [native] [keepholes]   (items in reading order)
#   native: save each item tightly cropped at the sheet's own resolution (keeps relative sizes),
#   instead of padded to a 256x256 square
#   keepholes: keep enclosed white areas (use when the art has white details like dots or skulls)
#   round: items are roughly round and touch each other (e.g. bombs); splits them by circle instead of a straight cut
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
FLAGS = sys.argv[4:]
NATIVE = 'native' in FLAGS
KEEP_HOLES = 'keepholes' in FLAGS   # sheets where enclosed white is art (white dots, skulls), not gaps
ROUND = 'round' in FLAGS            # items are roughly round and may touch: split touching items along where their circles meet
a = np.array(Image.open(src).convert('RGB'))
ai = a.astype(int)
light = (ai.min(axis=2) > 215) & ((ai.max(axis=2) - ai.min(axis=2)) < 35)
lab, _ = ndimage.label(light)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
obj = ~np.isin(lab, list(edge))
# enclosed gaps (between legs, arm and body, inside windows, between planks): near-white areas
# inside an item are background too. Small light bits (eyes, teeth, shine) stay.
HOLE_MIN = 40   # pixels; enclosed white areas smaller than this are kept as detail
white = (ai.min(axis=2) > 232) & ((ai.max(axis=2) - ai.min(axis=2)) < 25) & obj
hl, hn = ndimage.label(white)
if hn and not KEEP_HOLES:
    hsizes = ndimage.sum(white, hl, range(1, hn + 1))
    obj &= ~np.isin(hl, [i + 1 for i in range(hn) if hsizes[i] >= HOLE_MIN])
obj = ndimage.binary_opening(obj, iterations=1)          # drop specks of noise
if not ROUND: joined = ndimage.binary_dilation(obj, iterations=2)   # join sparkles to their item
if ROUND:
    # each item's core = the deep inside of its shape; its circle = core centre + deepest distance to the edge.
    # Every pixel goes to the item whose circle it fits best (power diagram), so touching circles split
    # along the curve where they meet.
    dist = ndimage.distance_transform_edt(obj)
    cores, nc = ndimage.label(dist > 0.55 * dist.max())
    centres = ndimage.center_of_mass(cores, cores, range(1, nc + 1))
    radii = ndimage.maximum(dist, cores, range(1, nc + 1))
    ys, xs = np.nonzero(obj)
    best = np.full(len(ys), np.inf); owner = np.zeros(len(ys), int)
    for k, ((cy, cx), r) in enumerate(zip(centres, radii)):
        score = (ys - cy) ** 2 + (xs - cx) ** 2 - r ** 2
        better = score < best; best[better] = score[better]; owner[better] = k + 1
    items_lab = np.zeros(obj.shape, int); items_lab[ys, xs] = owner   # each pixel labelled with its item
    n = nc
    # bombs only stick out of their circle at the top (fuse, cap) or the right (grenade lever);
    # anything outside the circle on the left belongs to the neighbour on that side
    for k, ((cy, cx), r) in enumerate(zip(centres, radii)):
        out_left = (items_lab == k + 1) & (((np.indices(obj.shape)[0] - cy) ** 2 + (np.indices(obj.shape)[1] - cx) ** 2) > (1.04 * r) ** 2) & (np.indices(obj.shape)[1] < cx - 0.35 * r)
        items_lab[out_left] = 0
    # drop stray bits handed to the wrong item (another bomb's fuse tip or outline): besides the piece
    # holding the item's centre, keep only pieces that don't touch a neighbouring item (e.g. a spark)
    owned = items_lab.copy()
    for k, (cy, cx) in enumerate(centres):
        mine = owned == k + 1
        pieces, npieces = ndimage.label(mine)
        main = pieces[int(cy), int(cx)]
        others = (owned > 0) & ~mine
        for pi in range(1, npieces + 1):
            if pi == main: continue
            piece = pieces == pi
            if (ndimage.binary_dilation(piece, iterations=3) & others).any() or piece.sum() > 0.05 * mine.sum():
                items_lab[piece] = 0
# items that touch in the sheet: until we have as many real pieces as names, split the widest piece
# (relative to its height) at its thinnest column
for _ in ([] if ROUND else range(4 * len(names))):
    items_lab, n = ndimage.label(joined)
    sizes = ndimage.sum(obj, items_lab, range(1, n + 1))
    real = [i for i in range(1, n + 1) if sizes[i - 1] > 0.15 * sizes.max()]
    if len(real) >= len(names): break
    boxes = {i: ndimage.find_objects(items_lab)[i - 1] for i in real}
    i = max(real, key=lambda i: (boxes[i][1].stop - boxes[i][1].start) / (boxes[i][0].stop - boxes[i][0].start))
    ys, xs = boxes[i]
    cols = (obj[ys, xs] & (items_lab[ys, xs] == i)).sum(axis=0)
    w = len(cols); lo, hi = int(w * 0.15), int(w * 0.85)
    cut = xs.start + lo + int(np.argmin(cols[lo:hi]))
    joined[ys, cut - 1:cut + 2] = False
if not ROUND: items_lab, n = ndimage.label(joined)
sizes = ndimage.sum(obj, items_lab, range(1, n + 1))
keep = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:len(names)]
boxes = {i: ndimage.find_objects(items_lab)[i - 1] for i in keep}
# reading order: rows by top edge, then left to right
keep.sort(key=lambda i: boxes[i][0].start)
rows = []
for i in keep:
    if rows and boxes[i][0].start < boxes[rows[-1][0]][0].stop - 40: rows[-1].append(i)
    else: rows.append([i])
keep = [i for r in rows for i in sorted(r, key=lambda i: boxes[i][1].start)]
for k, i in enumerate(keep):
    m = obj & (items_lab == i)
    m = ndimage.binary_erosion(m, iterations=1)
    alpha = np.array(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.7)))
    img = Image.fromarray(np.dstack([a, alpha]), 'RGBA').crop(Image.fromarray(alpha).getbbox())
    if NATIVE:
        img.save(f'{out}/{k + 1:02d}_{names[k]}.png', optimize=True)
        print(k + 1, names[k], img.size)
        continue
    s = max(img.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
    sq.resize((256, 256), Image.LANCZOS).save(f'{out}/{k + 1:02d}_{names[k]}.png', optimize=True)
    print(k + 1, names[k], img.size)
