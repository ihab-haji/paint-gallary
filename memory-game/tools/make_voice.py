"""Record the Memory Match voice with Microsoft Edge neural TTS (free, via edge-tts).

Arabic is always ar-SA-ZariyahNeural with the Block Math kids settings (18% slower, gentle pitch lift: clear consonants).
Every Arabic phrase is written with full harakat (pausal sukun on the last letter) so each word is read correctly.
English uses en-US-AnaNeural (a child voice).
Card names are read from ../cards.js, so a new card only needs its name there; then run this again.
Writes audio/<ar|en>/<key>.mp3 (trimmed, same loudness, small mono MP3) and removes clips no longer used.

Usage:  python make_voice.py
Needs:  pip install edge-tts miniaudio lameenc   (and node, to read cards.js)
"""
import asyncio, importlib.util, json, os, re, subprocess, sys

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
# shared trimming / loudness / MP3 settings from the Block Math voice tool
sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location('block_math_voice', os.path.join(HERE, '..', '..', 'block-math', 'tools', 'make_voice.py'))
_bm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_bm)
trim_and_encode = _bm.trim_and_encode

VOICES = {
    'ar': dict(voice='ar-SA-ZariyahNeural', rate='-18%', pitch='+10Hz'),
    'en': dict(voice='en-US-AnaNeural', rate='-6%', pitch='+0Hz'),
}

# keep the keys in sync with say(...) in ../index.html
PHRASES = {
    'ar': {
        'title': 'لُعْبَةُ الذَّاكِرَةْ!',
        'look': 'هَيَّا نَتَذَكَّرْ!',
        'go': 'وَالْآنَ، اِبْحَثْ عَنِ الْأَزْوَاجْ!',
        'great1': 'رَائِعْ!', 'great2': 'مُمْتَازْ!', 'great3': 'عَمَلٌ جَمِيلْ!', 'great4': 'مُدْهِشْ!',
        'win': 'فَوْزٌ رَائِعْ!',
        'open': 'اِفْتَحِ الصُّنْدُوقْ!',
        'prize': 'جَائِزَةٌ جَدِيدَةْ!',
    },
    'en': {
        'title': 'Memory Match!',
        'look': "Let's remember!",
        'go': 'Now find the pairs!',
        'great1': 'Great!', 'great2': 'Super!', 'great3': 'Well done!', 'great4': 'Amazing!',
        'win': 'You did it!',
        'open': 'Open the chest!',
        'prize': 'A new prize!',
    },
}

ARABIC_LETTER = re.compile(r'[ء-ي]')
HARAKAH = re.compile(r'[ً-ْ]')


def card_names():
    js = "global.window={};require(process.argv[1]);console.log(JSON.stringify(window.MEMORY_THEMES))"
    themes = json.loads(subprocess.check_output(['node', '-e', js, os.path.join(HERE, '..', 'cards.js')]))
    for th in themes:
        PHRASES['ar']['th_' + th['id']] = th['name']['ar'] + '!'
        PHRASES['en']['th_' + th['id']] = th['name']['en'] + '!'
        for it in th['items']:
            PHRASES['ar'][it['id']] = it['name']['ar'] + '!'
            PHRASES['en'][it['id']] = it['name']['en'] + '!'


def check_harakat():
    """Every Arabic letter (except long vowels and alif/hamza seats) must carry a harakah."""
    bad = []
    for key, text in PHRASES['ar'].items():
        for word in re.findall(r'[ء-ْ]+', text):
            for i, ch in enumerate(word):
                if not ARABIC_LETTER.match(ch) or ch in 'اىآ':
                    continue
                nxt = word[i + 1] if i + 1 < len(word) else ''
                follows_vowel = i > 0 and HARAKAH.match(word[i - 1] or '') and ch in 'وي'
                is_al = word.startswith('ال') and i == 1  # the lam of "al" before a sun letter
                if not HARAKAH.match(nxt) and not follows_vowel and not is_al and not (ch == 'و' and i == 0):
                    bad.append(f'{key}: {word} (letter {i + 1})')
    if bad:
        sys.exit('Missing harakat:\n  ' + '\n  '.join(bad))


async def check_voices():
    names = {v['ShortName'] for v in await edge_tts.list_voices()}
    for lang, cfg in VOICES.items():
        if cfg['voice'] not in names:
            sys.exit(f"Voice {cfg['voice']} is not available - nothing recorded.")


async def record(lang, key, text, sem):
    async with sem:
        for attempt in range(4):
            try:
                buf = b''
                async for chunk in edge_tts.Communicate(text, **VOICES[lang]).stream():
                    if chunk['type'] == 'audio':
                        buf += chunk['data']
                if buf:
                    with open(os.path.join(HERE, '..', 'audio', lang, key + '.mp3'), 'wb') as f:
                        f.write(trim_and_encode(buf))
                    return True
            except Exception:  # network hiccup: retry
                await asyncio.sleep(1 + attempt * 2)
        print('FAILED', lang, key)
        return False


async def main():
    card_names()
    check_harakat()
    await check_voices()
    sem = asyncio.Semaphore(6)
    jobs = []
    for lang, phrases in PHRASES.items():
        outdir = os.path.join(HERE, '..', 'audio', lang)
        os.makedirs(outdir, exist_ok=True)
        for name in os.listdir(outdir):  # drop clips no longer used
            if name.endswith('.mp3') and name[:-4] not in phrases:
                os.remove(os.path.join(outdir, name))
        jobs += [record(lang, key, text, sem) for key, text in phrases.items()]
    done = await asyncio.gather(*jobs)
    print(f"{sum(done)}/{len(done)} clips ({VOICES['ar']['voice']} / {VOICES['en']['voice']}) -> audio/ar, audio/en")
    if not all(done):
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
