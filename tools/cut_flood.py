# Cut the N biggest items from a sheet on a white background into 256x256 transparent PNGs.
# Background = near-white pixels connected to the sheet's edge, plus enclosed near-white gaps (see HOLE_MIN).
# The item edge is trimmed by a pixel and softened, so no light fringe from the background is left.
# Usage: python3 tools/cut_flood.py sheet out_dir name1,name2,... [native]   (items in reading order)
#   native: save each item tightly cropped at the sheet's own resolution (keeps relative sizes),
#   instead of padded to a 256x256 square
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
NATIVE = len(sys.argv) > 4 and sys.argv[4] == 'native'
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
if hn:
    hsizes = ndimage.sum(white, hl, range(1, hn + 1))
    obj &= ~np.isin(hl, [i + 1 for i in range(hn) if hsizes[i] >= HOLE_MIN])
obj = ndimage.binary_opening(obj, iterations=1)          # drop specks of noise
joined = ndimage.binary_dilation(obj, iterations=2)   # join sparkles to their item
# items that touch in the sheet: split any piece much wider than the others at its thinnest column
for _ in range(len(names)):
    items_lab, n = ndimage.label(joined)
    sizes = ndimage.sum(obj, items_lab, range(1, n + 1))
    big = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:len(names)]
    boxes = {i: ndimage.find_objects(items_lab)[i - 1] for i in big}
    widths = sorted(boxes[i][1].stop - boxes[i][1].start for i in big)
    median = widths[len(widths) // 2]
    wide = [i for i in big if boxes[i][1].stop - boxes[i][1].start > 1.6 * median]
    if not wide: break
    for i in wide:
        ys, xs = boxes[i]
        cols = (obj[ys, xs] & (items_lab[ys, xs] == i)).sum(axis=0)
        w = len(cols); lo, hi = int(w * 0.3), int(w * 0.7)
        cut = xs.start + lo + int(np.argmin(cols[lo:hi]))
        joined[ys, cut - 1:cut + 2] = False
items_lab, n = ndimage.label(joined)
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
