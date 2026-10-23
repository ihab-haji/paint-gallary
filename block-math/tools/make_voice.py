"""Generate the game's voice clips with Microsoft Edge neural TTS (free, via edge-tts).

Reads the phrase list written by tools/crawl.js, synthesises every clip, trims silence,
re-encodes to small mono MP3 files in audio/<lang>/ plus an index.js manifest (loads on GitHub Pages and file://).

Usage:  python make_voice.py <ar-kid|ar-zariyah|ar-cartoon|ar-hamed|en> phrases.json [more.json ...]
Needs:  pip install edge-tts miniaudio lameenc
"""
import asyncio, base64, hashlib, json, os, sys, array

import edge_tts, lameenc, miniaudio

VOICES = {
    # Arabic voices (picked in the game menu). Slower and a little higher than default: easier for 4-year-olds.
    'ar-zariyah': dict(voice='ar-SA-ZariyahNeural', rate='-10%', pitch='+12Hz'),  # cheerful
    # default: Zariyah for 4-5 year olds. Slow and clear; only a gentle pitch lift, because big pitch shifts blur the consonants.
    'ar-kid': dict(voice='ar-SA-ZariyahNeural', rate='-18%', pitch='+10Hz'),
    'ar-cartoon': dict(voice='ar-SA-ZariyahNeural', rate='-12%', pitch='+24Hz'),  # higher, cartoon-like
    'ar-hamed': dict(voice='ar-SA-HamedNeural', rate='-12%', pitch='+8Hz'),       # male voice
    # English: a child voice.
    'en': dict(voice='en-US-AnaNeural', rate='-6%', pitch='+0Hz'),
}
SR = 24000
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.voice_cache')


def speak_text(key):
    return key[1:] if key[:1] in ('#', '=') else key


def number_regex(lang):
    """Same number tokens as the game's splitSpeech(), read from index.html."""
    import re
    src = open(os.path.join(HERE, '..', 'index.html'), encoding='utf-8').read()
    name = 'NUMW_EN' if lang == 'en' else 'NUMW'
    words = re.findall(r"'([^']+)'", re.search(r"const %s=\[(.*?)\];" % name, src).group(1))
    if lang != 'en':
        words.append(re.search(r"nwAfter=n=>isAR\(\)&&n===2\?'([^']+)'", src).group(1))
    letters = r'A-Za-z' if lang == 'en' else r'\u0621-\u065F\u066E-\u06D3'
    alt = '|'.join(re.escape(w) for w in sorted(words, key=len, reverse=True))
    return re.compile(rf'(?<![{letters}])(?:{alt}|[0-9\u0660-\u0669]+)(?![{letters}])')


def trim_and_encode(mp3_bytes):
    snd = miniaudio.decode(mp3_bytes, output_format=miniaudio.SampleFormat.SIGNED16, nchannels=1, sample_rate=SR)
    s = snd.samples
    thr = 500
    first = next((i for i in range(len(s)) if abs(s[i]) > thr), 0)
    last = next((i for i in range(len(s) - 1, -1, -1) if abs(s[i]) > thr), len(s) - 1)
    pad = int(SR * 0.03)
    seg = s[max(0, first - pad):min(len(s), last + pad)]
    fade = min(len(seg) // 4, int(SR * 0.012))  # tiny fades so clips join without clicks
    seg = array.array('h', seg)
    # same loudness for every clip (about -18 dBFS RMS), never clipping
    if len(seg):
        rms = (sum(v * v for v in seg) / len(seg)) ** 0.5 or 1
        peak = max(abs(v) for v in seg) or 1
        gain = min(4000 / rms, 31000 / peak)
        seg = array.array('h', (max(-32767, min(32767, int(v * gain))) for v in seg))
    for i in range(fade):
        f = i / fade
        seg[i] = int(seg[i] * f)
        seg[-1 - i] = int(seg[-1 - i] * f)
    enc = lameenc.Encoder()
    enc.set_bit_rate(64)  # clearer consonants on small speakers
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(seg.tobytes()) + enc.flush()


async def synth(key, lang, sem):
    os.makedirs(CACHE, exist_ok=True)
    digest = hashlib.md5(f"{VOICES[lang]}|{key}".encode()).hexdigest()
    name = os.path.join(CACHE, f"{lang}_{digest}.mp3")
    if os.path.exists(name):
        return key, open(name, 'rb').read()
    async with sem:
        for attempt in range(4):
            try:
                com = edge_tts.Communicate(speak_text(key), **VOICES[lang])
                buf = b''
                async for chunk in com.stream():
                    if chunk['type'] == 'audio':
                        buf += chunk['data']
                if buf:
                    open(name, 'wb').write(buf)
                    return key, buf
            except Exception as e:  # network hiccup: retry
                err = e
            await asyncio.sleep(1 + attempt * 2)
        print('FAILED', key, err)
        return key, None


async def main(lang, phrase_files):
    data = [json.load(open(f, encoding='utf-8')) for f in phrase_files]
    keys = {k for d in data for k in d['keys']}
    # Whole sentences that contain numbers get their own clip too, for natural intonation.
    num_re = number_regex('en' if lang == 'en' else 'ar')
    for d in data:
        for t in d['texts']:
            t = ' '.join(t.split())
            if num_re.search(t) and len(t) > len(num_re.search(t).group(0)) + 1:
                keys.add('=' + t)
    keys = sorted(keys)
    sem = asyncio.Semaphore(8)
    results = await asyncio.gather(*(synth(k, lang, sem) for k in keys))
    outdir = os.path.join(HERE, '..', 'audio', lang)
    os.makedirs(outdir, exist_ok=True)
    manifest, total = {}, 0
    for key, raw in results:
        if not raw:
            continue
        data = trim_and_encode(raw)
        total += len(data)
        fid = hashlib.md5(key.encode()).hexdigest()[:12]
        with open(os.path.join(outdir, fid + '.mp3'), 'wb') as f:
            f.write(data)
        manifest[key] = fid
    keep = set(manifest.values())
    for name in os.listdir(outdir):  # drop clips no longer used
        if name.endswith('.mp3') and name[:-4] not in keep:
            os.remove(os.path.join(outdir, name))
    with open(os.path.join(outdir, 'index.js'), 'w', encoding='utf-8') as f:
        f.write(f"window.BM_VOICE_{lang.upper().replace('-', '_')}=")
        json.dump(manifest, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f'{lang}: {len(manifest)}/{len(keys)} clips, {total / 1e6:.1f} MB -> audio/{lang}/')


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], sys.argv[2:]))
