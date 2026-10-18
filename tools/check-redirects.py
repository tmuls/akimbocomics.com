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
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def request(base, path):
    u = urlsplit(base)
    conn = http.client.HTTPConnection(u.hostname, u.port or 80, timeout=20)
    conn.request('HEAD', quote(path, safe="/?=&%:@+,;~!$'()*"))
    r = conn.getresponse()
    loc = r.getheader('Location') or ''
    conn.close()
    return r.status, loc


def check(base, row):
    status, loc = request(base, row['old_url'])
    if status != 301 or loc != row['new_url']:
        return '%s -> got %s %s, expected 301 %s' % (row['old_url'], status, loc, row['new_url'])
    status, _ = request(base, row['new_url'])
    if status != 200:
        return '%s -> %s, but that answers %s' % (row['old_url'], row['new_url'], status)
    return None


def main(base):
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'url-map.csv'), encoding='utf-8')))
    with ThreadPoolExecutor(8) as pool:
        failures = [f for f in pool.map(lambda r: check(base, r), rows) if f]
    for f in failures:
        print('FAIL', f)
    print('%d old URLs checked, %d failed' % (len(rows), len(failures)))
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080')
