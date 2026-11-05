# Builds the signed Android app for Gem Jar from the game files in this repo: an App Bundle (.aab)
# to upload to Google Play, and an APK to install directly. The app has AdMob ads (a banner and a
# full-screen ad between games) and a one-time "No Ads" purchase through Google Play.
#
# What it does: packs the gem page and only the files it uses (plus Matter.js and the Poppins font, so
# it plays offline) into android/build/assets, makes the launcher icons from the diamond into
# android/build/icons, then builds and signs with Gradle (android/gradlew, Android Gradle plugin).
# Needs Java 17+, Python 3 with Pillow, and internet the first time: it installs the Android SDK
# pieces it needs into $ANDROID_SDK (default ~/.cache/android-sdk-gradle), accepting the Android SDK
# license, and Gradle downloads itself and the ads and billing libraries.
#
# AdMob IDs: android/gemjar/admob.properties. While they are empty, Google's test ads are used and only
# a "TEST-ADS" APK is made (never a Play bundle), so a test build can't be uploaded by mistake.
#
# Signing key (keep it private, never commit it): GEMJAR_KEYSTORE = path to the .jks file,
# GEMJAR_KEYSTORE_PASS = its password, key alias "gemjar". On Google Play it is the upload key.
# Every update must be signed with the same key, and the version code must go up by 1.
#
# Usage: GEMJAR_KEYSTORE=... GEMJAR_KEYSTORE_PASS=... python3 tools/build_gem_android.py [version_name] [version_code]
# Output: android/build/GemJar-<version_name>.aab and GemJar-<version_name>.apk
import hashlib, os, re, shutil, subprocess, sys, urllib.request, zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ANDROID = ROOT / 'android'
APP = ANDROID / 'gemjar'
BUILD = ANDROID / 'build'
SDK = Path(os.environ.get('ANDROID_SDK', Path.home() / '.cache' / 'android-sdk-gradle'))
VERSION_NAME = sys.argv[1] if len(sys.argv) > 1 else '1.0'
VERSION_CODE = sys.argv[2] if len(sys.argv) > 2 else '1'

CMDLINE_TOOLS = ('commandlinetools-linux-16111833_latest.zip', 'e025545c62a8e64c7559119566a569fb1dec5f60')
SDK_PACKAGES = ['platforms;android-36', 'build-tools;36.1.0']   # keep in step with android/gemjar/build.gradle.kts
BUNDLETOOL = 'https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar'
GEM_SETS = ['rocks', 'crystal']   # art folders of the gem sets in the gem page's GAME_SETUP skins
VENDOR = {      # files the web page loads from the internet, packed into the app instead
    'matter.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js',
    'fonts/poppins-600.woff2': 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.0.8/files/poppins-latin-600-normal.woff2',
    'fonts/poppins-700.woff2': 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.0.8/files/poppins-latin-700-normal.woff2',
    'fonts/poppins-800.woff2': 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.0.8/files/poppins-latin-800-normal.woff2',
}


def run(*cmd, **kw):
    print('  $', ' '.join(str(c) for c in cmd)[:160])
    subprocess.run([str(c) for c in cmd], check=True, **kw)


def fetch(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as r, open(dest, 'wb') as f:
        shutil.copyfileobj(r, f)


def ensure_sdk():
    """The Android SDK pieces Gradle needs, installed with Google's sdkmanager; and bundletool for checking."""
    sdkmanager = SDK / 'cmdline-tools' / 'latest' / 'bin' / 'sdkmanager'
    if not sdkmanager.exists():
        zname, sha1 = CMDLINE_TOOLS
        z = SDK / 'dl' / zname
        print('downloading the Android SDK command-line tools')
        fetch('https://dl.google.com/android/repository/' + zname, z)
        assert hashlib.sha1(z.read_bytes()).hexdigest() == sha1, 'bad download: ' + zname
        tmp = SDK / 'tmp'
        shutil.rmtree(tmp, ignore_errors=True)
        run('unzip', '-q', z, '-d', tmp)            # unzip keeps the run permissions
        (SDK / 'cmdline-tools').mkdir(parents=True, exist_ok=True)
        (tmp / 'cmdline-tools').rename(SDK / 'cmdline-tools' / 'latest')
        shutil.rmtree(tmp)
    missing = [p for p in SDK_PACKAGES if not (SDK / p.replace(';', '/')).exists()]
    if missing:
        subprocess.run([str(sdkmanager), f'--sdk_root={SDK}', '--licenses'], input='y\n' * 20, text=True, capture_output=True)
        run(sdkmanager, f'--sdk_root={SDK}', *missing)
    jar = SDK / 'bundletool' / BUNDLETOOL.rsplit('/', 1)[1]
    if not jar.exists():
        print('downloading bundletool')
        fetch(BUNDLETOOL, jar)
    return SDK / 'build-tools' / '36.1.0', jar


def admob_ids():
    ids = {}
    for line in (APP / 'admob.properties').read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            ids[k.strip()] = v.strip()
    return ids


def build_www(www):
    """The gem game page and only the files it uses, set up to run offline."""
    shutil.rmtree(www, ignore_errors=True)
    www.mkdir(parents=True)
    html = (ROOT / 'gems' / 'index.html').read_text()
    setup = re.search(r'window\.GAME_SETUP = \{.*?\};', html, re.S).group(0)
    praise = re.findall(r"'(\w+)'", re.search(r'praise: \[(.*?)\]', setup).group(1))

    def swap(old, new):
        nonlocal html
        assert html.count(old) == 1, old
        html = html.replace(old, new)
    swap('    <base href="../">\n', '')
    swap('    <link rel="preconnect" href="https://fonts.googleapis.com">\n', '')
    swap('    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n', '')
    swap('    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">\n',
         '    <style>\n' + ''.join(
             f"        @font-face {{ font-family: 'Poppins'; font-weight: {w}; font-display: swap; src: url('fonts/poppins-{w}.woff2') format('woff2'); }}\n"
             for w in (600, 700, 800)) + '    </style>\n')
    swap('<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>',
         '<script src="matter.min.js"></script>')
    assert 'https://' not in html, 'the app page must not load anything from the internet'
    (www / 'index.html').write_text(html)

    for js in ('config.js', 'shapes.js', 'ads.js', 'fx.js', 'sound.js', 'haptics.js', 'game.js'):
        shutil.copy(ROOT / js, www / js)
    cache = SDK / 'web-cache'
    for name, url in VENDOR.items():
        if not (cache / name).exists():
            print('downloading', url)
            fetch(url, cache / name)
        (www / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(cache / name, www / name)

    def copy(pattern, skip=()):
        for f in ROOT.glob(pattern):
            if any(s in f.name for s in skip):
                continue
            dest = www / f.relative_to(ROOT)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(f, dest)
    for gem_set in GEM_SETS:
        copy(f'assets/{gem_set}/*.png')
    copy('assets/fx/*.png', skip=('sheet',))
    copy('assets/sfx/*.wav', skip=('voice_',))
    copy('assets/sfx/CREDITS.txt')
    for v in praise + ['congratulations', 'new_highscore', 'game_over']:
        copy(f'assets/voice/{v}.mp3')
    copy('assets/voice/CREDITS.txt')
    copy('assets/music/*')
    copy('assets/ui/*.png')


def make_icons(res):
    """Launcher icons from the diamond: a jewel-purple tile with the diamond on it."""
    gem = Image.open(ROOT / 'assets/rocks/12_diamond.png').convert('RGBA')
    gem = gem.crop(gem.getbbox())

    def tile(size, shape):
        top, bottom = (138, 98, 222), (75, 47, 156)
        bg = Image.new('RGBA', (size, size))
        d = ImageDraw.Draw(bg)
        for y in range(size):
            t = y / max(1, size - 1)
            d.line([(0, y), (size, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)) + (255,))
        glow = Image.new('L', (size, size), 0)       # soft light behind the gem
        ImageDraw.Draw(glow).ellipse([size * 0.18, size * 0.14, size * 0.82, size * 0.78], fill=110)
        glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
        bg = Image.composite(Image.new('RGBA', (size, size), (255, 236, 255, 255)), bg, glow)
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

    def with_gem(base, share):
        s = base.size[0]
        k = s * share / max(gem.size)          # scale up too (the 512 store icon is bigger than the sprite)
        g = gem.resize((round(gem.width * k), round(gem.height * k)), Image.LANCZOS)
        shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
        a = g.split()[3].point(lambda v: v * 0.35)
        shadow.paste((30, 10, 60, 255), ((s - g.width) // 2, (s - g.height) // 2 + int(s * 0.03)), a)
        base = Image.alpha_composite(base, shadow.filter(ImageFilter.GaussianBlur(s * 0.02)))
        base.alpha_composite(g, ((s - g.width) // 2, (s - g.height) // 2))
        return base

    for folder, k in (('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3), ('xxxhdpi', 4)):
        d = res / f'mipmap-{folder}'
        d.mkdir(parents=True, exist_ok=True)
        with_gem(tile(int(48 * k), 'square'), 0.74).save(d / 'ic_launcher.png')
        with_gem(tile(int(48 * k), 'round'), 0.66).save(d / 'ic_launcher_round.png')
        # adaptive icon (Android 8+): 108dp layers, the gem inside the 66dp safe circle
        tile(int(108 * k), 'full').save(d / 'ic_launcher_background.png')
        with_gem(Image.new('RGBA', (int(108 * k),) * 2, (0, 0, 0, 0)), 0.56).save(d / 'ic_launcher_foreground.png')
    with_gem(tile(512, 'full'), 0.72).convert('RGB').save(BUILD / 'store_icon_512.png')   # for the Play Store listing


def main():
    ks, ks_pass = os.environ.get('GEMJAR_KEYSTORE'), os.environ.get('GEMJAR_KEYSTORE_PASS')
    if not ks or not ks_pass or not Path(ks).exists():
        sys.exit('Set GEMJAR_KEYSTORE (the .jks file) and GEMJAR_KEYSTORE_PASS to sign the app.')
    ids = admob_ids()
    test_ads = not all(ids.get(k) for k in ('app_id', 'interstitial_id', 'banner_id', 'rewarded_id'))
    build_tools, bundletool = ensure_sdk()
    shutil.rmtree(BUILD, ignore_errors=True)
    BUILD.mkdir(parents=True)

    print('packing the game')
    build_www(BUILD / 'assets' / 'www')
    make_icons(BUILD / 'icons')

    print('building with Gradle' + ('  (TEST ADS: admob.properties is not filled in)' if test_ads else ''))
    tasks = [':gemjar:assembleRelease'] + ([] if test_ads else [':gemjar:bundleRelease'])
    env = dict(os.environ, ANDROID_HOME=str(SDK), GEMJAR_KEYSTORE=str(Path(ks).resolve()))
    run(ANDROID / 'gradlew', '-p', ANDROID, '--no-daemon', '-q', '--max-workers=2', f'-PversionCode={VERSION_CODE}', f'-PversionName={VERSION_NAME}',
        *tasks, env=env)

    outputs = APP / 'build' / 'outputs'
    tag = '-TEST-ADS' if test_ads else ''
    apk = BUILD / f'GemJar-{VERSION_NAME}{tag}.apk'
    shutil.copy(outputs / 'apk' / 'release' / 'gemjar-release.apk', apk)
    run(build_tools / 'apksigner', 'verify', apk)
    made = [apk]
    if not test_ads:
        aab = BUILD / f'GemJar-{VERSION_NAME}.aab'
        shutil.copy(outputs / 'bundle' / 'release' / 'gemjar-release.aab', aab)
        run('jarsigner', '-verify', aab, stdout=subprocess.DEVNULL)
        run('java', '-jar', bundletool, 'validate', f'--bundle={aab}', stdout=subprocess.DEVNULL)
        made.insert(0, aab)
    for f in made:
        print(f'{f} ({f.stat().st_size / 1e6:.1f} MB)')
    if test_ads:
        print('\nTEST ADS build: fill in android/gemjar/admob.properties to build the real app and the Play bundle.')


if __name__ == '__main__':
    main()
