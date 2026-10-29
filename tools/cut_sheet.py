# Usage: python3 tools/cut_sheet.py sheet.jpg out_dir name1,name2,...
# Cut a grid sprite sheet on a white background into 256x256 transparent PNGs
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
a = np.array(Image.open(src).convert('RGB')).astype(int)
H, W = a.shape[:2]
fg = a.min(axis=2) < 230
def runs(v):
    r, s = [], None
    for i, x in enumerate(list(v) + [False]):
        if x and s is None: s = i
        if not x and s is not None:
            if i - s > 40: r.append((s, i))
            s = None
    return r
rows, cols = runs(fg.sum(1) > 3), runs(fg.sum(0) > 3)
print(rows, cols)
k = 0
for (y0, y1) in rows:
    for (x0, x1) in cols:
        y0p, y1p, x0p, x1p = max(0, y0-8), min(H, y1+8), max(0, x0-8), min(W, x1+8)
        cell = a[y0p:y1p, x0p:x1p]
        # background = light, unsaturated pixels connected to the cell border
        light = (cell.min(axis=2) > 222) & ((cell.max(axis=2) - cell.min(axis=2)) < 28)
        lab, _ = ndimage.label(light)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.isin(lab, list(border))
        alpha = ndimage.binary_erosion(~bg, iterations=1).astype(np.uint8) * 255
        alpha = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8)))
        img = Image.fromarray(np.dstack([cell.astype(np.uint8), alpha]), 'RGBA')
        img = img.crop(img.getbbox())
        s = max(img.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
        sq.resize((256, 256), Image.LANCZOS).save(f'{out}/{k+1:02d}_{names[k]}.png', optimize=True)
        print(k + 1, names[k], img.size); k += 1
