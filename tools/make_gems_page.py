# Builds gems/index.html (the gem game, "Gem Jar") from index.html, so both games share one layout.
# The gem page runs the same scripts and art from the folder above (<base href="../">), with its own
# name, jewel colours, save slot and combo words. Run again after changing index.html:
#   python3 tools/make_gems_page.py
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()

def swap(old, new, count=1):
    global html
    assert html.count(old) == count, f'not found once: {old[:60]}'
    html = html.replace(old, new)

swap('<html lang="en">', '<html lang="en">\n<!-- Built from index.html by tools/make_gems_page.py: edit index.html, then run it again. -->')
swap('<meta charset="UTF-8">', '<meta charset="UTF-8">\n    <base href="../">')
swap('<title>Happy Fruit Merge</title>',
     '<title>Gem Jar: Jewel Merge Puzzle</title>\n'
     '    <meta name="description" content="Drop gems in the jar, merge two of a kind into a better one, and make the diamond before the jar fills up.">')
# jewel colours: amethyst background and board
swap('</style>', '''    /* Gem Jar colours */
        :root {
            --bg-top: #6a46c2;
            --bg-bottom: #4b2f9c;
            --board: #20174a;
            --grid: #1a123d;
            --board-edge: #a184f2;
            --gear: #d4c6ff;
        }
    </style>''')
# no item sets to switch between: only the Reverse size button stays
html, n = re.subn(r'\s*<a class="pill mode-btn"[^\n]*</a>', '', html)
assert n >= 4, n
html, n = re.subn(r'\s*<div id="car-styles">.*?</div>', '', html, flags=re.S)
assert n == 1
swap('<h2>Modes</h2>', '<h2>Settings</h2>')
swap('<h2 id="go-title">The box is full!</h2>', '<h2 id="go-title">The jar is full!</h2>')
swap('    <script src="config.js"></script>', '''    <script>
        window.GAME_SETUP = {
            id: 'gemJar',
            oldId: 'happyFruitMerge',   // was the Rocks mode of Happy Fruit Merge: keep its best score and saved game
            mode: 'rocks',
            praise: ['sweet', 'amazing', 'incredible'],
            praiseAt: [3, 6, 10],
            daily: true,
            boosters: true,
            rush: true,
            meta: true,
            menu: true,
            mine: true,      // the Gem Mine: stages with crates and jar shapes (mine.js)
            // gem sets to pick from (Settings > Gems), in the order they open
            skins: [
                { id: 'rocks', name: 'Rocks & Gems' },
                { id: 'crystal', name: 'Crystal Cave' },
                { id: 'ocean', name: 'Ocean Jewels' },
                { id: 'royal', name: 'Royal Treasury' },
                { id: 'cosmic', name: 'Cosmic Gems', float: true },   // zero gravity: dropped at the bottom, they float up
                { id: 'volcano', name: 'Volcano Gems' },
                // these open with stars in the Gem Mine (60 in all for now): about half the stages, all of them,
                // then more and more 3-star clears
                { id: 'pixel', name: 'Pixel Treasure', mineStars: 18 },
                { id: 'odd', name: 'Odd Shapes', mineStars: 30 },
                { id: 'cyber', name: 'Cyber Circuit', mineStars: 40 },
                { id: 'neon', name: 'Neon Nights', mineStars: 48 },
                { id: 'pets', name: 'Gem Pets', mineStars: 55 }
            ],
            // what to make to open each next set: [level, how many], counted from when the set before it opened.
            // Measured (22 hours of simulated play): about 49 Gold Nuggets (7), 13 Rubies (8) and 1 Opal (9)
            // an hour, so the sets take about 1, 2, 4, 8 and 16 hours of play. Higher levels are too rare to ask for.
            unlocks: [
                [[7, 40], [8, 12]],
                [[8, 25], [9, 2]],
                [[8, 50], [9, 4]],
                [[8, 100], [9, 8]],
                [[8, 200], [9, 16]]
            ]
        };
    </script>
    <script src="config.js"></script>''')
(root / 'gems').mkdir(exist_ok=True)
(root / 'gems' / 'index.html').write_text(html)
print('wrote gems/index.html')
