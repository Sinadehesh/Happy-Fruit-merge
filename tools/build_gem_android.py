# Builds the signed Android app for Gem Jar, straight from the game files in this repo:
# an App Bundle (.aab) to upload to Google Play, and an APK to install directly.
#
# Needs Java 17+, Python 3 with Pillow, and internet the first time: it downloads Android build-tools
# and platform 36 (into $ANDROID_SDK, default ~/.cache/android-sdk), Google's bundletool, plus Matter.js
# and the Poppins font so the app plays offline. No Android Studio or Gradle needed.
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
APP = ROOT / 'android' / 'gemjar'
BUILD = ROOT / 'android' / 'build'
SDK = Path(os.environ.get('ANDROID_SDK', Path.home() / '.cache' / 'android-sdk'))
VERSION_NAME = sys.argv[1] if len(sys.argv) > 1 else '1.0'
VERSION_CODE = sys.argv[2] if len(sys.argv) > 2 else '1'
MIN_SDK, TARGET_SDK = '24', '36'   # Google Play: new apps and updates must target Android 16 (API 36)

SDK_PARTS = {   # folder in the SDK: (download, sha1)
    'build-tools/36.1.0': ('build-tools_r36.1_linux.zip', '936a0d6bd5ae3e2118a7567dddbc95ff67ed46e9'),
    'platforms/android-36': ('platform-36_r02.zip', '2c1a80dd4d9f7d0e6dd336ec603d9b5c55a6f576'),
}
BUNDLETOOL = ('https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar', None)
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
    for folder, (zname, sha1) in SDK_PARTS.items():
        target = SDK / folder
        if target.exists():
            continue
        z = SDK / 'dl' / zname
        if not z.exists() or hashlib.sha1(z.read_bytes()).hexdigest() != sha1:
            print('downloading', zname)
            fetch('https://dl.google.com/android/repository/' + zname, z)
        assert hashlib.sha1(z.read_bytes()).hexdigest() == sha1, 'bad download: ' + zname
        tmp = SDK / 'tmp'
        shutil.rmtree(tmp, ignore_errors=True)
        with zipfile.ZipFile(z) as zf:
            zf.extractall(tmp)
        (top,) = list(tmp.iterdir())          # the zip holds one folder (its name isn't the version)
        target.parent.mkdir(parents=True, exist_ok=True)
        top.rename(target)
        shutil.rmtree(tmp)
        for f in target.rglob('*'):           # zipfile drops the run permission
            if f.is_file():
                f.chmod(0o755)
    jar = SDK / 'bundletool' / BUNDLETOOL[0].rsplit('/', 1)[1]
    if not jar.exists():
        print('downloading bundletool')
        fetch(BUNDLETOOL[0], jar)
    return SDK / 'build-tools/36.1.0', SDK / 'platforms/android-36/android.jar', jar


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
    swap("            mode: 'rocks',\n", "            mode: 'rocks',\n            ads: false,                 // the app has no ads yet\n")
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
    copy('assets/rocks/*.png')
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
    bt, android_jar, bundletool = ensure_sdk()
    shutil.rmtree(BUILD, ignore_errors=True)
    BUILD.mkdir(parents=True)

    print('packing the game')
    build_www(BUILD / 'assets' / 'www')
    res = BUILD / 'res'
    shutil.copytree(APP / 'res', res)
    make_icons(res)

    print('compiling')
    run(bt / 'aapt2', 'compile', '--dir', res, '-o', BUILD / 'res.zip')
    link = ['-I', android_jar, '--manifest', APP / 'AndroidManifest.xml', '--min-sdk-version', MIN_SDK,
            '--target-sdk-version', TARGET_SDK, '--version-code', VERSION_CODE, '--version-name', VERSION_NAME,
            '-A', BUILD / 'assets', BUILD / 'res.zip']
    gen = BUILD / 'gen'
    run(bt / 'aapt2', 'link', '-o', BUILD / 'unsigned.apk', '--java', gen, *link)
    classes = BUILD / 'classes'
    sources = list((APP / 'java').rglob('*.java')) + list(gen.rglob('*.java'))
    run('javac', '--release', '11', '-nowarn', '-cp', android_jar, '-d', classes, *sources)
    dex = BUILD / 'dex'
    dex.mkdir()
    run(bt / 'd8', '--release', '--min-api', MIN_SDK, '--lib', android_jar, '--output', dex, *classes.rglob('*.class'))

    print('APK (to install directly)')
    with zipfile.ZipFile(BUILD / 'unsigned.apk', 'a', zipfile.ZIP_DEFLATED) as z:
        z.write(dex / 'classes.dex', 'classes.dex')
    run(bt / 'zipalign', '-f', '-p', '4', BUILD / 'unsigned.apk', BUILD / 'aligned.apk')
    apk = BUILD / f'GemJar-{VERSION_NAME}.apk'
    run(bt / 'apksigner', 'sign', '--ks', ks, '--ks-key-alias', 'gemjar', '--ks-pass', 'env:GEMJAR_KEYSTORE_PASS',
        '--key-pass', 'env:GEMJAR_KEYSTORE_PASS', '--out', apk, BUILD / 'aligned.apk')
    run(bt / 'apksigner', 'verify', apk)

    print('App Bundle (for Google Play)')
    # the same app with its resources in the bundle's (protobuf) format, laid out as the "base" module
    run(bt / 'aapt2', 'link', '--proto-format', '-o', BUILD / 'proto.apk', *link)
    base = BUILD / 'base.zip'
    with zipfile.ZipFile(BUILD / 'proto.apk') as src, zipfile.ZipFile(base, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in src.namelist():
            if name == 'AndroidManifest.xml':
                dest = 'manifest/AndroidManifest.xml'
            elif name == 'resources.pb' or name.startswith(('res/', 'assets/')):
                dest = name
            else:
                dest = 'root/' + name
            z.writestr(dest, src.read(name))
        z.write(dex / 'classes.dex', 'dex/classes.dex')
    aab = BUILD / f'GemJar-{VERSION_NAME}.aab'
    run('java', '-jar', bundletool, 'build-bundle', f'--modules={base}', f'--output={aab}')
    # signed with the upload key; Google Play re-signs what it sends to phones
    run('jarsigner', '-keystore', ks, '-storepass:env', 'GEMJAR_KEYSTORE_PASS', '-keypass:env', 'GEMJAR_KEYSTORE_PASS',
        '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', aab, 'gemjar')
    run('jarsigner', '-verify', aab)
    run('java', '-jar', bundletool, 'validate', f'--bundle={aab}')

    for f in (aab, apk):
        print(f'{f} ({f.stat().st_size / 1e6:.1f} MB)')


if __name__ == '__main__':
    main()
