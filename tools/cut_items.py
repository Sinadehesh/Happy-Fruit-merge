# Cut each separate item from a sprite sheet on a white background into a 256x256 transparent PNG.
# Works for irregular layouts and ignores soft glows/shadows around items.
# Usage: python3 tools/cut_items.py sheet.webp out_dir name1,name2,... [skip_index,...]
#   Items are numbered in reading order (top to bottom, left to right); skipped indexes are left out.
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
skip = {int(i) for i in sys.argv[4].split(',')} if len(sys.argv) > 4 else set()
a = np.array(Image.open(src).convert('RGB'))
core = a.astype(int).min(axis=2) < 170           # solid paint and outlines, not pale glows
lab, n = ndimage.label(ndimage.binary_closing(core, iterations=3))
sizes = ndimage.sum(core, lab, range(1, n + 1))
items = [(o, i + 1) for i, (o, s) in enumerate(zip(ndimage.find_objects(lab), sizes)) if s > 2000]
# reading order: group into rows by vertical overlap, then left to right
items.sort(key=lambda t: t[0][0].start)
rows = []
for it in items:
    if rows and it[0][0].start < max(r[0][0].stop for r in rows[-1]) - 40: rows[-1].append(it)
    else: rows.append([it])
items = [it for r in rows for it in sorted(r, key=lambda t: t[0][1].start)]
kept = [it for k, it in enumerate(items) if k not in skip]
assert len(kept) == len(names), f'{len(kept)} items for {len(names)} names'
for k, ((ys, xs), label) in enumerate(kept):
    mask = ndimage.binary_fill_holes(lab == label)       # fills windows, white roofs, etc.
    mask = ndimage.binary_dilation(mask, iterations=1)   # keep the anti-aliased outline edge
    alpha = np.array(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.7)))
    img = Image.fromarray(np.dstack([a, alpha]), 'RGBA')
    img = img.crop(img.getbbox())
    s = max(img.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
    sq.resize((256, 256), Image.LANCZOS).save(f'{out}/{k + 1:02d}_{names[k]}.png', optimize=True)
    print(k + 1, names[k], img.size)
