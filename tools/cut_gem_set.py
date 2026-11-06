# Cuts a 12-gem set sheet (3 rows of 4 on a white background, made from the prompts in ASSET_PROMPTS.md)
# into assets/<set>/01_<name>.png ... 12_<name>.png, 256x256 transparent PNGs, and keeps the sheet there as
# source_sheet.webp. It finds the 12 gems itself (reading order), cuts each with tools/cut_light.py (any item
# on white, pale ones too: the whole shape becomes solid), and the glowing ones with tools/cut_glow.py (solid
# body, see-through halo).
#   python3 tools/cut_gem_set.py sheet.webp <set> name1,...,name12 [glowing item numbers, e.g. 12]
# Then add the set to MODES in game.js, to skins in tools/make_gems_page.py, to GEM_SETS in
# tools/build_gem_android.py, and run tools/make_shapes.py (see README.md).
import sys, shutil, subprocess, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent
src, name, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
glowing = {int(n) for n in sys.argv[4].split(',')} if len(sys.argv) > 4 else set()
assert len(names) == 12, 'a set has 12 gems'
out = ROOT / 'assets' / name
out.mkdir(parents=True, exist_ok=True)

a = np.asarray(Image.open(src).convert('RGB')).astype(int)
H, W, _ = a.shape
ink = (a.min(axis=2) < 238) | (a.max(axis=2) - a.min(axis=2) > 18)
lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=3))   # each gem with its glow as one piece (more would join a wide gem, like a ringed planet, to its neighbours)
sizes = ndimage.sum(ink, lab, range(1, n + 1))
keep = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:12]
boxes = [ndimage.find_objects(lab)[i - 1] for i in keep]
# reading order: three rows by their middle, then left to right
boxes.sort(key=lambda b: (b[0].start + b[0].stop) / 2)
rows = [boxes[0:4], boxes[4:8], boxes[8:12]]
order = [b for r in rows for b in sorted(r, key=lambda b: b[1].start)]
for k, (ys, xs) in enumerate(order):
    pad = 6
    box = f'{max(0, xs.start - pad)},{max(0, ys.start - pad)},{min(W, xs.stop + pad)},{min(H, ys.stop + pad)}'
    tool = 'cut_glow.py' if k + 1 in glowing else 'cut_light.py'
    dest = out / f'{k + 1:02d}_{names[k]}.png'
    subprocess.run([sys.executable, str(ROOT / 'tools' / tool), src, box, str(dest)], check=True)
shutil.copy(src, out / ('source_sheet' + pathlib.Path(src).suffix))
print('cut', name, 'into', out.relative_to(ROOT))
