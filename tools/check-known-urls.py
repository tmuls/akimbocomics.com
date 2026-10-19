#!/usr/bin/env python3
"""Guard against breaking old links. Run from the repo root:

    python3 tools/check-known-urls.py            # check
    python3 tools/check-known-urls.py --update   # check, then add new URLs to the baseline

known-urls.txt lists every URL path the site has ever served (pages, images,
CSS...) plus every old_url in url-map.csv. Each one must still work: either
the file is served from the built site (dist/, made by tools/build-site.py),
or url-map.csv redirects it to a new_url that is served. Fails (exit 1) listing every URL that would break.

--update only ever ADDS lines (new pages/files/map rows); it never removes
any, so a URL that once worked can't silently drop out. Use --site to check
another folder instead of dist/.
"""
import argparse
import csv
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(ROOT, 'known-urls.txt')
HEADER = ('# Every URL path akimbocomics.com has served. Each must keep working:\n'
          '# served (dist/), or redirected by url-map.csv. Only ever add lines;\n'
          '# maintained by tools/check-known-urls.py --update.\n')


def served(site):
    """Every URL path the site directory serves."""
    urls = set()
    for dirpath, dirs, files in os.walk(site):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for f in files:
            if f.startswith('.'):
                continue
            path = '/' + os.path.relpath(os.path.join(dirpath, f), site).replace(os.sep, '/')
            urls.add(path)
            if f == 'index.html':
                urls.add(path[:-len('index.html')])
    return urls


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--update', action='store_true')
    ap.add_argument('--site', default=os.path.join(ROOT, 'dist'))
    args = ap.parse_args()
    if not os.path.isfile(os.path.join(args.site, 'index.html')):
        sys.exit('%s has no built site: run python3 tools/build-site.py' % args.site)

    now = served(args.site)
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'url-map.csv'), encoding='utf-8')))
    mapped = {r['old_url']: r['new_url'] for r in rows}
    known = set()
    if os.path.exists(BASELINE):
        known = {l.rstrip('\n') for l in open(BASELINE, encoding='utf-8') if l.strip() and not l.startswith('#')}

    def works(url):
        if url in now:
            return True
        target = mapped.get(url)
        return target is not None and (target in now or target == '/')

    broken = sorted(u for u in known | set(mapped) if not works(u))
    for u in broken:
        why = 'redirects to missing %s' % mapped[u] if u in mapped else 'no longer served and not in url-map.csv'
        print('BROKEN %s (%s)' % (u, why))
    if broken:
        print('\n%d known URLs would break. Add url-map.csv rows (old_url -> new page) or restore them.' % len(broken))
        sys.exit(1)

    added = (now | set(mapped)) - known
    if args.update and added:
        with open(BASELINE, 'w', encoding='utf-8') as fh:
            fh.write(HEADER)
            fh.writelines(u + '\n' for u in sorted(known | added))
        print('added %d new URLs to known-urls.txt' % len(added))
    print('%d known URLs all work (%d served, %d redirected)%s' % (
        len(known | set(mapped)), len(now), len(mapped),
        '' if args.update or not added else '; %d new URLs not in the baseline yet (run with --update)' % len(added)))


if __name__ == '__main__':
    main()
