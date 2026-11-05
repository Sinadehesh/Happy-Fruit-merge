# Cut a saturated glowing item from a white sheet: the colourful body stays solid, and the pale glow
# around it becomes a real see-through halo (its colour un-blended from the white behind it).
# Usage: python3 tools/cut_glow.py sheet x0,y0,x1,y1 out.png
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src, box, out = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], sys.argv[3]
x0, y0, x1, y1 = box
cell = np.array(Image.open(src).convert('RGB')).astype(float)[y0:y1, x0:x1]
mn, mx = cell.min(axis=2), cell.max(axis=2)
core = ((mn < 175) & (mx - mn > 70)) | (mx < 120)
core = ndimage.binary_closing(core, structure=np.ones((3, 3)), iterations=3)
lab, n = ndimage.label(core)
sizes = ndimage.sum(core, lab, range(1, n + 1))
core = ndimage.binary_fill_holes(lab == np.argmax(sizes) + 1)
core = ndimage.binary_erosion(core, iterations=1)
core_a = np.array(Image.fromarray(core.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.9))) / 255.0
# halo: how far from white, un-blended from the white background
ga = np.clip((252 - mn) / 110.0, 0, 1) ** 1.2
ga = np.array(Image.fromarray((ga * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))) / 255.0 * 0.85
# fade the halo out before the edges of the box, so no square shows
h, w = mn.shape
yy, xx = np.mgrid[0:h, 0:w]
r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
ga *= np.clip((1.0 - r) / 0.3, 0, 1)
safe = np.maximum(ga, 1e-3)[..., None]
glow_rgb = np.clip((cell - (1 - safe) * 255) / safe, 0, 255)
a = np.maximum(core_a, ga)
rgb = cell * core_a[..., None] + glow_rgb * (1 - core_a[..., None])
# crop close to the solid body (so it fills the sprite like the other items); the halo fades out in a thin margin
ys, xs = np.nonzero(core)
m = int(0.07 * max(xs.max() - xs.min(), ys.max() - ys.min()))
bx0, by0, bx1, by1 = max(0, xs.min() - m), max(0, ys.min() - m), min(w, xs.max() + m + 1), min(h, ys.max() + m + 1)
edge = np.minimum.reduce([xx - bx0, bx1 - 1 - xx, yy - by0, by1 - 1 - yy]).astype(float)
a = np.maximum(core_a, ga * np.clip(edge / max(1, m), 0, 1))
img = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), 'RGBA').crop((bx0, by0, bx1, by1))
s = max(img.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
sq.resize((256, 256), Image.LANCZOS).save(out, optimize=True)
print(out, img.size)
