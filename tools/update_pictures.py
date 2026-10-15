"""Finds every picture in the images folder and prepares it for the paint studio.

Writes:
  images-list.js  -> the list of pictures (so you never have to edit images.js by hand)
                     images/my-photos/  -> "My Album",  everything else -> "Coloring Book"
  images-data.js  -> the pictures packed inside a script, so Fill and Save also work
                     when index.html is opened by double-clicking it
"""
import base64
import hashlib
import json
import re
import mimetypes
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(ROOT, 'images')
EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'}
MAX_SIDE = 1400


def shrink(path):
    """Return the bytes of the picture, made smaller with macOS 'sips' when possible."""
    ext = os.path.splitext(path)[1].lower()
    if ext in ('.svg', '.gif') or not shutil.which('sips'):
        with open(path, 'rb') as f:
            return f.read()
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'small' + ext)
        result = subprocess.run(['sips', '-Z', str(MAX_SIDE), path, '--out', out], capture_output=True)
        source = out if result.returncode == 0 and os.path.exists(out) else path
        with open(source, 'rb') as f:
            return f.read()


def main():
    files = []
    for folder, _dirs, names in os.walk(IMAGES_DIR):
        for name in names:
            if os.path.splitext(name)[1].lower() in EXTENSIONS and not name.startswith('.'):
                files.append(os.path.relpath(os.path.join(folder, name), IMAGES_DIR).replace(os.sep, '/'))
    files.sort()
    paths = ['images/' + name for name in files]
    found = [{'file': rel, 'section': 'album' if rel.startswith('images/my-photos/') else 'coloring'} for rel in paths]
    data = {}
    for name, rel in zip(files, paths):
        full = os.path.join(IMAGES_DIR, name)
        mime = mimetypes.guess_type(full)[0] or 'image/png'
        if name.lower().endswith('.svg'):
            mime = 'image/svg+xml'
        data[rel] = 'data:%s;base64,%s' % (mime, base64.b64encode(shrink(full)).decode('ascii'))
        print('  🖼  ' + name)

    header = '/* Made automatically by update-pictures.command — do not edit. */\n'
    with open(os.path.join(ROOT, 'images-list.js'), 'w', encoding='utf-8') as f:
        f.write(header + 'window.PAINT_FOUND_IMAGES = ' + json.dumps(found, ensure_ascii=False, indent=1) + ';\n')
    with open(os.path.join(ROOT, 'images-data.js'), 'w', encoding='utf-8') as f:
        f.write(header + 'window.PAINT_IMAGE_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')

    stamp_app_version()
    print('\n✅ %d pictures ready! You can close this window.' % len(paths))


def stamp_app_version():
    """Give the installed app a new version whenever any picture or the picture list changes,
    so tablets throw away their old saved copies and save the new ones (even if a file kept its name)."""
    digest = hashlib.sha1()
    for base in ('images', 'assets'):
        for folder, _dirs, names in sorted(os.walk(os.path.join(ROOT, base))):
            for name in sorted(names):
                if name.startswith('.'):
                    continue
                full = os.path.join(folder, name)
                digest.update(os.path.relpath(full, ROOT).encode('utf-8'))
                with open(full, 'rb') as f:
                    digest.update(f.read())
    for name in ('images.js', 'images-list.js'):
        with open(os.path.join(ROOT, name), 'rb') as f:
            digest.update(f.read())
    worker = os.path.join(ROOT, 'sw.js')
    with open(worker, encoding='utf-8') as f:
        code = f.read()
    code = re.sub(r"const CACHE = 'paint-studio-[^']*';", "const CACHE = 'paint-studio-%s';" % digest.hexdigest()[:10], code)
    with open(worker, 'w', encoding='utf-8') as f:
        f.write(code)


if __name__ == '__main__':
    sys.exit(main())
