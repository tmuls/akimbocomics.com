#!/usr/bin/env python3
"""Write url-map.csv: every URL the WordPress site answered to -> new path.

Usage: build-urlmap.py WORDPRESS_URLS_JSON MOVES_JSON SITE_DIR OUT_CSV

Covers the original site's query-string URLs (?p=, ?page_id=, ?cat=,
?category_name=, ?tag=, ?author=, ?m=, ?paged=, ?attachment_id=, ?feed=),
its file URLs (/comic/..., the /comics-rss|archive|mini/ thumbnails,
/wp-content/uploads/..., /eo/...), and the paths used by the initial static
export (git tag initial-export). Fails if any target is missing from SITE_DIR.
"""
import csv
import json
import os
import sys

FIELDS = ['old_url', 'new_url', 'kind', 'wp_id', 'title']


def main(urls_json, moves_json, site, out_csv):
    wp = json.load(open(urls_json))
    moves = json.load(open(moves_json))
    rows = []

    def add(old, new, kind, wp_id='', title=''):
        if old != new:
            rows.append({'old_url': old, 'new_url': new, 'kind': kind, 'wp_id': wp_id, 'title': title})

    for p in wp['posts']:
        add('/?p=%d' % p['id'], p['url'], 'post', p['id'], p['title'])
        add(p['export_url'], p['url'], 'export-post', p['id'], p['title'])
    for p in wp['pages']:
        add('/?page_id=%d' % p['id'], p['url'], 'page', p['id'], p['title'])
        add('/?p=%d' % p['id'], p['url'], 'page', p['id'], p['title'])
    for c in wp['categories']:
        if not os.path.isdir(os.path.join(site, c['url'].strip('/'))):
            continue  # empty category, never had a page
        add('/?cat=%d' % c['id'], c['url'], 'category', c['id'], c['name'])
        add('/?category_name=%s' % c['slug'], c['url'], 'category', c['id'], c['name'])
        add(c['export_url'], c['url'], 'export-category', c['id'], c['name'])
        add('/category/%s/' % c['slug'], c['url'], 'export-category', c['id'], c['name'])
    for t in wp['tags']:
        if os.path.isdir(os.path.join(site, t['url'].strip('/'))):
            add('/?tag=%s' % t['slug'], t['url'], 'tag', t['id'], t['slug'])
    for a in wp['authors']:
        if os.path.isdir(os.path.join(site, a['url'].strip('/'))):
            add('/?author=%d' % a['id'], a['url'], 'author', a['id'], a['slug'])
    for ym, url in sorted(wp['months'].items()):
        add('/?m=%s' % ym, url, 'month', '', 'first post of %s-%s' % (ym[:4], ym[4:]))
    pages_dir = os.path.join(site, 'page')
    for n in sorted(os.listdir(pages_dir) if os.path.isdir(pages_dir) else [], key=int):
        add('/?paged=%s' % n, '/page/%s/' % n, 'home-page')
    for f in ('rss2', 'rss', 'atom', 'comments-rss2'):
        add('/?feed=%s' % f, '/', 'feed')
    add('/feed/', '/', 'feed')
    add('/comments/feed/', '/', 'feed')
    for a in wp['attachments']:
        target = moves.get(a['file'], a['file'])
        if os.path.isfile(os.path.join(site, target.lstrip('/'))):  # skip uploads no page used
            add('/?attachment_id=%d' % a['id'], target, 'attachment', a['id'])

    for old, new in sorted(moves.items()):
        if old.startswith('/eo/'):
            add(old, new, 'emulsifier-online')
            if old == '/eo/index.html':
                add('/eo/', '/emulsifier-online/', 'emulsifier-online')
                add('/eo/index.php', '/emulsifier-online/', 'emulsifier-online')
                # A post links to /emulsifier/, which never existed; it meant these.
                add('/emulsifier/', '/emulsifier-online/', 'emulsifier-online')
            continue
        add(old, new, 'file')
        if old.startswith('/comic/'):
            for thumbs in ('comics-rss', 'comics-archive', 'comics-mini'):
                add('/%s/%s' % (thumbs, old[len('/comic/'):]), new, 'thumbnail')

    seen, unique = {}, []
    for r in rows:
        if r['old_url'] in seen:
            if seen[r['old_url']] != r['new_url']:
                print('  conflict: %s -> %s and %s' % (r['old_url'], seen[r['old_url']], r['new_url']))
            continue
        seen[r['old_url']] = r['new_url']
        unique.append(r)

    missing = [r for r in unique if not (
        os.path.isfile(os.path.join(site, r['new_url'].lstrip('/'))) or
        os.path.isfile(os.path.join(site, r['new_url'].strip('/'), 'index.html')) or r['new_url'] == '/')]
    for r in missing:
        print('  MISSING target: %s -> %s' % (r['old_url'], r['new_url']))

    with open(out_csv, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, FIELDS)
        w.writeheader()
        w.writerows(unique)
    counts = {}
    for r in unique:
        counts[r['kind']] = counts.get(r['kind'], 0) + 1
    print('  wrote %d mappings: %s' % (len(unique), counts))
    if missing:
        sys.exit(1)


if __name__ == '__main__':
    main(*sys.argv[1:5])
