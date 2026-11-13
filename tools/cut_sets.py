# Cuts every gem set's 12 gems from the sheets they were made on (kept in assets/<set>/ and assets/fixes/), with
# the clean cut in tools/gemcut.py (nothing of the sheet's white left), into assets/<set>/01_<name>.png ... 12_<name>.png
# (256 x 256). Each set lists where its gems come from: a sheet, its layout (rows x columns) and which of its
# items to take, so gems that were made again on their own (assets/fixes) replace the ones that came out wrong;
# glow: glowing gems (a see-through halo), pale_glow: a pale one whose edge melts into its glow, outline: gems drawn
# inside a dark outline all round with light marks outside it, cut to the outline.
#   python3 tools/cut_sets.py            every set
#   python3 tools/cut_sets.py neon pets  only these
# A new set: add it here, then to MODES in game.js, to skins in tools/make_gems_page.py, to GEM_SETS in
# tools/build_gem_android.py, and run tools/make_shapes.py (the command is at its top).
import sys, pathlib
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gemcut

ROOT = pathlib.Path(__file__).resolve().parent.parent
A = ROOT / 'assets'
FIX = A / 'fixes'
ALL = list(range(1, 13))
SETS = {
    # the sheet has the gold nugget (its 7th) before the turquoise (its 8th): swapped to the prompt's order
    'rocks': dict(names='pebble sandstone coal malachite rose_quartz amethyst_geode turquoise gold_nugget ruby opal star_sapphire diamond',
                  take=[('rocks/source_sheet.webp', 3, 4, [1, 2, 3, 4, 5, 6, 8, 7, 9, 10, 11, 12])], glow=[]),
    'crystal': dict(names='frosted_quartz clear_quartz citrine fluorite celestite pink_spinel lapis_lazuli fire_agate bismuth watermelon_tourmaline ametrine crystal_heart',
                    # sheet 1 has 16 gems (4 rows of 4): its 1-3 and 14-16 are Crystal Cave's 1-3 and 10-12
                    take=[('crystal/source_sheet_1.webp', 4, 4, [1, 2, 3]), ('crystal/source_sheet_4.webp', 3, 4, [4, 5, 6, 7, 8, 9]),
                          ('crystal/source_sheet_1.webp', 4, 4, [14, 15, 16])], glow=[12]),
    'ocean': dict(names='sea_glass pearl red_coral abalone amber larimar jellyfish black_pearl ammolite paraiba conch_pearl ocean_diamond',
                  take=[('ocean/source_sheet.webp', 3, 4, ALL)], glow=[12]),
    'royal': dict(names='jade carnelian citrine aquamarine amethyst_heart pink_sapphire emerald tanzanite ruby black_opal star_sapphire royal_diamond',
                  take=[('royal/source_sheet.webp', 3, 4, ALL)], glow=[]),
    # made again as a journey through space (the first set: cosmic/first_try): the pebble, the asteroid and the comet
    # are the best of the variants sheet (its 1st, 3rd and 6th), the moon and everything after it from the main sheet;
    # the sun and the galaxy keep their soft glow
    'cosmic': dict(names='space_pebble asteroid comet moon mars earth gas_giant saturn sun black_hole galaxy universe_gem',
                   take=[('cosmic/source_sheet_variants.webp', 3, 4, [1, 3, 6]), ('cosmic/source_sheet.webp', 3, 4, [4, 5, 6, 7, 8, 9, 10, 11, 12])],
                   glow=[9, 11], outline=[1, 2, 3]),
    # gem 11 was made again (the second of its 4 versions, the most gold): it looked like gem 7
    'volcano': dict(names='pumice obsidian sulfur garnet blue_fire peridot fire_opal magma_glass sunstone molten_gold phoenix_egg dragons_eye',
                    take=[('volcano/source_sheet.webp', 3, 4, list(range(1, 11))), ('fixes/fix3_volcano_phoenix_egg.webp', 2, 2, [2]),
                          ('volcano/source_sheet.webp', 3, 4, [12])], glow=[12], outline=[11]),   # 11: a pale rim outside its outline
    # the whole set was made again without the glitch effect (the first try: pixel/source_sheet_first_try.webp);
    # every gem has a dark outline all round, and the sheet's grey pencil marks outside it are cut off (outline)
    'pixel': dict(names='pebble copper_coin slime potion heart gold_coin magic_orb emerald ruby chest crown pixel_diamond',
                  take=[('fixes/fix5_pixel_treasure.webp', 3, 4, ALL)], glow=[], outline=ALL),
    # gem 12 is pale with a white edge melting into its glow: cut by the outline of its coloured faces (pale_glow)
    'odd': dict(names='pillow cube pyramid cloud mushroom drop spiral_shell clover spinning_top bell infinity crystal_planet',
                take=[('odd/source_sheet.webp', 3, 4, ALL)], glow=[], pale_glow=[12], outline=[4]),   # 4: pencil marks on its outline
    'cyber': dict(names='circuit_stone chip power_cell gear led_dome data_crystal energy_orb holo_cube robot_heart chrome_star processor quantum_diamond',
                  take=[('cyber/source_sheet.webp', 4, 3, ALL)], glow=[11, 12]),
    # gems 9 to 12 were made again as shapes (assets/fixes), except the crown coin, which stays a coin on purpose
    'neon': dict(names='pebble heart triangle hexagon drop moon star rhombus cloud cats_eye crown rainbow_diamond',
                 take=[('neon/source_sheet.webp', 3, 4, list(range(1, 9))), ('fixes/fix4_neon_9_12.webp', 2, 2, [1, 2, 3, 4])], glow=[12]),
    'pets': dict(names='bunny chick duckling piglet frog hamster fox kitten whale lion_cub unicorn baby_dragon',
                 take=[('pets/source_sheet.webp', 3, 4, ALL)], glow=[]),
}

sheets, boxes = {}, {}
def item(path, rows, cols, k):
    if path not in sheets:
        sheets[path] = Image.open(A / path)
        boxes[path] = gemcut.find_items(sheets[path], rows, cols)
    return sheets[path], boxes[path][k - 1]

for name in (sys.argv[1:] or SETS):
    spec = SETS[name]
    names = spec['names'].split()
    assert len(names) == 12, name
    picks = [(path, rows, cols, k) for path, rows, cols, ks in spec['take'] for k in ks]
    assert len(picks) == 12, (name, len(picks))
    for n, (path, rows, cols, k) in enumerate(picks, start=1):
        sheet, box = item(path, rows, cols, k)
        if n in spec.get('pale_glow', []): im = gemcut.cut_glow(sheet, box, pale=True)
        elif n in spec['glow']: im = gemcut.cut_glow(sheet, box)
        else: im = gemcut.cut(sheet, box, outline=n in spec.get('outline', []))
        im.save(A / name / f'{n:02d}_{names[n - 1]}.png', optimize=True)
    print('cut', name)
