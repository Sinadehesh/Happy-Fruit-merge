# Builds the signed Android app for Zombie Bomber from the game files in this repo: an App Bundle (.aab)
# to upload to Google Play, and an APK to install directly. The app has AdMob ads (a banner, a
# full-screen ad between levels and rewarded offers), Google Play purchases (No Ads, gem packs, a
# starter pack) and an optional reminder when the daily reward is ready.
#
# What it does: packs the bomber page and only the files it uses (plus Matter.js and the Luckiest Guy font,
# so it plays offline) into android/build-bomber/assets, makes the launcher icons from the TNT bomb into
# android/build-bomber/icons, then builds and signs with Gradle (android/gradlew). The Android SDK set-up
# is shared with the Gem Jar build (tools/build_gem_android.py): Java 17+, Python 3 with Pillow, and
# internet the first time.
#
# AdMob IDs: android/bomber/admob.properties. While any is empty, Google's test ads are used and only a
# "TEST-ADS" APK is made (never a Play bundle), so a test build can't be uploaded by mistake.
#
# Signing key (keep it private, never commit it): BOMBER_KEYSTORE / BOMBER_KEYSTORE_PASS (key alias
# BOMBER_KEY_ALIAS, default "zombiebomber"), or Gem Jar's GEMJAR_KEYSTORE / GEMJAR_KEYSTORE_PASS (alias
# "gemjar") to use the same upload key for both apps, which Google Play allows. Every update must be signed
# with the same key, and the version code must go up by 1.
#
# Usage: BOMBER_KEYSTORE=... BOMBER_KEYSTORE_PASS=... python3 tools/build_bomber_android.py [version_name] [version_code]
# Output: android/build-bomber/ZombieBomber-<version_name>.aab and ZombieBomber-<version_name>.apk
import os, re, shutil, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_gem_android as gem   # the SDK set-up and download helpers

ROOT, ANDROID = gem.ROOT, gem.ANDROID
APP = ANDROID / 'bomber'
BUILD = ANDROID / 'build-bomber'
VERSION_NAME = sys.argv[1] if len(sys.argv) > 1 else '1.0'
VERSION_CODE = sys.argv[2] if len(sys.argv) > 2 else '1'
AD_KEYS = ('app_id', 'banner_id', 'interstitial_id', 'rewarded_revive_id', 'rewarded_double_id', 'rewarded_coins_id', 'rewarded_boost_id', 'rewarded_bonus_id')
VENDOR = {      # what the web page loads from the internet, packed into the app instead
    'bomber/vendor/matter.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js',
    'bomber/vendor/luckiest-guy-latin.woff2': 'https://fonts.gstatic.com/s/luckiestguy/v25/_gP_1RrxsjcxVyin9l9n_j2hTd52.woff2',
    'bomber/vendor/luckiest-guy-latin-ext.woff2': 'https://fonts.gstatic.com/s/luckiestguy/v25/_gP_1RrxsjcxVyin9l9n_j2hQ952mDo.woff2',
}


def admob_ids():
    ids = {}
    for line in (APP / 'admob.properties').read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            ids[k.strip()] = v.strip()
    return ids


def build_www(www):
    """The bomber page and only the files it uses, set up to run offline. Same folders as on the website
    (www/bomber/ and www/assets/bomber/), so the game's own paths work unchanged."""
    shutil.rmtree(www, ignore_errors=True)
    (www / 'bomber').mkdir(parents=True)
    html = (ROOT / 'bomber' / 'index.html').read_text()

    def swap(old, new):
        nonlocal html
        assert html.count(old) == 1, old
        html = html.replace(old, new)
    swap('    <link rel="preconnect" href="https://fonts.googleapis.com">\n', '')
    swap('    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n', '')
    swap('    <link href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap" rel="stylesheet">\n',
         "    <style>\n"
         "        @font-face { font-family: 'Luckiest Guy'; font-display: swap; src: url('vendor/luckiest-guy-latin.woff2') format('woff2');\n"
         "            unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }\n"
         "        @font-face { font-family: 'Luckiest Guy'; font-display: swap; src: url('vendor/luckiest-guy-latin-ext.woff2') format('woff2');\n"
         "            unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }\n"
         "    </style>\n")
    swap('<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>',
         '<script src="vendor/matter.min.js"></script>')
    assert 'https://' not in html, 'the app page must not load anything from the internet'
    (www / 'bomber' / 'index.html').write_text(html)

    for js in ('ads.js', 'meta.js', 'world.js', 'shapes.js', 'bomber.js'):
        shutil.copy(ROOT / 'bomber' / js, www / 'bomber' / js)
    cache = gem.SDK / 'web-cache'
    for name, url in VENDOR.items():
        if not (cache / name).exists():
            print('downloading', url)
            gem.fetch(url, cache / name)
        (www / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(cache / name, www / name)

    # the art the game loads (its sprite lists in bomber.js), not the source sheets
    game = (ROOT / 'bomber' / 'bomber.js').read_text()
    ui = re.findall(r"'(\w+)'", re.search(r'const UI_SPRITES = \[(.*?)\];', game, re.S).group(1))
    art = ['assets/bomber/plane.png', 'assets/bomber/bg_city.webp', 'assets/bomber/bg_ruins.webp']
    for pattern in ('bombs/[0-9]*.png', 'zombies/[0-9]*.png', 'zombies2/[0-9]*.png', 'shots/*.png', 'soldiers/[0-9]*.png', 'base/[0-9]*.png'):
        art += [str(f.relative_to(ROOT)) for f in sorted((ROOT / 'assets' / 'bomber').glob(pattern))]
    art += [f'assets/bomber/ui/{n}.png' for n in ui]
    for a in art:
        dest = www / a
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT / a, dest)
    print(f'  {len(art)} art files')


def make_icons(res):
    """Launcher icons: the TNT bomb on a dusk sky, the game's blood-moon purple fading to orange."""
    bomb = Image.open(ROOT / 'assets/bomber/bombs/05_tnt.png').convert('RGBA')
    bomb = bomb.crop(bomb.getbbox())

    def tile(size, shape):
        top, bottom = (44, 27, 77), (179, 55, 113)
        bg = Image.new('RGBA', (size, size))
        d = ImageDraw.Draw(bg)
        for y in range(size):
            t = y / max(1, size - 1)
            d.line([(0, y), (size, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)) + (255,))
        glow = Image.new('L', (size, size), 0)       # a warm blast of light behind the bomb
        ImageDraw.Draw(glow).ellipse([size * 0.16, size * 0.2, size * 0.84, size * 0.88], fill=150)
        glow = glow.filter(ImageFilter.GaussianBlur(size * 0.13))
        bg = Image.composite(Image.new('RGBA', (size, size), (255, 159, 67, 255)), bg, glow)
        if shape == 'full':
            return bg
        mask = Image.new('L', (size, size), 0)
        if shape == 'round':
            ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
        else:
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 0.22, fill=255)
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(bg, (0, 0), mask)
        return out

    def with_bomb(base, share):
        s = base.size[0]
        k = s * share / max(bomb.size)
        b = bomb.resize((round(bomb.width * k), round(bomb.height * k)), Image.LANCZOS).rotate(-10, expand=True, resample=Image.BICUBIC)
        shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
        a = b.split()[3].point(lambda v: v * 0.4)
        shadow.paste((30, 6, 30, 255), ((s - b.width) // 2, (s - b.height) // 2 + int(s * 0.035)), a)
        base = Image.alpha_composite(base, shadow.filter(ImageFilter.GaussianBlur(s * 0.02)))
        base.alpha_composite(b, ((s - b.width) // 2, (s - b.height) // 2))
        return base

    for folder, k in (('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3), ('xxxhdpi', 4)):
        d = res / f'mipmap-{folder}'
        d.mkdir(parents=True, exist_ok=True)
        with_bomb(tile(int(48 * k), 'square'), 0.74).save(d / 'ic_launcher.png')
        with_bomb(tile(int(48 * k), 'round'), 0.66).save(d / 'ic_launcher_round.png')
        # adaptive icon (Android 8+): 108dp layers, the bomb inside the 66dp safe circle
        tile(int(108 * k), 'full').save(d / 'ic_launcher_background.png')
        with_bomb(Image.new('RGBA', (int(108 * k),) * 2, (0, 0, 0, 0)), 0.55).save(d / 'ic_launcher_foreground.png')
        # the reminder notification's small icon: Android shows only its shape, in white
        sd = res / f'drawable-{folder}'
        sd.mkdir(parents=True, exist_ok=True)
        size = int(24 * k)
        b = bomb.copy()
        b.thumbnail((size - 2, size - 2), Image.LANCZOS)
        stat = Image.new('RGBA', (size, size), (255, 255, 255, 0))
        stat.paste(Image.new('RGBA', b.size, (255, 255, 255, 255)), ((size - b.width) // 2, (size - b.height) // 2), b.split()[3])
        stat.save(sd / 'ic_stat_bomb.png')
    with_bomb(tile(512, 'full'), 0.72).convert('RGB').save(BUILD / 'store_icon_512.png')   # for the Play Store listing


def main():
    ks = os.environ.get('BOMBER_KEYSTORE') or os.environ.get('GEMJAR_KEYSTORE')
    ks_pass = os.environ.get('BOMBER_KEYSTORE_PASS') or os.environ.get('GEMJAR_KEYSTORE_PASS')
    if not ks or not ks_pass or not Path(ks).exists():
        sys.exit('Set BOMBER_KEYSTORE (the .jks file) and BOMBER_KEYSTORE_PASS, or Gem Jar\'s GEMJAR_KEYSTORE and GEMJAR_KEYSTORE_PASS, to sign the app.')
    ids = admob_ids()
    test_ads = not all(ids.get(k) for k in AD_KEYS)
    build_tools, bundletool = gem.ensure_sdk()
    shutil.rmtree(BUILD, ignore_errors=True)
    BUILD.mkdir(parents=True)

    print('packing the game')
    build_www(BUILD / 'assets' / 'www')
    make_icons(BUILD / 'icons')

    print('building with Gradle' + ('  (TEST ADS: admob.properties is not filled in)' if test_ads else ''))
    tasks = [':bomber:assembleRelease'] + ([] if test_ads else [':bomber:bundleRelease'])
    env = dict(os.environ, ANDROID_HOME=str(gem.SDK))
    key = 'BOMBER_KEYSTORE' if os.environ.get('BOMBER_KEYSTORE') else 'GEMJAR_KEYSTORE'
    env[key] = str(Path(ks).resolve())
    gem.run(ANDROID / 'gradlew', '-p', ANDROID, '--no-daemon', '-q', '--max-workers=2', f'-PversionCode={VERSION_CODE}', f'-PversionName={VERSION_NAME}',
            *tasks, env=env)

    outputs = APP / 'build' / 'outputs'
    tag = '-TEST-ADS' if test_ads else ''
    apk = BUILD / f'ZombieBomber-{VERSION_NAME}{tag}.apk'
    shutil.copy(outputs / 'apk' / 'release' / 'bomber-release.apk', apk)
    gem.run(build_tools / 'apksigner', 'verify', apk)
    made = [apk]
    if not test_ads:
        aab = BUILD / f'ZombieBomber-{VERSION_NAME}.aab'
        shutil.copy(outputs / 'bundle' / 'release' / 'bomber-release.aab', aab)
        gem.run('jarsigner', '-verify', aab, stdout=subprocess.DEVNULL)
        gem.run('java', '-jar', bundletool, 'validate', f'--bundle={aab}', stdout=subprocess.DEVNULL)
        made.insert(0, aab)
    for f in made:
        print(f'{f} ({f.stat().st_size / 1e6:.1f} MB)')
    if test_ads:
        print('\nTEST ADS build: fill in android/bomber/admob.properties to build the real app and the Play bundle.')


if __name__ == '__main__':
    main()
