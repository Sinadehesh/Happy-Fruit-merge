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

**What the narrator says now:** the voice is Kenney's free "Voiceover Pack" (male). It has only 3 lines that fit this game: "Congratulations!" (making the biggest item), "New highscore!" (beating your best) and "Game over" (losing). It has no "Sweet!", "Yummy!" and so on, and no other free pack had them either, so the combo words are silent for now: you see the word and hear a sparkle and a rising chime.

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

## Blast animation (merge burst, frame by frame)

An 8-frame animation of one candy burst, played in order when two items merge.

```
A sprite sheet showing an 8-frame animation of ONE cute candy pop explosion for a mobile fruit merge game, in a neat grid of 2 rows and 4 columns on a plain pure white background, read left to right, top to bottom. Every frame is the same size and centered in its own cell, nothing touching.

The animation: frame 1 a small round squash of pink jelly; frame 2 it swells into a round bubble; frame 3 it pops into a chunky star-burst splash; frames 4-5 the splash spreads out with round candy droplets, small stars and hearts flying outward; frames 6-7 the pieces get smaller and spread wider; frame 8 only a few tiny sparkles remain.

STYLE: glossy candy casual mobile game style, bright juicy pink, yellow and orange jelly colors, lighter on top and darker at the bottom, small white oval shines, and a thick dark chocolate-brown outline around every shape. Flat shapes only, no soft glows.

AVOID: pure white fills, soft glows, text, frame numbers, grid lines, shadows on the background, frames touching.
```

If the frames come out uneven (generators often struggle with frame sequences), the separate pieces from "Combo sparkles and pops" above are enough: the game can animate them itself (grow, spin, fly out and fade).
