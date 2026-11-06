# The Google Play feature graphic (1024 x 500, no transparency): the jar picture made from the prompt in
# ASSET_PROMPTS.md (assets/fixes/fix6_feature_graphic.webp, square) on the right, its purple background carried
# out to the left, and the GEM JAR logo (assets/fx/logo_gemjar.png) on the left.
#   python3 tools/make_feature_graphic.py  ->  android/store/feature_graphic.png
import pathlib
import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 1024, 500
art = Image.open(ROOT / 'assets/fixes/fix6_feature_graphic.webp').convert('RGB')
S = 560                                         # the square picture this big: the jar fills the right side
art = art.resize((S, S), Image.LANCZOS).crop((0, 26, S, 26 + H))
x0 = W - S
canvas = Image.new('RGB', (W, H))
# the background to the left: the picture's own left edge, blurred and stretched, fading into the picture
edge = art.crop((0, 0, 24, H)).filter(ImageFilter.GaussianBlur(10)).resize((x0 + 80, H), Image.BICUBIC)
canvas.paste(edge, (0, 0))
fade = np.clip(np.linspace(0, 1, 80), 0, 1)
mask = np.concatenate([fade, np.ones(S - 80)])[None, :].repeat(H, 0)
canvas.paste(art, (x0, 0), Image.fromarray((mask * 255).astype(np.uint8)))
# the logo, with a soft shadow, in the middle of the left part
logo = Image.open(ROOT / 'assets/fx/logo_gemjar.png').convert('RGBA')
lw = 430
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
lx, ly = 40, (H - logo.height) // 2 - 10
shadow = Image.new('RGBA', logo.size, (20, 8, 40, 0))
shadow.putalpha(logo.getchannel('A').point(lambda v: v * 0.55))
shadow = shadow.filter(ImageFilter.GaussianBlur(9))
out = canvas.convert('RGBA')
out.alpha_composite(shadow, (lx + 4, ly + 10))
out.alpha_composite(logo, (lx, ly))
dest = ROOT / 'android/store/feature_graphic.png'
dest.parent.mkdir(parents=True, exist_ok=True)
out.convert('RGB').save(dest, optimize=True)
print('wrote', dest.relative_to(ROOT), out.size)
