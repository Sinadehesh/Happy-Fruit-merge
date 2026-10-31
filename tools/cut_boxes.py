# Cut named boxes from a sheet on a plain background (any colour) into tight transparent PNGs (no fringe).
# Usage: python3 tools/cut_boxes.py sheet out_dir name:x0,y0,x1,y1 [name:x0,y0,x1,y1 ...] [--full]
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

args = [x for x in sys.argv[1:] if x != '--full']
FULL = '--full' in sys.argv   # keep full sheet resolution instead of capping at 256 px
src, out = args[0], args[1]
a = np.array(Image.open(src).convert('RGB'))
# background colour = the median colour around the sheet's edge (white, pink, ...)
ai_full = a.astype(int)
BG = np.median(np.concatenate([ai_full[:5].reshape(-1, 3), ai_full[-5:].reshape(-1, 3),
                               ai_full[:, :5].reshape(-1, 3), ai_full[:, -5:].reshape(-1, 3)]), axis=0)
for spec in args[2:]:
    name, box = spec.split(':')
    x0, y0, x1, y1 = [int(v) for v in box.split(',')]
    pad = 6
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(a.shape[1], x1 + pad), min(a.shape[0], y1 + pad)
    cell = a[y0:y1, x0:x1]
    ci = cell.astype(int)
    light = np.sqrt(((ci - BG) ** 2).sum(axis=2)) < 45   # close to the background colour
    lab, _ = ndimage.label(light)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m = ndimage.binary_erosion(~np.isin(lab, list(edge)), iterations=1)
    alpha = np.array(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.7)))
    img = Image.fromarray(np.dstack([cell, alpha]), 'RGBA')
    img = img.crop(Image.fromarray(alpha).getbbox())
    if max(img.size) > 256 and not FULL:
        k = 256 / max(img.size)
        img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    img.save(f'{out}/{name}.png', optimize=True)
    print(name, img.size)
