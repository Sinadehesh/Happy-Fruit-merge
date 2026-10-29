# Usage: python3 tools/make_shapes.py shapes.js assets/farm/[01]*.png assets/barn/[01]*.png assets/cars/[01]*.png assets/cars_flat/[01]*.png assets/cars_candy/[01]*.png
# Trace a convex outline of each sprite (largest opaque blob, so sparkles/glow are ignored)
import sys, json, glob
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import ConvexHull

def simplify(pts, n):
    # drop the vertex contributing the least area until n remain
    pts = list(map(tuple, pts))
    while len(pts) > n:
        best, bi = None, 0
        for i in range(len(pts)):
            a, b, c = np.array(pts[i-1]), np.array(pts[i]), np.array(pts[(i+1) % len(pts)])
            u, v = b - a, c - a; area = abs(u[0] * v[1] - u[1] * v[0]) / 2
            if best is None or area < best: best, bi = area, i
        pts.pop(bi)
    return pts

out = {}
for path in sorted(sys.argv[2:]):
    a = np.array(Image.open(path).convert('RGBA'))[..., 3]
    m = a > 160
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    m = lab == (np.argmax(sizes) + 1)
    ys, xs = np.nonzero(m)
    pts = np.stack([xs + 0.5, ys + 0.5], 1)
    hull = pts[ConvexHull(pts).vertices]
    out[path] = [[round(x, 1), round(y, 1)] for x, y in simplify(hull, 18)]
with open(sys.argv[1], 'w') as f:
    f.write('// Generated: convex outline of each sprite in 256x256 sprite pixels, used as its hitbox.\n')
    f.write('const SHAPES = ' + json.dumps(out, indent=0).replace('\n', '') + ';\n')
print(len(out))
