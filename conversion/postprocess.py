#!/usr/bin/env python3
"""Clean up a wget crawl of the local WordPress copy.

Usage: postprocess.py EXPORT_DIR WORDPRESS_DIR

- Images wget saved with an added ".html" (e.g. a comic with no file
  extension) are renamed back to an image name.
- Removes what only worked on live WordPress: pingback/feed/login links,
  the emoji loader, the comment form (existing comments stay).
- Unlinks commenter email addresses typed into the "Website" field.
- Makes leftover absolute links to the local server root-relative.
- Copies comic images no page uses into EXPORT_DIR/comic, so nothing is lost.
"""
import os
import re
import shutil
import sys

BASE = 'http://localhost:8080'
SITE_EMAIL = 'akimbocomix@'  # the site's own contact address stays linked

SUBS = [
    (re.compile(r'[ \t]*<link rel="pingback"[^>]*>\n?'), ''),
    (re.compile(r'[ \t]*<link[^>]*rel="alternate"[^>]*/feed/?"[^>]*>\n?'), ''),
    (re.compile(r'<script type="text/javascript">\s*window\._wpemojiSettings.*?</script>\s*', re.S), ''),
    (re.compile(r'<style type="text/css">\s*img\.wp-smiley.*?</style>\s*', re.S), ''),
    (re.compile(r'<p class="must-log-in">.*?</p>', re.S), '<p class="must-log-in">Comments are closed.</p>'),
    (re.compile(r'<a [^>]*href="' + re.escape(BASE) + r'/[^"]*feed/?"[^>]*>(.*?)</a>', re.S), r'\1'),
    (re.compile(r'<a [^>]*href="' + re.escape(BASE) + r'/wp-login\.php[^"]*"[^>]*>(.*?)</a>', re.S), r'\1'),
    (re.compile(r'<a href="(?:https?://|mailto:)?(?!' + SITE_EMAIL + r')[^"/\s]+@[^"/\s]+\.[a-z]{2,}/?"[^>]*>(.*?)</a>', re.S), r'\1'),
    (re.compile(r' title="(?:https?://)?(?!' + SITE_EMAIL + r')[^"/\s]+@[^"/\s]+\.[a-z]{2,}/?"'), ''),
    (re.compile(re.escape(BASE) + r'(?=/)'), ''),
    (re.compile(re.escape(BASE)), '/'),
]

MAGIC = {b'\xff\xd8\xff': '.jpg', b'\x89PNG': '.png', b'GIF8': '.gif'}
IMAGE_EXT = re.compile(r'\.(jpe?g|png|gif)$', re.I)


def html_files(root):
    for d, _, files in os.walk(root):
        for f in files:
            if f.endswith('.html'):
                yield os.path.join(d, f)


def fix_mislabeled_images(root):
    """Rename images that wget saved as NAME.html; return {old name: new name}."""
    renames = {}
    for path in list(html_files(root)):
        with open(path, 'rb') as fh:
            head = fh.read(4)
        ext = next((e for m, e in MAGIC.items() if head.startswith(m)), None)
        if not ext:
            continue
        old = os.path.basename(path)
        new = old[:-len('.html')]
        if not IMAGE_EXT.search(new):
            new += ext
        os.rename(path, os.path.join(os.path.dirname(path), new))
        renames[old] = new
        print('  renamed image %s -> %s' % (old, new))
    return renames


def main(export, wordpress):
    renames = fix_mislabeled_images(export)
    for path in html_files(export):
        with open(path, encoding='utf-8', errors='surrogateescape') as fh:
            s = fh.read()
        t = s
        for old, new in renames.items():
            t = t.replace(old, new)
        for rx, rep in SUBS:
            t = rx.sub(rep, t)
        if t != s:
            with open(path, 'w', encoding='utf-8', errors='surrogateescape') as fh:
                fh.write(t)

    src, dst = os.path.join(wordpress, 'comic'), os.path.join(export, 'comic')
    os.makedirs(dst, exist_ok=True)
    have = {IMAGE_EXT.sub('', f).lower() for f in os.listdir(dst)}
    copied = 0
    for f in sorted(os.listdir(src)):
        if f.startswith('.') or IMAGE_EXT.sub('', f).lower() in have:
            continue
        shutil.copy2(os.path.join(src, f), os.path.join(dst, f))
        copied += 1
    print('  copied %d comic images no page uses' % copied)

    left = [p for p in html_files(export) if 'localhost:8080' in open(p, encoding='utf-8', errors='replace').read()]
    print('  pages still mentioning localhost: %d' % len(left))


if __name__ == '__main__':
    main(*sys.argv[1:3])
