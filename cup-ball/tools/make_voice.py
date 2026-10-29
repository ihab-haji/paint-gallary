"""Record the game's voice with Microsoft Edge neural TTS (free, via edge-tts).

Every sentence in words.js gets its own clip: audio/<lang>/<id>.mp3 plus an index.js manifest
(text -> clip id) that the game loads, so it works on GitHub Pages and when opened as a file.
Arabic is ar-SA Zariyah, slow and clear for little kids; English is en-US Ana (a child voice).

Usage:  python3 tools/make_voice.py            (both languages)
        python3 tools/make_voice.py ar
Needs:  pip install edge-tts miniaudio lameenc   and node (to read words.js)
"""
import array, asyncio, hashlib, json, os, subprocess, sys

import edge_tts, lameenc, miniaudio

VOICES = {
    # the same settings as Block Math's kids voice: 18% slower, a gentle pitch lift that keeps consonants clear
    'ar': dict(voice='ar-SA-ZariyahNeural', rate='-18%', pitch='+10Hz'),
    'en': dict(voice='en-US-AnaNeural', rate='-6%', pitch='+0Hz'),
}
SR = 24000
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, '..')


def trim_and_encode(mp3_bytes):
    snd = miniaudio.decode(mp3_bytes, output_format=miniaudio.SampleFormat.SIGNED16, nchannels=1, sample_rate=SR)
    s = snd.samples
    first = next((i for i in range(len(s)) if abs(s[i]) > 500), 0)
    last = next((i for i in range(len(s) - 1, -1, -1) if abs(s[i]) > 500), len(s) - 1)
    pad = int(SR * 0.03)
    seg = array.array('h', s[max(0, first - pad):min(len(s), last + pad)])
    # every clip at the same loudness (about -18 dBFS RMS), never clipping
    if len(seg):
        rms = (sum(v * v for v in seg) / len(seg)) ** 0.5 or 1
        peak = max(abs(v) for v in seg) or 1
        gain = min(4000 / rms, 31000 / peak)
        seg = array.array('h', (max(-32767, min(32767, int(v * gain))) for v in seg))
    fade = min(len(seg) // 4, int(SR * 0.012))
    for i in range(fade):
        seg[i] = int(seg[i] * i / fade)
        seg[-1 - i] = int(seg[-1 - i] * i / fade)
    enc = lameenc.Encoder()
    enc.set_bit_rate(64)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(seg.tobytes()) + enc.flush()


async def synth(text, lang, sem):
    async with sem:
        err = None
        for attempt in range(4):
            try:
                buf = b''
                async for chunk in edge_tts.Communicate(text, **VOICES[lang]).stream():
                    if chunk['type'] == 'audio':
                        buf += chunk['data']
                if buf:
                    return text, buf
            except Exception as e:  # network hiccup: try again
                err = e
            await asyncio.sleep(1 + attempt * 2)
        print('FAILED', lang, text, err)
        return text, None


async def record(lang, texts):
    sem = asyncio.Semaphore(6)
    results = await asyncio.gather(*(synth(t, lang, sem) for t in texts))
    outdir = os.path.join(GAME, 'audio', lang)
    os.makedirs(outdir, exist_ok=True)
    manifest = {}
    for text, raw in results:
        if not raw:
            continue
        clip_id = hashlib.md5(f"{VOICES[lang]}|{text}".encode()).hexdigest()[:12]
        with open(os.path.join(outdir, clip_id + '.mp3'), 'wb') as f:
            f.write(trim_and_encode(raw))
        manifest[text] = clip_id
    for name in os.listdir(outdir):  # drop clips no longer used
        if name.endswith('.mp3') and name[:-4] not in manifest.values():
            os.remove(os.path.join(outdir, name))
    with open(os.path.join(outdir, 'index.js'), 'w', encoding='utf-8') as f:
        f.write(f'window.CUPBALL_VOICE_{lang.upper()}=')
        json.dump(manifest, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f'{lang}: {len(manifest)}/{len(texts)} clips -> audio/{lang}/')
    return len(manifest) == len(texts)


def main():
    phrases = json.loads(subprocess.check_output(['node', os.path.join(HERE, 'phrases.js')]))
    langs = sys.argv[1:] or list(VOICES)
    ok = all(asyncio.run(record(lang, phrases[lang])) for lang in langs)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
