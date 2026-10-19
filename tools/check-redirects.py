#!/usr/bin/env python3
"""Check that every old URL in url-map.csv redirects to its new page.

    docker compose up -d --build
    python3 tools/check-redirects.py http://localhost:8080

For each row: old_url must answer 301 with Location new_url, and new_url
must answer 200. Prints failures and exits non-zero if there are any.
"""
import csv
import http.client
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


_local = threading.local()


def request(base, path):
    """HEAD request on a kept-alive connection per thread (thousands of
    one-shot connections exhaust the client's ports)."""
    for attempt in (1, 2):
        conn = getattr(_local, 'conn', None)
        if conn is None:
            u = urlsplit(base)
            if u.scheme == 'https':  # e.g. stage.akimbocomics.com behind Cloudflare
                conn = http.client.HTTPSConnection(u.hostname, u.port or 443, timeout=20)
            else:
                conn = http.client.HTTPConnection(u.hostname, u.port or 80, timeout=20)
            _local.conn = conn
        try:
            conn.request('HEAD', quote(path, safe="/?=&%:@+,;~!$'()*"))
            r = conn.getresponse()
            r.read()
            return r.status, r.getheader('Location') or ''
        except (http.client.HTTPException, OSError):
            conn.close()
            _local.conn = None
            if attempt == 2:
                raise


def check(base, row, explicit=frozenset()):
    olds = [row['old_url']]
    variant = row['old_url'] + 'index.html'
    if row['old_url'].endswith('/') and '?' not in row['old_url'] and variant not in explicit:
        olds.append(variant)
    for old in olds:
        status, loc = request(base, old)
        if status != 301 or loc != row['new_url']:
            return '%s -> got %s %s, expected 301 %s' % (old, status, loc, row['new_url'])
    status, _ = request(base, row['new_url'])
    if status != 200:
        return '%s -> %s, but that answers %s' % (row['old_url'], row['new_url'], status)
    return None


def main(base):
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'url-map.csv'), encoding='utf-8')))
    explicit = frozenset(r['old_url'] for r in rows)
    with ThreadPoolExecutor(8) as pool:
        failures = [f for f in pool.map(lambda r: check(base, r, explicit), rows) if f]
    for f in failures:
        print('FAIL', f)
    print('%d old URLs checked, %d failed' % (len(rows), len(failures)))
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080')
