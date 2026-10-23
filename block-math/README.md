# مُغَامَرَةُ الْمُكَعَّبَاتِ · Block Math Adventure

A 3D block-world math game for 4–5 year olds, in Arabic (with full harakat) and English.
It is one static page (`index.html`) plus voice clips in `audio/`, so it runs on GitHub Pages as is.

## Voice

The voice is pre-recorded with Microsoft's free neural voices through
[edge-tts](https://github.com/rany2/edge-tts): **ar-SA Zariyah, cartoon style** (slower, higher pitch for young children)
for Arabic and **en-US Ana** (a child voice) for English.

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
