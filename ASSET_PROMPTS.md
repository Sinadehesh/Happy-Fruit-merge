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

Five new looks for Gem Jar that players can unlock. Each sheet is a full set of 12 merge levels in the same candy style as the rocks, without faces. Generate each prompt on its own (one sheet each). The game keeps the same sizes and merge rules for every set, so each item replaces the rock at the same level. If two items come out looking alike, regenerate, or move the "IMPORTANT" paragraph to the very start of the prompt.

### 1. Crystal Cave

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

## Blast animation (merge burst, frame by frame)

An 8-frame animation of one candy burst, played in order when two items merge.

```
A sprite sheet showing an 8-frame animation of ONE cute candy pop explosion for a mobile fruit merge game, in a neat grid of 2 rows and 4 columns on a plain pure white background, read left to right, top to bottom. Every frame is the same size and centered in its own cell, nothing touching.

The animation: frame 1 a small round squash of pink jelly; frame 2 it swells into a round bubble; frame 3 it pops into a chunky star-burst splash; frames 4-5 the splash spreads out with round candy droplets, small stars and hearts flying outward; frames 6-7 the pieces get smaller and spread wider; frame 8 only a few tiny sparkles remain.

STYLE: glossy candy casual mobile game style, bright juicy pink, yellow and orange jelly colors, lighter on top and darker at the bottom, small white oval shines, and a thick dark chocolate-brown outline around every shape. Flat shapes only, no soft glows.

AVOID: pure white fills, soft glows, text, frame numbers, grid lines, shadows on the background, frames touching.
```

If the frames come out uneven (generators often struggle with frame sequences), the separate pieces from "Combo sparkles and pops" above are enough: the game can animate them itself (grow, spin, fly out and fade).
