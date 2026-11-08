# 🎨 My Paint Studio

A colorful painting page for kids. Pick a picture, then paint it with a brush, rainbow brush,
magic fill bucket, stickers and eraser. Works with a mouse, a finger or a stylus (iPad, tablet, phone),
in English and Arabic.

## What's inside

The home screen has 4 sections:

| Section | What it is | Pictures come from |
|---|---|---|
| 📸 **My Album** | your child's own photos | `images/my-photos/` |
| 🪄 **Magic Board** | a blank white board to draw anything | — |
| 🖍️ **Coloring Book** | coloring pages (34 included) | `images/coloring/` |
| 🦸 **Level 2** | more detailed coloring pages for older kids | `images/level-2/` |
| 🎩 **Find the Ball** | a cup and ball memory game (`cup-ball/`) | — |
| 🐾 **Memory Match** | a flip-the-cards pairs game (`memory-game/`) | — |
| 🐒 **Monkey Mischief** | a 1–4 player banana party game on one screen (`monkey-mischief/`) | — |
| 🧩 **Puzzle Time** | jigsaw picture puzzles (4, 6, 12 or 20 pieces) and build-the-animal puzzles (`puzzle/`) | `puzzle/pictures/` |

## Add a picture puzzle

1. Put the picture in `puzzle/pictures/` (a JPG around 1000–1500 px wide is plenty).
2. Add a line to `PICTURES` in `puzzle/art.js`, e.g. `{id: 'beach', file: 'pictures/beach.jpg'}`.
3. Give it a name in `NAMES` in `puzzle/words.js` (Arabic with harakat, and English), add its id to the `scenes`
   list in `phrases()`, then record the voice: `python3 puzzle/tools/make_voice.py`.

## Add your pictures

1. Copy photos into `images/my-photos/` (or coloring pages into `images/coloring/` or `images/level-2/`).
2. Double-click **`update-pictures.command`**. That's it — they appear in the right section.

Then your child just double-clicks `index.html`. Every tool works, Fill and Save included.
Photos can also be added from the device with the ➕ button in My Album (kept until the page is closed).

Optional: to give pictures nicer names (in English and Arabic), add them to `images.js`:
```js
album: [{file: 'images/my-photos/park.jpg', name: {en: 'At the Park', ar: 'في الحديقة'}}],
```
Pictures not listed there get their name from the file name.

## 🎩 Find the Ball (cup and ball game)

A magic show on a round table: the smiling ball hops under a cup, the cups shuffle, and the child taps the cup
where the ball is hiding. Pick a level on the first screen:

| Level | Cups | Speed | Made for |
|---|---|---|---|
| 🐣 Easy | 3 cups | slow, few swaps, **two tries** | 3 year olds |
| 🐰 Medium | 4 cups | faster | 4–5 year olds |
| 🦊 Hard | 6 cups | very fast, sometimes two pairs swap at once | big kids |
| 🐲 Expert | 6 cups | lightning fast, up to three pairs at once, a very quick peek | grown-ups |

All the cups share one color, picked at random every round (`#006199`, `#FCAD38`, `#06D6A0`, `#FFEA88`).

**👥 Play together:** 2–4 players (🦁 🐼 🐸 🐰) take turns on one device, 3 or 5 turns each. The voice calls whose turn it is,
a found ball is a point, and at the end the results card crowns the winner (or everyone, for a tie) and opens a winner's gift.

Every level gets a little harder with each win. Finding the ball plays win music with confetti, adds a ⭐ and opens a
surprise gift: one of 30 prizes (animals, sweets, toys) that flies into the 🎁 chest. 5 stars = a golden 🏆 trophy with fireworks.
The 🎁 button shows every prize won so far. Sounds and music are made in the browser (🎵 turns the music off, 🔊 turns everything off).
Prizes are saved on the device.

**Voice:** every sentence is recorded with Microsoft's neural voices through [edge-tts](https://github.com/rany2/edge-tts):
**ar-SA Zariyah** for Arabic (18% slower with a gentle pitch lift, the same settings as Block Math's kids voice) and en-US Ana for English.
All the words live in `cup-ball/words.js`, with full harakat. After changing any spoken text, record again:

```bash
python3 -m venv .venv && .venv/bin/pip install edge-tts miniaudio lameenc   # once
.venv/bin/python cup-ball/tools/make_voice.py      # -> cup-ball/audio/ar/*.mp3, cup-ball/audio/en/*.mp3 + index.js
```

## 🐾 Memory Match (pairs card game)

Cards are dealt face down; the child flips two at a time to find the matching pictures. Pick a card set and a level:

- **Card sets:** 🐾 Animal World · 🚗 Things That Go · 🧚 Fairy Garden (12 hand-drawn pictures each, in `memory-game/cards.js`).
- **Levels:** 6, 8, 12, 16 and 20 cards. Every game starts with **"Let's remember!"**: all cards show for a few seconds, then turn over.
  👀 gives two quick peeks per game for the youngest players.
- **A prize for every pair:** the cards glow and dance, the voice says the picture's name, and a prize (⭐ 🍭 💎 🎈…) pops out
  and flies into the tray. Two pairs in a row = "Great!" combo.
- **Winning:** fanfare and confetti, 1–3 ⭐ (fewer tries = more stars), then the child taps a treasure chest to open
  a new sticker for the 🎁 **Prize Box** (28 stickers to collect). Stars, stickers and the chosen card set are saved on the device.
- Sounds and the background tune are made in the browser (🎵 music on/off, 🔊 everything on/off).

**Voice:** recorded clips only, never the device voice: Arabic is always **ar-SA-ZariyahNeural** (kids settings: 18% slower,
gentle pitch lift) and every Arabic word is written with full harakat; English is en-US Ana. After changing a card name or phrase:
```
pip install edge-tts miniaudio lameenc
python memory-game/tools/make_voice.py     # checks every letter has its harakah, then re-records audio/ar and audio/en
node memory-game/tools/make_cover.js       # redraws the home-screen cover (assets/memory.svg)
```

## 🐒 Monkey Mischief (banana party game)

Up to 4 children play at the same time on one iPad lying flat, one per corner. Each corner is a player's
wooden deck: their joystick, their trick button, their face sticker, their banana count and their basket.
With 1 player, Coco the computer monkey joins in. Built with Phaser 3 (`assets/vendor/phaser.min.js`).

- **Goal:** grab bananas (up to 5 on your head), carry them to your basket. Most bananas in the basket wins.
- **Steal:** stand at someone else's basket to sneak bananas away (2 per visit, then it snaps shut for a moment).
  The owner hears an alarm and an arrow points at the thief; touch the thief to get them all back.
- **Trick button:** drops a banana peel behind you (3, they come back). Others slip and drop 2 bananas; your own peels are safe.
- **Power-up bubbles:** ⚡ speed · 🛡️ shield (blocks one trap) · 🧲 magnet · 🦘 super jump (button = jump over water and rocks)
  · 💣 slippery bomb (button = throw a big slippery puddle).
- **The match** (2 or 3 minutes) has three parts: *Banana Hunt* → *Jungle Chaos* (golden banana +5, coconut rain
  with red warning targets, the big gorilla who chases whoever carries the most) → *Banana Frenzy* (banana rain,
  the last 20 seconds speed up). Nobody ever loses their basket: traps only knock bananas off your head.
- **Controls:** joystick (default) or "follow my finger", chosen before the match. Keyboard for testing:
  P1 WASD + E · P2 arrows + Enter · P3 IJKL + O · P4 TFGH + Y.
- **Voice:** every announcement is recorded (Arabic Zariyah, English Ana). After changing a spoken line in
  `monkey-mischief/words.js`, run `pip install edge-tts miniaudio lameenc` once, then `python3 monkey-mischief/tools/make_voice.py`.

## Tools

✏️ Pen (thin lines) · 🖌️ Brush (thick soft paint) · 🪄 Magic brush (🌈 rainbow ribbon, 🫧 bubbles, 🌸 flowers,
⭐ stars, ✨ fireflies, 🐾 tiny animals — each pops in with sparkles and music) · 🪣 Fill bucket ·
⭐ Stickers (tap, or press and drag to make them bigger) · 🧽 Eraser.
The chosen tool's icon follows the mouse or finger.

## Libraries for new games

Shared libraries live in `assets/vendor/` and are loaded with a plain `<script>` tag (no install, no build step):

| File | What it's for |
|---|---|
| `phaser.min.js` | [Phaser 3.90.0](https://phaser.io), a 2D game engine (physics, sprites, scenes, touch input, sound) |
| `gsap.min.js` | smooth animations |
| `confetti.js` | win confetti |

A new game in its own folder (for example `my-game/index.html`) loads Phaser with
`<script src="../assets/vendor/phaser.min.js"></script>` (see `monkey-mischief/` for a complete example).
List the new game's files in `CORE` in `sw.js` so it works offline.

## Publish on GitHub Pages

1. Run `update-pictures.command`, then create a new repository on GitHub (e.g. `paint-studio`) and upload all files in this folder.
2. In the repository, open **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, select `main` and `/ (root)`, then press **Save**.
4. After about a minute, your site is at `https://<your-username>.github.io/paint-studio/`.

## Tips

- **Install it as an app (best for kids):** it then opens full screen with no browser bars and nothing to exit by accident, and works offline.
  - **iPad / iPhone:** open your GitHub Pages link in Safari → Share → **Add to Home Screen** → open **مرسمي** from the home screen.
    (The ⛶ full screen button shows these steps — Safari's own full screen closes as soon as a child swipes or writes.)
  - **Android:** press the green **📲 Install the app** button on the home screen.
- On a computer, the **⛶ full screen** button hides the browser bars; press it again to leave.
- **Lines on top** keeps the black outlines visible while painting. Turn it off to paint over everything.
- Paintings are kept while the page is open (🎨 badge on the card). Press **Save** to download a PNG.
- Keyboard: `Ctrl/⌘ + Z` = undo, `Esc` = back to pictures.
