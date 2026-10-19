#!/usr/bin/env python3
"""Record a moved page, file or folder in url-map.csv. Run from the repo root
AFTER moving the files in site/ (or the build output):

    python3 tools/move-url.py /eatshitanddie/eat-shit-die-309/ /esd/309/
    python3 tools/move-url.py --prefix /eatshitanddie/ /eat-shit-and-die/

Exact mode: every row whose new_url is OLD now points at NEW, and a row
OLD -> NEW is added (unless OLD is still served).
--prefix: the same for every path starting with OLD: rows pointing under OLD
are rewritten to the same place under NEW, and every known URL under OLD
(from known-urls.txt) gets a row to its counterpart under NEW.

Redirects stay one hop (no chains). Then run tools/build-redirects.py and
tools/check-known-urls.py.
"""
import argparse
import csv
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = os.path.join(ROOT, 'url-map.csv')
FIELDS = ['old_url', 'new_url', 'kind', 'wp_id', 'title']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--prefix', action='store_true', help='OLD and NEW are folder prefixes')
    ap.add_argument('--kind', default='moved', help='kind for new rows (default: moved)')
    ap.add_argument('old')
    ap.add_argument('new')
    a = ap.parse_args()
    for p in (a.old, a.new):
        if not p.startswith('/') or (a.prefix and not p.endswith('/')):
            sys.exit('paths must start with / (and end with / for --prefix): %s' % p)

    def moved(path):
        if a.prefix:
            return a.new + path[len(a.old):] if path.startswith(a.old) else None
        return a.new if path == a.old else None

    rows = list(csv.DictReader(open(MAP, encoding='utf-8')))
    olds = {r['old_url'] for r in rows}
    repointed = 0
    for r in rows:
        n = moved(r['new_url'])
        if n:
            r['new_url'] = n
            repointed += 1

    known = set()
    kf = os.path.join(ROOT, 'known-urls.txt')
    if os.path.exists(kf):
        known = {l.strip() for l in open(kf, encoding='utf-8') if l.strip() and not l.startswith('#')}
    sources = {p for p in known if moved(p)} if a.prefix else {a.old}
    added = 0
    for old in sorted(sources):
        new = moved(old)
        if old in olds or old == new:
            continue
        rows.append({'old_url': old, 'new_url': new, 'kind': a.kind, 'wp_id': '', 'title': ''})
        olds.add(old)
        added += 1

    with open(MAP, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, FIELDS)
        w.writeheader()
        w.writerows(rows)
    print('repointed %d rows, added %d rows. Now run tools/build-redirects.py and tools/check-known-urls.py' % (repointed, added))


if __name__ == '__main__':
    main()
