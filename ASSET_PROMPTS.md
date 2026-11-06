# Happy Fruit Merge – asset prompts

## Combo effects

Style matches the UI sheet (`assets/ui/source_sheet.jpg`). Every item gets a thick dark-brown outline and nothing is pure white, so the white background cuts out cleanly (white shine inside the outlines stays). The UI sheet itself supplies the combo timer bar, the ribbon, the star and the lightning bolt.

### 1. Combo words

```
A sprite sheet of 6 cute candy-style word-art titles for a mobile fruit merge game, in a neat grid of 2 rows and 3 columns on a plain pure white background. Each word is separate, centered in its own cell, with clear empty space around it, nothing touching.

STYLE: glossy candy casual mobile game UI style. Chunky, bubbly, rounded cartoon letters, slightly bouncy and tilted for fun. Each word is filled with bright juicy jelly color, lighter on the top half and darker toward the bottom like a candy bevel, with a small white oval shine on the upper left of the letters. Thick dark chocolate-brown outline around every word, plus a second outline in a darker shade of the word's color. Like the praise words in a cozy match-3 candy game. Spell every word exactly as written.

WORDS, each fancier and more exciting than the one before:
1. "COMBO" in hot pink
2. "SWEET!" in bubblegum pink with tiny hearts around it
3. "YUMMY!" in tangerine orange
4. "JUICY!" in strawberry red with juice drops
5. "TASTY!" in grape purple with small stars
6. "DELICIOUS!" in golden yellow with a rainbow sparkle trim, the biggest and fanciest

AVOID: misspelled words, extra letters, extra words, pure white fills, soft glows, shadows on the background, gradients in the background, items touching, items cut off.
```

### 2. Candy numbers (for "x2", "x3", … combo counts)

```
A sprite sheet of 11 cute candy-style number characters for a mobile game, in one neat row on a plain pure white background, every character separate with clear space around it, all the same height: x 0 1 2 3 4 5 6 7 8 9

STYLE: glossy candy casual mobile game UI style. Chunky, bubbly, rounded cartoon digits filled with bright golden-yellow jelly color, lighter on top and darker at the bottom like a candy bevel, a small white oval shine on the upper left of each, and a thick dark chocolate-brown outline. The "x" is a little smaller and hot pink.

AVOID: other characters, pure white fills, soft glows, shadows on the background, characters touching.
```

### 3. Combo sparkles and pops

```
A sprite sheet of 12 cute candy-style effect pieces for a mobile fruit merge game, in a neat grid of 3 rows and 4 columns on a plain pure white background. Each piece is separate, centered in its own cell, with clear empty space around it, nothing touching.

STYLE: glossy candy casual mobile game UI style. Chunky rounded shapes, bright juicy jelly colors, lighter on top and darker at the bottom, small white oval shine on the upper left, and a thick dark chocolate-brown outline around EVERY piece, even the small ones. Flat shapes only, no soft glows.

PIECES:
1. Big round pop burst: a chunky star-burst splash with 8 rounded points, sunny yellow with an orange rim, empty center
2. Same burst in bubblegum pink
3. Thin round pop ring like a shockwave, candy pink
4. Four-point twinkle sparkle, pale lemon yellow
5. Small chubby five-point star, golden yellow
6. Small puffy heart, strawberry pink
7. Round juice droplet, orange
8. Round juice droplet, cherry red
9. Short candy sprinkle in sky blue
10. Short candy sprinkle in lavender
11. Jelly bean in tangerine orange
12. Tiny swirl lollipop, pink and yellow, short stick

AVOID: pure white fills, soft glows, green items, text, shadows on the background, items touching, items cut off.
```

## Sounds

For an AI sound-effect generator (for example ElevenLabs Sound Effects). Generate each one separately, export as MP3 or WAV, and name the file as listed. All of them should feel cute, bubbly and candy-like, with no voices unless stated.

| File | Prompt | Length |
|---|---|---|
| `drop.mp3` | Soft cute bubbly "bloop" of a small jelly candy being released, light and playful, mobile casual game sound | 0.3 s |
| `land.mp3` | Soft squishy thud of a jelly fruit landing on a pile of other soft fruits, gentle and bouncy, cartoon | 0.3 s |
| `merge_small.mp3` | Bright juicy candy pop with a tiny sparkle, two small fruits merging, cute mobile game | 0.4 s |
| `merge_big.mp3` | Big satisfying juicy candy pop with a rising sparkle chime, two big fruits merging into a bigger one, cute mobile game | 0.8 s |
| `merge_max.mp3` | Magical celebration: big candy pop, rising harp sparkle and a short happy fanfare, reaching the biggest fruit, cute mobile game | 2 s |
| `combo.mp3` | Single bright sparkly xylophone chime note, cheerful candy game combo sound (the game plays it higher for each combo step) | 0.5 s |
| `score_tick.mp3` | Very short soft bubbly tick, like a tiny candy tapping glass, for a score counting up | 0.1 s |
| `new_best.mp3` | Short cheerful candy-game victory jingle with sparkles and a little "ta-da", new high score | 1.5 s |
| `danger.mp3` | Gentle cute warning pulse, two soft wobbly "boop boop" tones, a jar is almost full, not scary | 1 s |
| `game_over.mp3` | Short cute sad cartoon jingle, descending soft notes ending in a gentle bubbly "plop", candy game over | 2 s |
| `button.mp3` | Soft cute bubbly UI button tap, mobile game | 0.15 s |
| `music_loop.mp3` | Cheerful relaxed candy-land background music for a casual fruit merge puzzle game, xylophone, ukulele, soft bells and light percussion, cozy and bouncy, seamless loop | 60 s, loopable |

## Narrator voice (combo words)

**Status:** done. The narrator lines are in `assets/voice` (made with ElevenLabs): sweet, juicy, delicious, amazing, incredible, congratulations, new_highscore and game_over. The combo ladder follows them: SWEET! (3), JUICY! (5), DELICIOUS! (7), AMAZING! (10), INCREDIBLE! (15 and every 5 after). YUMMY! and TASTY! are out of the ladder until they have a voice line. The AMAZING!, INCREDIBLE! and CONGRATULATIONS! word art is drawn by `tools/word_art.py`; the prompt in section 3 can replace it with generated art.

**Tool:** ElevenLabs. Make the voice once in Voice Design, then use Text to Speech with that voice and the Eleven v3 model, which understands the [tags] in brackets. Set Stability to Creative or Natural (not Robust) so it sounds human. Any text-to-speech tool that lets you describe a voice works too: leave out the [tags] and follow the "How it should sound" column.

### 1. The voice (paste into Voice Design)

```
A warm, friendly man in his early thirties with a smooth, rich baritone voice. Recorded very close to an expensive studio microphone in a completely dry, quiet room: intimate and cozy, like he is leaning in and speaking softly right next to your ear, with soft natural breaths and a real smile you can hear. Relaxed, playful and genuinely delighted. Never robotic, never a cheesy announcer, never a cartoon voice. Neutral American accent. No reverb, no echo, no music, no background noise.
```

Preview text for Voice Design: `Mmm... sweet. Oh, that's yummy. Juicy! Tasty! Delicious!`

### 2. The lines

The voice gets deeper, louder and more excited up the ladder. Generate each line on its own (one word per file). Make 3 or 4 takes of each and keep the most natural one, or keep 2 or 3 good takes per word so the game can rotate them and repeats don't sound the same.

| File | Text to type | Plays at | How it should sound |
|---|---|---|---|
| `sweet.mp3` | `[softly] [smiling] Sweet.` | combo 3 | Soft and intimate, almost a murmur, a smile in it |
| `yummy.mp3` | `[warmly] [playful] Yummy!` | combo 5 | Warm and playful, a little brighter |
| `juicy.mp3` | `[delighted] Juicy!` | combo 7 | Richer and lower, clearly excited |
| `tasty.mp3` | `[excited] Tasty!` | combo 10 | Deep and punchy, full of energy |
| `delicious.mp3` | `[very excited] [savoring it] Delicious!` | combo 15 | The deepest so far, big energy, stretched out a little |
| `amazing.mp3` | `[thrilled] Amazing!` | combo 20 | Even bigger, real hype |
| `incredible.mp3` | `[amazed] [shouting happily] Incredible!` | combo 25 and up | The peak: booming but still warm, not harsh |
| `congratulations.mp3` | `[proud] [warmly] Congratulations!` | biggest item | Proud and happy |
| `new_highscore.mp3` | `[excited] New high score!` | beating your best | Excited and delighted |
| `game_over.mp3` | `[softly] [kind] Game over...` | when the jar fills | Gentle and kind, a little sad, not dramatic |

The last three replace the Kenney lines, so the whole game has one narrator. Export MP3 or WAV, 44.1 kHz. Silence at the start and end is fine: the files get trimmed, levelled and put in `assets/voice`.

**For a voice that is 100% human:** record yourself or a friend on a phone. Stand inside a wardrobe full of clothes (it kills the echo), hold the phone 15 to 20 cm from your mouth, and say each word 3 times, getting deeper and louder as you go up the list.

### 3. Word art for the new words (so the screen matches the voice)

```
A sprite sheet of 2 cute candy-style word-art titles for a mobile fruit merge game, side by side on a plain pure white background. Each word is separate, centered in its own half, with clear empty space around it, nothing touching.

STYLE: glossy candy casual mobile game UI style. Chunky, bubbly, rounded cartoon letters, slightly bouncy and tilted for fun. Each word is filled with bright juicy jelly color, lighter on the top half and darker toward the bottom like a candy bevel, with a small white oval shine on the upper left of the letters. Thick dark chocolate-brown outline around every word, plus a second outline in a darker shade of the word's color. Like the praise words in a cozy match-3 candy game. Spell every word exactly as written.

WORDS:
1. "AMAZING!" in fresh mint green with tiny golden stars around it
2. "INCREDIBLE!" in bright sky blue with little lightning sparkles and a rainbow sparkle trim, the biggest and fanciest

AVOID: misspelled words, extra letters, extra words, pure white fills, soft glows, shadows on the background, gradients in the background, items touching, items cut off.
```

## Gem Jar: unlockable gem sets

Five new looks for Gem Jar that players can unlock (all five are in the game now). Each sheet is a full set of 12 merge levels in the same candy style as the rocks, without faces. Generate each prompt on its own (one sheet each). The game keeps the same sizes and merge rules for every set, so each item replaces the rock at the same level. If two items come out looking alike, regenerate, or move the "IMPORTANT" paragraph to the very start of the prompt.

### 1. Crystal Cave

Done: in the game as `assets/crystal` (levels 1 to 3 and 10 to 12 from one sheet, 4 to 9 from another).

```
A sprite sheet of 12 candy-style gems for a mobile merge game: the "Crystal Cave" collection, glowing raw crystals from a magical cave.

IMPORTANT: Every item must have a completely different shape AND a different main color, so no two items look alike. Only item 12 is a faceted cut gem; items 1 to 11 are raw or polished crystals, NOT cut like jewelry.

STYLE: ultra-saturated candy style, exactly like a premium candy match-3 game. Every item looks like it is made of glossy hard candy, jelly and gummy sweets: juicy, wet-looking, semi-translucent candy surfaces with light glowing through the edges, thick glossy candy-coating, sugar-glass shine and big bright white specular highlights. Colors are maximum saturation, neon-bright and electric. No dull, grey, brown or muddy tones anywhere. Soft rainbow color shifts inside the candy, like light through a lollipop. Thick smooth dark-tinted outlines (a darker shade of each item's own color, never plain black). Shapes are fat, chunky, puffy and rounded, with no long thin spikes, no thin parts and no holes. No faces, no eyes, no mouths. Clean polished mobile-game icon art.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable and more magical than the one before:
1. Frosted milky quartz pebble, round and smooth, glowing faintly pink inside
2. A single clear quartz point, a short fat six-sided crystal, icy and see-through
3. Citrine cluster, a chunky bunch of lemon-yellow crystal points
4. Fluorite cube, a chunky cube with glowing lime-green and teal stripes
5. Celestite cluster, sky-blue crystal points sitting on a soft white sugar rock
6. Pink spinel, a glossy bubblegum-pink double-pyramid crystal
7. Lapis lazuli egg, polished deep royal blue with sparkling gold flecks
8. Fire agate nugget, glossy tangerine and cherry-red bubbly layers that glow
9. Bismuth crystal, a chunky square staircase spiral shining in rainbow metallic colors
10. Watermelon tourmaline, a chunky crystal column, bubblegum-pink in the middle and lime-green around the outside
11. Ametrine crystal, a fat crystal point, grape-purple at the top and honey-gold at the bottom
12. Rainbow crystal heart, the only faceted cut gem, sparkling with every color, the only item with a small soft glow (the final, priceless item)

AVOID: text, labels, numbers, logos, watermarks, faces, grid lines, shadows on the background, gradients or textures in the background, realistic photo style, dull or desaturated colors, grey or brown tones, flat matte surfaces, thin outlines, sketchy lines, long thin spikes, holes, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

### 2. Ocean Jewels

Done: in the game as `assets/ocean`.

```
A sprite sheet of 12 candy-style gems for a mobile merge game: the "Ocean Jewels" collection, treasures from the bottom of a tropical sea.

IMPORTANT: Every item must have a completely different shape AND a different main color, so no two items look alike. Only item 12 is a faceted cut gem; items 1 to 11 are NOT faceted or cut like jewelry.

STYLE: ultra-saturated candy style, exactly like a premium candy match-3 game. Every item looks like it is made of glossy hard candy, jelly and gummy sweets: juicy, wet-looking, semi-translucent candy surfaces with light glowing through the edges, thick glossy candy-coating, sugar-glass shine and big bright white specular highlights. Colors are maximum saturation, neon-bright and electric. No dull, grey, brown or muddy tones anywhere. Soft rainbow color shifts inside the candy, like light through a lollipop. Thick smooth dark-tinted outlines (a darker shade of each item's own color, never plain black). Shapes are fat, chunky, puffy and rounded, with no long thin spikes, no thin parts and no holes. No faces, no eyes, no mouths. Clean polished mobile-game icon art.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable and more magical than the one before:
1. Lime-green sea glass, a smooth frosted rounded chunk
2. Cream freshwater pearl, slightly lumpy and oval, with a soft pink sheen
3. Red coral, a chunky rounded bundle of glossy cherry-red coral (short fat branches only)
4. Abalone shell slice, an oval swirling with blue, green and purple rainbow shine
5. Amber drop, honey-orange and see-through, with a tiny air bubble inside
6. Larimar stone, a smooth round sky-blue dome with white wave patterns
7. Jellyfish crystal, a round dome of glowing violet jelly with swirls inside
8. Black pearl, perfectly round, with a peacock green and purple sheen
9. Ammolite, a chunky coiled spiral ammonite shell flashing red, green and blue
10. Paraiba tourmaline nugget, electric neon turquoise, glowing from inside
11. Pink conch pearl resting in a small open golden scallop shell
12. Ocean diamond, the only faceted gem: a round brilliant-cut sea-blue diamond with sparkles, the only item with a small soft glow (the final, priceless item)

AVOID: text, labels, numbers, logos, watermarks, faces, grid lines, shadows on the background, gradients or textures in the background, realistic photo style, dull or desaturated colors, grey or brown tones, flat matte surfaces, thin outlines, sketchy lines, long thin spikes, holes, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

### 3. Royal Treasury

Done: in the game as `assets/royal`.

```
A sprite sheet of 12 candy-style gems for a mobile merge game: the "Royal Treasury" collection, the polished and cut jewels of a royal treasure vault.

IMPORTANT: Every item is a polished or cut jewel, and each one must have a completely different cut shape AND a different main color, so no two items look alike.

STYLE: ultra-saturated candy style, exactly like a premium candy match-3 game. Every item looks like it is made of glossy hard candy, jelly and gummy sweets: juicy, wet-looking, semi-translucent candy surfaces with light glowing through the edges, thick glossy candy-coating, sugar-glass shine and big bright white specular highlights. Colors are maximum saturation, neon-bright and electric. No dull, grey, brown or muddy tones anywhere. Soft rainbow color shifts inside the candy, like light through a lollipop. Thick smooth dark-tinted outlines (a darker shade of each item's own color, never plain black). Shapes are fat, chunky, puffy and rounded, with no long thin spikes, no thin parts and no holes. No faces, no eyes, no mouths. Clean polished mobile-game icon art.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable and more magical than the one before:
1. Jade cabochon, a smooth polished sour-apple green dome
2. Carnelian bead, round and glossy, blood-orange
3. Citrine cushion cut, a lemon-yellow square with rounded corners
4. Aquamarine pear cut, a pale aqua teardrop
5. Amethyst heart cut, grape purple
6. Pink sapphire oval cut, bubblegum pink
7. Emerald-cut emerald, a deep green rectangle with stepped facets
8. Tanzanite trillion cut, a rounded triangle of violet-blue
9. Ruby marquise cut, a chunky cherry-red boat shape
10. Black opal cabochon, a dark galaxy-colored dome with neon rainbow flashes
11. Sapphire star cut, a royal-blue five-pointed star gem with fat rounded tips
12. The Royal Diamond, a big round brilliant-cut diamond, ice-clear with rainbow sparkles, topped with a tiny chunky gold crown, the only item with a small soft glow (the final, priceless item)

AVOID: text, labels, numbers, logos, watermarks, faces, grid lines, shadows on the background, gradients or textures in the background, realistic photo style, dull or desaturated colors, grey or brown tones, flat matte surfaces, thin outlines, sketchy lines, long thin spikes, holes, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

### 4. Cosmic Gems

Done: in the game as `assets/cosmic`. (Items 4 and 5 came out alike, both pale blue drops; worth redoing item 5 as a fatter, whiter crescent moon.)

```
A sprite sheet of 12 candy-style gems for a mobile merge game: the "Cosmic Gems" collection, gems fallen from outer space.

IMPORTANT: Every item must have a completely different shape AND a different main color, so no two items look alike. Only item 12 is a faceted cut gem; items 1 to 11 are NOT faceted or cut like jewelry.

STYLE: ultra-saturated candy style, exactly like a premium candy match-3 game. Every item looks like it is made of glossy hard candy, jelly and gummy sweets: juicy, wet-looking, semi-translucent candy surfaces with light glowing through the edges, thick glossy candy-coating, sugar-glass shine and big bright white specular highlights. Colors are maximum saturation, neon-bright and electric. No dull, grey, brown or muddy tones anywhere. Soft rainbow color shifts inside the candy, like light through a lollipop. Thick smooth dark-tinted outlines (a darker shade of each item's own color, never plain black). Shapes are fat, chunky, puffy and rounded, with no long thin spikes, no thin parts and no holes. No faces, no eyes, no mouths. Clean polished mobile-game icon art.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable and more magical than the one before:
1. Moon rock, a pale lilac rounded stone with little round craters
2. Meteorite, a lumpy glossy cherry-cola chunk with shiny silver speckles
3. Stardust crystals, a chunky cluster of glittering mint-green crystal points
4. Comet ice, a frosted icy-blue teardrop crystal with a short rounded tail
5. Moonstone crescent, a fat milky-white crescent moon with a glowing blue shimmer
6. Nebula marble, a glass sphere with swirling pink, purple and blue clouds inside
7. Saturn gem, a round coral-orange gem with a chunky glossy ring around it
8. Aurora crystal, a chunky crystal column glowing green into violet like the northern lights
9. Sun stone, a round glowing golden-yellow gem with short fat rounded rays
10. Galaxy opal egg, deep navy blue with swirling tiny stars and neon flashes
11. Black hole gem, a thick glossy black disc with a glowing purple swirl spiraling into its center
12. Star heart, the only faceted gem: a chunky faceted star-shaped crystal with fat rounded points, sparkling rainbow-white, the only item with a small soft glow (the final, priceless item)

AVOID: text, labels, numbers, logos, watermarks, faces, grid lines, shadows on the background, gradients or textures in the background, realistic photo style, dull or desaturated colors, grey or brown tones, flat matte surfaces, thin outlines, sketchy lines, long thin spikes, holes, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

### 5. Volcano Gems

Done: in the game as `assets/volcano`. (Items 7 and 11 came out alike, both red eggs; worth redoing item 11 as a gold and orange egg with feathers.)

```
A sprite sheet of 12 candy-style gems for a mobile merge game: the "Volcano Gems" collection, fiery gems born inside a volcano.

IMPORTANT: Every item must have a completely different shape AND a different main color, so no two items look alike. Only item 12 is a faceted cut gem; items 1 to 11 are NOT faceted or cut like jewelry.

STYLE: ultra-saturated candy style, exactly like a premium candy match-3 game. Every item looks like it is made of glossy hard candy, jelly and gummy sweets: juicy, wet-looking, semi-translucent candy surfaces with light glowing through the edges, thick glossy candy-coating, sugar-glass shine and big bright white specular highlights. Colors are maximum saturation, neon-bright and electric. No dull, grey, brown or muddy tones anywhere. Soft rainbow color shifts inside the candy, like light through a lollipop. Thick smooth dark-tinted outlines (a darker shade of each item's own color, never plain black). Shapes are fat, chunky, puffy and rounded, with no long thin spikes, no thin parts and no holes. No faces, no eyes, no mouths. Clean polished mobile-game icon art.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable and more magical than the one before:
1. Pumice, a light bubbly rounded stone in frosted vanilla cream
2. Obsidian, a smooth rounded chunk of glossy black glass with a purple shine
3. Sulfur crystals, a chunky cluster of bright lemon-yellow crystal points
4. Garnet orb, a round deep cherry-red gem with a soft inner glow
5. Blue fire crystal, a chunky crystal column glowing electric blue like the blue flames of a volcano
6. Peridot nugget, bright lime-green, bumpy and glowing
7. Fire opal drop, a teardrop flashing orange, red and pink
8. Magma glass, a fat rounded triangle of hot-magenta glass with a swirling glow inside
9. Sunstone dome, peach-orange with glittering copper sparkles
10. Molten gold, a shiny liquid-gold blob with a glowing orange core
11. Phoenix egg, a glossy red, orange and gold egg with flame swirls
12. Dragon's eye diamond, the only faceted gem: a round faceted fiery red-orange diamond with a glowing golden core, the only item with a small soft glow (the final, priceless item)

AVOID: text, labels, numbers, logos, watermarks, faces, grid lines, shadows on the background, gradients or textures in the background, realistic photo style, dull or desaturated colors, grey or brown tones, flat matte surfaces, thin outlines, sketchy lines, long thin spikes, holes, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

## More gem sets: neon, pixel, odd shapes and strange ideas

Five more looks, each a full set of 12 merge levels like the ones above. They are cut the same way (one sheet each, `python3 tools/cut_gem_set.py`), so the layout rules matter most: plain pure white background, 3 rows of 4, nothing touching, every item a different shape and a different main color.

### 6. Neon Nights

```
A sprite sheet of 12 neon gems for a mobile merge game: the "Neon Nights" collection, gems made of glowing neon light.

IMPORTANT: Every item must have a completely different shape AND a different main neon color, so no two items look alike. Every item is a SOLID filled shape, never just an outline: a body of dark glossy glass in a deep shade of its own color, with its edges and inner facet lines drawn as thick glowing neon tubes.

STYLE: bright neon-sign style for a premium mobile game, electric and glowing, colors at maximum saturation. Each body is dark tinted glass (deep navy, deep magenta, deep green and so on) so the neon lines pop. The neon tubes are thick, smooth and rounded, with a white-hot center and a vivid color around it. Glossy white reflections on the glass. The glow stays tight around each item (a few pixels), never a big soft halo. Shapes are fat, chunky and rounded, with no long thin spikes and no holes. No faces. Clean polished mobile-game icon art.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable and brighter than the one before:
1. Cyan neon pebble, a smooth rounded oval
2. Hot-pink neon heart
3. Lime-green neon triangle with rounded corners
4. Orange neon hexagon
5. Electric-blue neon raindrop
6. Violet neon crescent moon, fat and rounded
7. Sunny-yellow neon five-pointed star with fat rounded points
8. Red neon diamond shape (a rhombus) with rounded corners
9. Mint neon cloud, fluffy and round
10. Magenta neon cat's-eye gem, an almond shape with a glowing line across the middle
11. White-gold neon crown gem, a chunky crown with rounded points sitting on a round gem
12. Rainbow neon diamond, a round brilliant-cut gem outlined in every neon color at once, the only item with a small soft glow (the final, priceless item)

AVOID: dark or black background, text, letters, numbers, signs, logos, watermarks, faces, grid lines, big soft glows, shadows on the background, outline-only shapes, thin lines on their own, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

### 7. Pixel Treasure

```
A sprite sheet of 12 pixel-art treasures for a mobile merge game: the "Pixel Treasure" collection, in classic 16-bit video game style.

IMPORTANT: Every item must have a completely different shape AND a different main color. Each item is drawn with big, clearly visible square pixels, as if it was made on a 32 by 32 pixel grid and then scaled up: crisp hard pixel edges, no blur, no smooth gradients, no anti-aliasing.

STYLE: bright, cheerful 16-bit retro game pixel art. A small bold palette per item (3 to 5 shades of its own color), a 1-pixel dark outline in a darker shade of the item's color, a few pure white pixels for shine, a little dithering only where needed. Chunky, rounded silhouettes, no thin parts and no holes. No faces.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable than the one before:
1. A grey pixel pebble
2. A copper coin, round, with a pixel shine
3. A green slime drop, round and wobbly (no face)
4. A blue mana potion in a round bottle with a cork
5. A red pixel heart, the classic video game heart
6. A shiny gold coin
7. A purple magic orb on a small gold stand
8. An emerald, the classic eight-sided pixel gem
9. A ruby with a pixel star sparkle
10. A closed treasure chest, gold and brown
11. A golden crown with three gems
12. The Pixel Diamond, a big white and cyan pixel diamond with rainbow pixel sparkles, the final, priceless item

AVOID: smooth or painted look, blur, soft gradients, anti-aliased edges, text, numbers, logos, watermarks, faces, grid lines, shadows on the background, gradients or textures in the background, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

### 8. Cyber Circuit (gems with wires and lights inside)

```
A sprite sheet of 12 futuristic gems for a mobile merge game: the "Cyber Circuit" collection, gems built like glowing electronics.

IMPORTANT: Every item must have a completely different shape AND a different main color, so no two items look alike. Every item is a solid, chunky object; circuit lines, wires and lights are drawn on or inside it, never sticking out.

STYLE: glossy candy-tech style for a premium mobile game: shiny candy-colored plastic, chrome and glass, with glowing circuit lines, tiny lights and chip patterns in neon colors. Big white glossy highlights, colors at maximum saturation, thick smooth dark-tinted outlines (a darker shade of each item's own color). Shapes are fat, chunky and rounded, with no thin wires sticking out, no spikes and no holes. No faces, no text. Clean polished mobile-game icon art.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable and more high-tech than the one before:
1. A smooth grey stone with one glowing cyan circuit line around it
2. A chunky green chip, a rounded square with gold contacts on its edges
3. A fat blue power cell, a capsule with a glowing charge bar
4. A chunky orange gear with fat rounded teeth and a solid glowing button in the middle
5. A pink glass LED dome glowing from inside
6. A violet crystal with glowing circuit lines running through it
7. A yellow energy orb inside a chunky chrome ring
8. A teal holographic cube with rounded edges
9. A robot heart: a chunky chrome heart with a glowing red core
10. A chrome star with fat rounded points and glowing rainbow circuit lines
11. A golden processor gem, a rounded gold square with a glowing violet core
12. The Quantum Diamond, a round faceted diamond made of glowing electric-blue light with circuit patterns, the only item with a small soft glow (the final, priceless item)

AVOID: text, letters, numbers, logos, watermarks, faces, robots with faces, thin wires or cables, antennas, spikes, holes, grid lines, shadows on the background, gradients or textures in the background, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

### 9. Odd Shapes

```
A sprite sheet of 12 gems in surprising shapes for a mobile merge game: the "Odd Shapes" collection, as if everyday things and playful shapes were carved from candy gemstone.

IMPORTANT: Every item must have a completely different shape AND a different main color, so no two items look alike. Every item is a solid, chunky gem with no holes.

STYLE: ultra-saturated candy style, exactly like a premium candy match-3 game. Every item looks like it is made of glossy hard candy, jelly and gummy sweets: juicy, wet-looking, semi-translucent candy surfaces with light glowing through the edges, thick glossy candy-coating and big bright white highlights. Colors at maximum saturation. Thick smooth dark-tinted outlines (a darker shade of each item's own color, never plain black). Shapes are fat, chunky, puffy and rounded, with no long thin parts and no holes. No faces. Clean polished mobile-game icon art.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more valuable and more magical than the one before:
1. A little pillow-shaped pebble, soft and square, lavender
2. A lemon-yellow crystal cube with rounded edges
3. A coral-orange pyramid with rounded corners
4. A sky-blue fluffy cloud
5. A pink mushroom gem with a fat cap and a short stem
6. A lime-green light bulb gem glowing from inside
7. A plump turquoise spiral seashell gem
8. A red puffy five-leaf clover gem
9. A violet spinning-top gem
10. A golden chunky bell gem
11. A rainbow gem shaped like a fat rounded infinity sign, filled in (no holes)
12. A crystal planet with a tiny crystal moon stuck to its side, sparkling white and pink, the only item with a small soft glow (the final, priceless item)

AVOID: text, labels, numbers, logos, watermarks, faces, grid lines, shadows on the background, gradients or textures in the background, realistic photo style, dull colors, thin parts, holes, two items with the same shape or the same main color, items touching each other, items cut off at the edges.
```

### 10. Gem Pets (the one set with faces)

```
A sprite sheet of 12 tiny creatures made of gemstone for a mobile merge game: the "Gem Pets" collection, cute chubby animals carved from candy gems, each curled up into a round shape.

IMPORTANT: Every item must be a completely different animal AND a different main color, so no two items look alike. Every pet is round and compact, curled up or sitting like a ball, with short ears and short legs tucked in.

STYLE: ultra-saturated candy style, exactly like a premium candy match-3 game: glossy, juicy, semi-translucent gem bodies with light glowing through the edges, big bright white highlights, colors at maximum saturation, thick smooth dark-tinted outlines. Each pet has a tiny simple happy face: two small dark dot eyes, a little smile and soft pink blush cheeks. Kawaii, adorable, never scary. No long tails, no thin legs, no holes.

LAYOUT: a neat grid of 3 rows and 4 columns on a plain pure white background. Each item is separate, centered in its own cell, evenly spaced, with clear empty space around it and nothing touching or overlapping. All items are about the same size, fill their cells, and have a compact, roundish overall outline (they will be stacked like balls in a jar).

ITEMS, from common to priceless, left to right, top to bottom, each clearly more precious than the one before:
1. A grey pebble bunny, curled into a ball
2. A sky-blue sapphire chick
3. A lemon citrine duckling
4. A pink rose quartz piglet
5. A green emerald frog, sitting round and plump
6. A purple amethyst hamster with puffy cheeks
7. An orange fire-opal fox, curled up with its tail around it
8. A rainbow opal kitten, curled up asleep
9. An aqua aquamarine baby whale, round as a ball
10. A golden lion cub with a fluffy round mane
11. A pastel crystal unicorn foal, curled up, with a short horn
12. A baby dragon of pure diamond peeking out of a sparkling egg, the only item with a small soft glow (the final, priceless item)

AVOID: scary or realistic animals, long tails, thin legs, holes, text, labels, numbers, logos, watermarks, grid lines, shadows on the background, gradients or textures in the background, two pets of the same animal or the same main color, items touching each other, items cut off at the edges.
```

More ideas in the same format, if you want them: Crystal Fruit (fruit carved from gems), Frozen Sweets (gems made of ice cream and sorbet), Dragon Hoard (gold, goblets and dragon scales), Spooky Glow (cute pumpkins, ghosts and potions for Halloween).

## Blast animation (merge burst, frame by frame)

An 8-frame animation of one candy burst, played in order when two items merge.

```
A sprite sheet showing an 8-frame animation of ONE cute candy pop explosion for a mobile fruit merge game, in a neat grid of 2 rows and 4 columns on a plain pure white background, read left to right, top to bottom. Every frame is the same size and centered in its own cell, nothing touching.

The animation: frame 1 a small round squash of pink jelly; frame 2 it swells into a round bubble; frame 3 it pops into a chunky star-burst splash; frames 4-5 the splash spreads out with round candy droplets, small stars and hearts flying outward; frames 6-7 the pieces get smaller and spread wider; frame 8 only a few tiny sparkles remain.

STYLE: glossy candy casual mobile game style, bright juicy pink, yellow and orange jelly colors, lighter on top and darker at the bottom, small white oval shines, and a thick dark chocolate-brown outline around every shape. Flat shapes only, no soft glows.

AVOID: pure white fills, soft glows, text, frame numbers, grid lines, shadows on the background, frames touching.
```

If the frames come out uneven (generators often struggle with frame sequences), the separate pieces from "Combo sparkles and pops" above are enough: the game can animate them itself (grow, spin, fly out and fade).

## Gem Mine (stages): crates, jar parts and the map

Each sheet has a template picture in `assets/mine/sheets/` that shows what goes in each spot: give the template to the image generator together with the prompt if it accepts a picture. The finished sheets are kept in `assets/mine/source/` and cut into the game's files by `python3 tools/cut_mine_art.py`.

Done and in the game: the crates and splinters (1), the pickaxe icon and the lantern (2), the stage buttons (3), the map background (4, made to repeat without a seam in code) and the mine entrance (5). Still to redo: the plank and the peg from sheet 2 (prompts 2a and 2b below); the game draws stand-ins for those two until then.

All of them use the same style, so they sit well next to the gems and the wooden UI panels:

```
STYLE: ultra-saturated candy style, exactly like a premium candy match-3 game. Everything looks glossy and juicy, like hard candy, caramel and toffee: thick glossy coating, big bright white specular highlights, colors at maximum saturation. Wood looks like warm honey-caramel toffee wood, never grey or dull. Thick smooth dark chocolate-brown outlines around every object. Shapes are chunky, puffy and rounded. No faces, no eyes, no mouths. Clean polished mobile-game icon art.
```

### 1. Crates (template: `sheet1_crates.jpg`) - done

```
A sprite sheet of wooden crates for a cute mobile merge puzzle game, in a neat grid of 2 rows and 2 columns on a plain pure white background. Each item is separate, centered in its own cell, front view, straight on (not tilted, no perspective), with clear empty space around it and nothing touching.

[paste the STYLE paragraph here]

ITEMS, left to right, top to bottom:
1. A square wooden crate: a thick rounded frame of honey-caramel wood, three horizontal planks inside, one diagonal brace from bottom-left to top-right, a round nail head in each corner, a glossy shine along the top edge. Perfectly square overall.
2. A strong crate: the same square crate, reinforced with chunky shiny steel-blue metal corner brackets and one metal band across the middle with rivets. Perfectly square overall.
3. A cracked crate: the crate from item 1 after a hard knock, with two or three jagged dark cracks running in from the edges and one chipped-off corner showing darker wood inside. Still square, still in one piece.
4. A small scattered group of 6 separate wooden splinters and chips in the same caramel wood, each with the same dark outline, not touching each other.

AVOID: text, labels, numbers, logos, watermarks, grid lines, shadows on the background, gradients or textures in the background, perspective or 3D angles, realistic photo style, dull or grey wood, thin outlines, items touching each other, items cut off at the edges.
```

### 2. Jar parts and icons (template: `sheet2_jar_parts.jpg`) - pickaxe and lantern done; plank and peg: redo with 2a and 2b

```
A sprite sheet of game parts for a cute mobile merge puzzle game, in a neat grid of 2 rows and 2 columns on a plain pure white background. Each item is separate, centered in its own cell, front view, with clear empty space around it and nothing touching.

[paste the STYLE paragraph here]

ITEMS, left to right, top to bottom:
1. A long straight horizontal wooden plank seen from the front, about 6 times as long as it is tall, honey-caramel wood with the grain running left to right, a glossy shine along the top, both ends cut straight. It will be repeated end to end, so it has no nails, knots or marks near the ends.
2. A round peg: a glossy amethyst-purple crystal knob like a big candy button, seen straight from the front, perfectly round.
3. A cute pickaxe icon: a chunky caramel-wood handle tilted diagonally and a curved shiny steel head, with a small pink gem set in the head.
4. A cute glowing mine lantern hanging from a short hook, warm golden light inside, a red-pink metal frame.

AVOID: text, labels, numbers, logos, watermarks, grid lines, shadows on the background, gradients or textures in the background, perspective, realistic photo style, dull or grey colors, thin outlines, items touching each other, items cut off at the edges.
```

### 3. Stage buttons for the map (template: `sheet3_stage_buttons.jpg`) - done

```
A sprite sheet of 4 round stage buttons for the level map of a cute mobile puzzle game, in a neat grid of 2 rows and 2 columns on a plain pure white background. Each button is separate, centered in its own cell, seen straight from the front, with clear empty space around it and nothing touching. The middle of each button is a smooth, plain, glossy area with NO number on it (the game writes the stage number there).

[paste the STYLE paragraph here]

ITEMS, left to right, top to bottom:
1. Open stage: a round glossy golden-caramel candy button with a thick chocolate-brown rim and a shine on the top left.
2. Current stage: the same button in glowing mint-green, a little brighter, with a soft white sparkle on the rim.
3. Locked stage: the same button in soft grey-lavender, matte, with a small cute golden padlock at the bottom edge.
4. Boss stage: a bigger round ruby-red candy button with a golden rim and a small golden crown sitting on top.

AVOID: text, numbers, labels, logos, watermarks, grid lines, shadows on the background, gradients or textures in the background, perspective, realistic photo style, thin outlines, buttons touching each other, buttons cut off at the edges.
```

### 4. The map background (one tall picture, no template) - done (a square one works too; a taller one would repeat less often)

```
A tall vertical background for the level map of a cute mobile puzzle game: looking into a deep, magical gem mine shaft from the front. Portrait format, about twice as tall as it is wide (for example 1024 x 2048).

The picture must repeat seamlessly from top to bottom: the very top edge continues exactly where the bottom edge ends, so many copies can be stacked with no visible seam.

Rocky cave walls on the left and right edges, in warm brown and deep plum-purple, with glittering candy-colored gems and crystal clusters stuck in the rock, a few warm glowing lanterns on the walls, and wooden support beams. The middle 60% of the width is a calm, darker, plain area (a soft path of dark earth), with no objects in it, because the stage buttons go there.

[paste the STYLE paragraph here]

AVOID: text, numbers, logos, watermarks, characters, people, faces, objects in the middle area, harsh black, realistic photo style, visible seams at the top or bottom edge.
```

### 5. The mine entrance (top of the map, no template) - done

```
A wide picture for the top of a level map in a cute mobile puzzle game: a cute wooden mine entrance built into a small round grassy hill, under a bright blue sky with two soft clouds. A dark arched tunnel opening framed by chunky caramel-wood beams, a small blank wooden sign board above the opening (no writing on it), a little rail track running into the tunnel, and a few sparkling gems on the grass. Landscape format, about 2 times as wide as it is tall. The bottom edge is brown earth that fades into dark brown, so the map background can continue below it.

[paste the STYLE paragraph here]

AVOID: text or letters on the sign, numbers, logos, watermarks, characters, people, faces, realistic photo style, dull or grey colors.
```

### 2a. The plank, again (it came out as a short 3D block; the game needs a long flat strip it can repeat)

```
A single long wooden plank for a cute mobile puzzle game, on a plain pure white background, seen exactly from the front like a flat 2D side view: one long thin rectangle with slightly rounded corners, about 8 times as long as it is tall, filling the width of the picture. Completely flat: no top face, no side face, no depth, no perspective, no 3D angle. Honey-caramel wood with the grain running left to right, a glossy shine along the top edge, and a thick dark chocolate-brown outline. It will be repeated end to end, so the wood looks the same along its whole length, with no nails, knots or marks near the ends.

[paste the STYLE paragraph here]

AVOID: 3D blocks, bricks or beams, perspective, a visible top or side face, short or thick shapes, text, logos, watermarks, shadows on the background, gradients or textures in the background, dull or grey wood.
```

### 2b. The peg, again (it came out lumpy; it must be a perfect circle)

```
A single round peg for a cute mobile puzzle game, on a plain pure white background: a perfectly round, glossy amethyst-purple candy button seen straight from the front. A flat perfect circle with a soft lighter purple centre, a big white shine at the top left, and a thick dark chocolate-brown outline all the way around. Centred, filling most of the picture.

[paste the STYLE paragraph here]

AVOID: lumpy, irregular or egg shapes, ovals, crystals with points or facets, holes, perspective, text, logos, watermarks, shadows on the background, gradients or textures in the background.
```
