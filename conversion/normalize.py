#!/usr/bin/env python3
"""Put each page's images next to its HTML.

Usage: normalize.py EXPORT_DIR MOVES_JSON

The crawl already has one folder per comic series and one subfolder per
post (/<series>/<post-slug>/index.html). This moves:

- each comic image from /comic/ into the folder of the post that shows it
- each upload (/wp-content/uploads/...) used by exactly one post into
  that post's folder
- the Emulsifier Online page (/eo/) and its images to /emulsifier-online/
- comic images no post shows into /unpublished/

then rewrites every reference (src, href, srcset, content, CSS url()) in
all HTML and CSS files, and writes {old site path: new site path} to
MOVES_JSON for the URL map.
"""
import json
import os
import posixpath
import re
import sys
from collections import defaultdict

NOT_SERIES = {'author', 'tag', 'page', 'wp-content', 'wp-includes', 'comic', 'eo', 'about'}
REF = re.compile(r'''(?P<pre>\b(?:src|href|content)=["'])(?P<url>[^"']+)(?P<post>["'])''')
SRCSET = re.compile(r'''(?P<pre>\bsrcset=["'])(?P<val>[^"']+)(?P<post>["'])''')
CSSURL = re.compile(r'''(?P<pre>url\(\s*["']?)(?P<url>[^)"']+)(?P<post>["']?\s*\))''')


def site_path(root, fs_path):
    return '/' + os.path.relpath(fs_path, root).replace(os.sep, '/')


def resolve(page, url):
    """Site path a reference points at, or None for external/anchor links."""
    if re.match(r'^[a-z][a-z0-9+.-]*:|^//|^#', url, re.I):
        return None
    path = url.split('#')[0].split('?')[0]
    if not path:
        return None
    if path.startswith('/'):
        full = posixpath.normpath(path)
    else:
        full = posixpath.normpath(posixpath.join(posixpath.dirname(page), path))
    if path.endswith('/') and not full.endswith('/'):
        full += '/'
    return full


def post_pages(root):
    """{post folder site path: its index.html site path}."""
    pages = {}
    for series in sorted(os.listdir(root)):
        sdir = os.path.join(root, series)
        if series in NOT_SERIES or not os.path.isdir(sdir):
            continue
        for slug in sorted(os.listdir(sdir)):
            index = os.path.join(sdir, slug, 'index.html')
            if slug != 'page' and os.path.isfile(index):
                pages['/%s/%s/' % (series, slug)] = site_path(root, index)
    return pages


def refs_in(root, page):
    with open(os.path.join(root, page.lstrip('/')), encoding='utf-8', errors='replace') as fh:
        s = fh.read()
    out = set()
    for m in REF.finditer(s):
        out.add(resolve(page, m.group('url')))
    for m in SRCSET.finditer(s):
        for part in m.group('val').split(','):
            if part.strip():
                out.add(resolve(page, part.strip().split()[0]))
    out.discard(None)
    return out


def words(s):
    return set(re.findall(r'[a-z]+|\d+', s.lower()))


def best_owner(ref, folders):
    """ComicPress shows every comic dated that day on each post of that day,
    so an image can appear on several posts. Give it to the post whose slug
    shares the most words/numbers with the file name (date excluded)."""
    name = words(re.sub(r'^\d{4}-\d{2}-\d{2}', '', posixpath.basename(ref)).rsplit('.', 1)[0])
    ranked = sorted(folders, key=lambda f: (-len(name & words(f.rstrip('/').split('/')[-1])), f))
    if len(folders) > 1:
        print('  %s is on %d posts; keeping it with %s' % (posixpath.basename(ref), len(folders), ranked[0]))
    return ranked[0]


def plan_moves(root):
    moves = {}
    pages = post_pages(root)
    comic_users, upload_users = defaultdict(set), defaultdict(set)
    for folder, page in pages.items():
        for ref in refs_in(root, page):
            if ref.startswith('/comic/'):
                comic_users[ref].add(folder)
            elif ref.startswith('/wp-content/uploads/'):
                upload_users[ref].add(folder)
    comic_owner = {ref: best_owner(ref, folders) for ref, folders in comic_users.items()}
    for ref, folder in comic_owner.items():
        if os.path.isfile(os.path.join(root, ref.lstrip('/'))):
            moves[ref] = folder + posixpath.basename(ref)
    for ref, folders in upload_users.items():
        if len(folders) == 1 and os.path.isfile(os.path.join(root, ref.lstrip('/'))):
            moves[ref] = next(iter(folders)) + posixpath.basename(ref)
    for sub, new in (('comic', '/unpublished/'), ('eo', '/emulsifier-online/')):
        d = os.path.join(root, sub)
        for dirpath, _, files in os.walk(d) if os.path.isdir(d) else ():
            for f in files:
                old = site_path(root, os.path.join(dirpath, f))
                moves.setdefault(old, new + os.path.relpath(os.path.join(dirpath, f), d).replace(os.sep, '/'))
    # Two different files landing on the same name in one folder: keep both.
    taken = {}
    for old in sorted(moves):
        new = moves[old]
        n = 2
        while new in taken or (os.path.exists(os.path.join(root, new.lstrip('/'))) and new != old):
            stem, ext = posixpath.splitext(moves[old])
            new = '%s-%d%s' % (stem, n, ext)
            n += 1
        taken[new] = old
        moves[old] = new
    return moves


def relative(page, target):
    rel = posixpath.relpath(target, posixpath.dirname(page))
    return rel + ('/' if target.endswith('/') and not rel.endswith('/') else '')


def rewrite(root, moves):
    dir_moves = {}
    for old, new in moves.items():
        if old.endswith('/index.html'):
            dir_moves[old[:-len('index.html')]] = new[:-len('index.html')]

    def fix(page, url):
        target = resolve(page, url)
        if target is None:
            return url
        new = moves.get(target) or dir_moves.get(target)
        if not new:
            return url
        suffix = url[len(url.split('#')[0].split('?')[0]):]
        return (new if url.startswith('/') else relative(page, new)) + suffix

    changed = 0
    for dirpath, _, files in os.walk(root):
        for f in files:
            if not f.endswith(('.html', '.css')):
                continue
            fs = os.path.join(dirpath, f)
            page = site_path(root, fs)
            with open(fs, encoding='utf-8', errors='surrogateescape') as fh:
                s = fh.read()
            t = REF.sub(lambda m: m.group('pre') + fix(page, m.group('url')) + m.group('post'), s)
            t = CSSURL.sub(lambda m: m.group('pre') + fix(page, m.group('url')) + m.group('post'), t)
            t = SRCSET.sub(lambda m: m.group('pre') + ', '.join(
                ' '.join([fix(page, p.split()[0])] + p.split()[1:]) for p in m.group('val').split(',') if p.strip()
            ) + m.group('post'), t)
            if t != s:
                with open(fs, 'w', encoding='utf-8', errors='surrogateescape') as fh:
                    fh.write(t)
                changed += 1
    return changed


def main(root, moves_json):
    moves = plan_moves(root)
    for old, new in sorted(moves.items()):
        dst = os.path.join(root, new.lstrip('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        os.rename(os.path.join(root, old.lstrip('/')), dst)
    changed = rewrite(root, moves)
    for sub in ('comic', 'eo'):
        d = os.path.join(root, sub)
        for dirpath, _, _ in os.walk(d, topdown=False) if os.path.isdir(d) else ():
            if not os.listdir(dirpath):
                os.rmdir(dirpath)
    with open(moves_json, 'w') as fh:
        json.dump(moves, fh, indent=1, sort_keys=True)
    kinds = defaultdict(int)
    for old in moves:
        kinds[old.split('/')[1]] += 1
    print('  moved %s; rewrote references in %d files' % (dict(kinds), changed))


if __name__ == '__main__':
    main(*sys.argv[1:3])
