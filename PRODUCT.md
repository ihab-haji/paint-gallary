# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Young children (about 2–6) playing on a family iPad or tablet, alone or together with siblings and parents. Most can't read yet, so meaning has to come from pictures, colour, sound and a recorded voice. Parents set things up (pick players, rename them, switch language) and often play along.

## Product Purpose
My Paint Studio is a home-made, offline-capable kids' app: painting and colouring, plus a growing set of small games (Block Math, Find the Ball, Memory Match, Monkey Mischief, Water Blaster Arena). Success means a child can open it, understand what to do without help, and want to play again. In family games, the youngest player should still feel they had a chance.

## Positioning
A family's own app. It uses the family's own photos and its own Hero Squad (six original chibi heroes drawn in `assets/players/heroes.js`; each player picks one and can change their name), is in Arabic and English with a slow, clear recorded kids' voice, and runs from a home-screen icon with no internet.

## Operating Context
- iPad in landscape, often flat on a table or on a stand, with up to 4 children sitting around it. Every player has their own corner.
- Opened from the home screen (PWA) or by double-clicking `index.html`. It must work offline after the first visit (`sw.js`).
- Short sessions of a few minutes, with lots of loud and excited play.

## Capabilities and Constraints
- Plain HTML, CSS and JavaScript. No build step, no framework, no server, no npm at runtime.
- Shared libraries in `assets/vendor/`: GSAP, confetti, and Phaser 3.90.0 (for 2D action games). Block Math has its own copy of Three.js.
- Shared party players (`assets/players/players.js`): "Who's playing?" picker, scoreboard and results, used by every multiplayer game.
- Every game is in Arabic (the default, right-to-left) and English. Spoken lines are recorded with edge-tts using `tools/make_voice.py` in each game (Arabic: ar-SA Zariyah, slowed down; English: en-US Ana). The browser's own speech is the fallback.
- Local multiplayer only, on one device. Multi-touch has to be reliable when 4 hands touch at once.
- Monkey Mischief controls: an on-screen joystick for each player by default, with a "follow my finger" mode that can be switched on. Keyboard controls for testing on a desktop.

## Brand Commitments
- Fonts: Fredoka (Latin) and Baloo Bhaijaan 2 (Arabic), from Google Fonts.
- Six seats, one per hero. Turn-taking games (Memory Match, Find the Ball) take all six; games with four corners take up to 4 of them. Player colours are fixed: p1 #ff5d73, p2 #9b6bff, p3 #1fa8ff, p4 #ff9417, p5 #35b84a, p6 #e84ad1. Each player's colour follows them everywhere.
- Voice tone: warm, simple, excited. Short sentences a 3-year-old can follow.

## Evidence on Hand
- Player heroes: the Hero Squad in `assets/players/heroes.js` (Comet, Luna, Splash, Blaze, Sprout, Bolt), layered SVG that wears the player's colour and reacts to the game (turn, cheer, win, oops, sleep).
- Menu icons: `assets/*.svg`.
- There's no ready-made monkey or jungle artwork, so new game art is drawn in code.

## Product Principles
1. Pictures before words: every instruction can be understood with the sound off and without reading.
2. Forgiving fun: one mistake never wipes out a child's progress, and the youngest can still win.
3. Every tap answers: each action gets immediate, juicy feedback (sound, motion, particles).
4. Fair corners: in multiplayer, each player owns a clear space, colour and set of controls.
5. Works anywhere at home: offline, on an iPad, in both languages.

## Accessibility & Inclusion
- Touch targets at least 64px for little fingers, with forgiving hit areas.
- Never rely on colour alone: players are also shown by their hero.
- Respect reduced motion where it doesn't break gameplay. Sound can be muted.
