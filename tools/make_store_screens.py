# The Google Play phone screenshots for Gem Jar (1080 x 1920): a headline, a real screen from the game
# (captured by tools/store_capture.js into android/store/captures/) and real gems from the sets around it.
#   node tools/store_capture.js android/store/captures   (then save the shots as .jpg, quality 92)
#   python3 tools/make_store_screens.py <TitanOne.ttf>      ->  android/store/screenshots/gemjar-screenshot-1..8.png
# The captions keep to what the game really has (11 sets, 132 gems, 20 stages, 60 stars) and avoid words Google
# Play doesn't allow on store graphics ("free", "#1", "best", "download now").
import sys, math, pathlib, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAP, OUT, A = ROOT / 'android/store/captures', ROOT / 'android/store/screenshots', ROOT / 'assets'
FONT = sys.argv[1]
W, H = 1080, 1920

def gem(path):
    return Image.open(A / path).convert('RGBA')

def g(set_, n):
    return next((A / set_).glob(f'{n:02d}_*.png')).relative_to(A).as_posix()

def background():
    top, bot = (132, 84, 232), (52, 26, 120)
    bg = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-200, 120, W + 200, 1500), fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    bg = Image.composite(Image.new('RGB', (W, H), (196, 150, 255)), bg, glow.point(lambda v: v // 2))
    rnd = random.Random(7)
    sp = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sp)
    for _ in range(70):
        x, y, r = rnd.randrange(W), rnd.randrange(H), rnd.choice([2, 2, 3, 4])
        ds.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, rnd.randrange(60, 170)))
    out = bg.convert('RGBA'); out.alpha_composite(sp)
    return out

def headline(img, line1, line2):
    d = ImageDraw.Draw(img)
    for text, y, size, fill in ((line1, 70, 104, (255, 255, 255)), (line2, 190, 104, (255, 214, 92))):
        f = ImageFont.truetype(FONT, size)
        while d.textlength(text, font=f) > W - 90: size -= 4; f = ImageFont.truetype(FONT, size)
        w = d.textlength(text, font=f); x = (W - w) / 2
        sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((x, y + 10), text, font=f, fill=(30, 10, 70, 150), stroke_width=10, stroke_fill=(30, 10, 70, 150))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
        d.text((x, y), text, font=f, fill=fill, stroke_width=9, stroke_fill=(58, 24, 120))

def screen(img, name, width=700, top=360):
    s = Image.open(CAP / f'{name}.jpg').convert('RGBA')
    h = round(s.height * width / s.width)
    s = s.resize((width, h), Image.LANCZOS)
    if top + h > H - 50: s = s.crop((0, 0, width, H - 50 - top)); h = s.height
    r = 46
    mask = Image.new('L', s.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, h - 1), r, fill=255)
    x = (W - width) // 2
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x - 4, top + 24, x + width + 4, top + h + 30), r + 6, fill=(20, 6, 50, 170))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)))
    frame = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle((x - 12, top - 12, x + width + 12, top + h + 12), r + 12, fill=(255, 255, 255, 235))
    img.alpha_composite(frame)
    img.paste(s, (x, top), mask)

def float_gem(img, path, cx, cy, size, angle=0):
    gm = gem(path).resize((size, size), Image.LANCZOS).rotate(angle, resample=Image.BICUBIC, expand=True)
    sh = Image.new('RGBA', gm.size, (20, 6, 50, 0)); sh.putalpha(gm.getchannel('A').point(lambda v: v * 0.55))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)), (round(cx - gm.width / 2 + 8), round(cy - gm.height / 2 + 18)))
    img.alpha_composite(gm, (round(cx - gm.width / 2), round(cy - gm.height / 2)))

def sticker(img, text, cx, cy):
    f = ImageFont.truetype(FONT, 50)
    d = ImageDraw.Draw(img); w = d.textlength(text, font=f)
    box = (cx - w / 2 - 34, cy - 46, cx + w / 2 + 34, cy + 46)
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle(box, 46, fill=(20, 6, 50, 150))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)), (6, 12))
    d.rounded_rectangle(box, 46, fill=(255, 92, 140), outline=(255, 255, 255), width=6)
    d.text((cx - w / 2, cy - 33), text, font=f, fill=(255, 255, 255), stroke_width=4, stroke_fill=(150, 30, 80))

SHOTS = [
    ('Can you make', 'the Diamond?', 'play_rocks', [(g('rocks', 12), 120, 1640, 230, -12), (g('rocks', 10), 975, 600, 170, 14), (g('rocks', 9), 965, 1400, 190, -8), (g('rocks', 11), 110, 760, 160, 10)], None),
    ('Collect all', '11 gem sets', 'collection', [(g('pets', 12), 120, 1700, 200, -10), (g('neon', 12), 965, 1690, 200, 10), (g('cosmic', 12), 985, 520, 170, 12), (g('pixel', 12), 95, 560, 160, -12), (g('volcano', 12), 990, 1110, 150, 0), (g('cyber', 12), 90, 1150, 150, 0)], '132 gems'),
    ('Cute pets', 'made of gems', 'play_pets', [(g('pets', 11), 125, 1650, 230, -10), (g('pets', 12), 965, 1640, 220, 10), (g('pets', 8), 970, 620, 180, 12), (g('pets', 1), 105, 700, 160, -10)], None),
    ('Neon, Pixel,', 'Cyber & more', 'play_neon', [(g('pixel', 11), 120, 1660, 210, -10), (g('cyber', 12), 965, 1650, 210, 8), (g('odd', 11), 975, 620, 170, 12), (g('pixel', 12), 100, 700, 170, -10)], None),
    ('Dig into the', 'Gem Mine', 'map', [('mine/crate.png', 120, 1680, 220, -8), ('mine/icon_pickaxe.png', 965, 1670, 220, 12), (g('crystal', 12), 980, 600, 160, 10), ('mine/lantern.png', 95, 640, 150, -6)], '20 stages'),
    ('Break crates,', 'beat the boss', 'stage', [('mine/crate_strong.png', 125, 1660, 230, -10), ('mine/crate.png', 960, 1680, 200, 10), (g('crystal', 9), 975, 620, 170, 12), (g('crystal', 6), 105, 680, 150, -10)], None),
    ('Win stars,', 'open rare sets', 'newset', [(g('pixel', 12), 120, 1650, 220, -10), (g('pixel', 11), 965, 1650, 210, 10), (g('odd', 12), 975, 620, 170, 12), (g('pixel', 10), 105, 680, 160, -10)], '60 stars'),
    ('New rewards', 'every day', 'menu', [(g('cosmic', 12), 120, 1650, 210, -10), (g('royal', 12), 965, 1650, 210, 10), (g('ocean', 12), 980, 620, 160, 12), (g('volcano', 12), 100, 680, 160, -10)], None),
]

OUT.mkdir(parents=True, exist_ok=True)
for i, (l1, l2, shot, floats, badge) in enumerate(SHOTS, start=1):
    img = background()
    headline(img, l1, l2)
    screen(img, shot)
    for path, cx, cy, size, ang in floats: float_gem(img, path, cx, cy, size, ang)
    if badge: sticker(img, badge, W // 2, 1815)
    img.convert('RGB').save(OUT / f'gemjar-screenshot-{i}.png', optimize=True)
    print('wrote', f'gemjar-screenshot-{i}.png')
