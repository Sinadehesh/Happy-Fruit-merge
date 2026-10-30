# Cut named boxes from a sheet on a white background into tight transparent PNGs (no white fringe).
# Usage: python3 tools/cut_boxes.py sheet out_dir name:x0,y0,x1,y1 [name:x0,y0,x1,y1 ...]
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
a = np.array(Image.open(src).convert('RGB'))
for spec in sys.argv[3:]:
    name, box = spec.split(':')
    x0, y0, x1, y1 = [int(v) for v in box.split(',')]
    pad = 6
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(a.shape[1], x1 + pad), min(a.shape[0], y1 + pad)
    cell = a[y0:y1, x0:x1]
    ci = cell.astype(int)
    light = (ci.min(axis=2) > 215) & ((ci.max(axis=2) - ci.min(axis=2)) < 35)
    lab, _ = ndimage.label(light)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m = ndimage.binary_erosion(~np.isin(lab, list(edge)), iterations=1)
    alpha = np.array(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.7)))
    img = Image.fromarray(np.dstack([cell, alpha]), 'RGBA')
    img = img.crop(Image.fromarray(alpha).getbbox())
    if max(img.size) > 256:
        k = 256 / max(img.size)
        img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    img.save(f'{out}/{name}.png', optimize=True)
    print(name, img.size)
