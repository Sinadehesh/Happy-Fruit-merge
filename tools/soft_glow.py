# Re-cut one glowing item from a sheet on white: keep the solid object, turn its baked-in glow
# into a soft see-through halo that fades out (instead of a hard-edged blob).
# Usage: python3 tools/soft_glow.py sheet x0,y0,x1,y1 out.png R,G,B
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, box, out, glow_rgb = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], sys.argv[3], [int(v) for v in sys.argv[4].split(',')]
x0, y0, x1, y1 = box
cell = np.array(Image.open(src).convert('RGB')).astype(int)[y0:y1, x0:x1]
mx, mn = cell.max(axis=2), cell.min(axis=2)
# solid object: dark paint/outline, or greyish metal parts (low saturation, not white)
core = (mx < 130) | ((mx - mn < 40) & (mn < 190))
core = ndimage.binary_closing(core, iterations=3)
lab, n = ndimage.label(core)
sizes = ndimage.sum(core, lab, range(1, n + 1))
core = ndimage.binary_fill_holes(lab == (np.argmax(sizes) + 1))
body_a = np.array(Image.fromarray(core.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.8)))
# glow strength from how far each pixel is from white, outside the object
strength = np.clip((255 - mn) / 255.0, 0, 1) ** 1.3
strength[core] = 0
glow_a = (np.array(Image.fromarray((strength * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))) * 0.6).astype(np.uint8)
glow = Image.new('RGBA', (cell.shape[1], cell.shape[0]), tuple(glow_rgb) + (0,)); glow.putalpha(Image.fromarray(glow_a))
body = Image.fromarray(np.dstack([cell.astype(np.uint8), body_a]), 'RGBA')
img = Image.alpha_composite(glow, body)
img = img.crop(img.getbbox())
s = max(img.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
sq.resize((256, 256), Image.LANCZOS).save(out, optimize=True)
