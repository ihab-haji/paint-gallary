# مُغَامَرَةُ الْمُكَعَّبَاتِ · Block Math Adventure

A 3D block-world math game for 4–5 year olds, in Arabic (with full harakat) and English.
It is one static page (`index.html`) plus voice clips in `audio/`, so it runs on GitHub Pages as is.

## One game, many kinds of thinking

There is no level picker: the game adapts quietly (numbers stay between 1 and 10) and mixes counting with thinking games:
shapes, big/small and tall/short, on/under/next to, shadow matching, bees and flowers (more / fewer / the same),
what goes together, what comes next (seed → tree, egg → chicken), tidy-up sorting, building a snow or iron golem in order,
lighting torches at night, hatching turtle eggs and decorating a villager's house.

The road runs through 10 lands (new: Villager Town, Bamboo Jungle, Mushroom Island, Glowing Cave). Every road has
Minecraft animals to tap (each new kind joins the 📖 friend book), home items (lantern, campfire, bed, bell, jukebox…)
and sometimes a friend who meets the hero: a villager, Iron Golem, Allay, Snow Golem, Sniffer or Party Creeper.

Every Arabic sentence has a recorded clip (checked with `tools/sweep.js`). English has no recorded voice for now and uses the device voice.

## Voice

The voice is pre-recorded with Microsoft's free neural voices through
[edge-tts](https://github.com/rany2/edge-tts): **ar-SA Zariyah for kids** (`audio/ar-kid`: 18% slower, a gentle pitch lift that keeps consonants clear,
every clip at the same loudness, 64 kbps). English clips (`en`, en-US Ana) can be generated the same way but are not shipped right now.

Every recorded sentence has its own clip for natural intonation. Unseen number combinations fall back to the sentence
split at its numbers, then by sentences, then by commas. Only if a piece is missing does the game use the device voice.
The full instructions are spoken the first time a puzzle type appears; after that only the short question (🔊 repeats it in full).

- On GitHub Pages (or any `http://` server) clips are fetched on demand and played back to back through Web Audio.
- Opened from a local file, the same clips play through `<audio>` elements.

### Regenerating the voice after changing any spoken text

```bash
npm i puppeteer-core            # once
python3 -m venv .venv && .venv/bin/pip install edge-tts miniaudio lameenc

node tools/crawl.js ar 120 ph_ar.json        # plays the game headless and records every sentence (run several in parallel)
node tools/crawl.js en 120 ph_en.json
node tools/keys.js . ph_ar.json ph_en.json   # -> keys_ar.json, keys_en.json (all fallback levels)
.venv/bin/python tools/make_voice.py ar-cartoon keys_ar.json   # -> audio/ar-cartoon/*.mp3 + index.js
.venv/bin/python tools/make_voice.py en keys_en.json
```

Other Arabic voices are configured in `tools/make_voice.py` (`ar-zariyah`, `ar-hamed`). After generating one,
add its id to `VOICES_READY` in `index.html` and the voice picker appears in the menu.

`tools/harakat.py` adds harakat to any new Arabic words (`python3 tools/harakat.py index.html`)
and lists the words it does not know yet.
