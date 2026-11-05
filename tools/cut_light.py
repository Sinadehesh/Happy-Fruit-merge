# Cut a pale item (frosted or clear) from a white sheet: anything not near-pure white is ink, the outline is
# sealed with a closing and the inside filled, so white highlights inside the item stay solid.
# Usage: python3 tools/cut_light.py sheet x0,y0,x1,y1 out.png [threshold]
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src, box, out = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], sys.argv[3]
T = int(sys.argv[4]) if len(sys.argv) > 4 else 246
x0, y0, x1, y1 = box
cell = np.array(Image.open(src).convert('RGB')).astype(int)[y0:y1, x0:x1]
mn, mx = cell.min(axis=2), cell.max(axis=2)
ink = (mn < T) | (mx - mn > 12)
ink = ndimage.binary_closing(ink, structure=np.ones((3, 3)), iterations=4)
lab, n = ndimage.label(ink)
sizes = ndimage.sum(ink, lab, range(1, n + 1))
mask = ndimage.binary_fill_holes(lab == np.argmax(sizes) + 1)
mask = ndimage.binary_erosion(mask, iterations=1)
a = np.array(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.8)))
img = Image.fromarray(np.dstack([cell.astype(np.uint8), a]), 'RGBA')
img = img.crop(img.getbbox())
s = max(img.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
sq.resize((256, 256), Image.LANCZOS).save(out, optimize=True)
print(out, img.size)
