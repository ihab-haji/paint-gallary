# مُغَامَرَةُ الْمُكَعَّبَاتِ · Block Math Adventure

A 3D block-world math game for 4–5 year olds, in Arabic (with full harakat) and English.
It is one static page (`index.html`) plus voice clips in `audio/`, so it runs on GitHub Pages as is.

## Voice

The voice is pre-recorded with Microsoft's free neural voices through
[edge-tts](https://github.com/rany2/edge-tts): **ar-SA Zariyah** for Arabic and **en-US Ana** (a child voice) for English.
Sentences are split at the numbers, so a fixed set of clips covers every question the game can ask.
If a sentence has no clip, the game falls back to the device's own speech voice.

- On GitHub Pages (or any `http://` server) clips are fetched on demand and played back to back through Web Audio.
- Opened from a local file, the same clips play through `<audio>` elements.

### Regenerating the voice after changing any spoken text

```bash
npm i puppeteer-core            # once, anywhere
python3 -m venv .venv && .venv/bin/pip install edge-tts miniaudio lameenc

node tools/crawl.js ar 600 phrases_ar.json   # plays the game headless and records every sentence
node tools/crawl.js en 450 phrases_en.json
.venv/bin/python tools/make_voice.py ar phrases_ar.json   # writes audio/ar/*.mp3 + audio/ar/index.js
.venv/bin/python tools/make_voice.py en phrases_en.json
```

`tools/harakat.py` adds harakat to any new Arabic words (`python3 tools/harakat.py index.html`)
and lists the words it does not know yet.
