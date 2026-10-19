#!/usr/bin/env python3
"""Build the site that gets served: dist/. Run from the repo root:

    python3 tools/build-site.py              # needs node (npm ci in stencil/ first)
    python3 tools/build-site.py --skip-stencil   # reuse stencil/www from a previous build

1. Stencil prerenders every page from content/ into stencil/www/, and its
   checks run (`npm run verify`).
2. dist/ = every file in site/ (the static files: comic images beside each
   post, wp-content/, wp-includes/, unpublished/, the old theme CSS/JS, all
   at their current URLs), then the generated pages and files from
   stencil/www/ on top.
   Stencil's unused leftovers (build/ JS, robots.txt, sitemap.xml,
   host.config.json) are left out.
3. tools/build-redirects.py writes redirects.js, 404.html and the home
   page's redirect loader into dist/ (for hosts without nginx).
4. tools/check-known-urls.py --site dist: every URL ever served still works.

The Dockerfile runs this and serves dist/; CI builds the Dockerfile.
"""
import argparse
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
WWW = os.path.join(ROOT, 'stencil', 'www')
DIST = os.path.join(ROOT, 'dist')

# Written by build-redirects.py into the output; not copied from site/.
GENERATED = {'redirects.js', '404.html'}
# Emitted by Stencil but used by no page.
STENCIL_LEFTOVERS = {'build', 'robots.txt', 'sitemap.xml', 'host.config.json'}


def run(*cmd, cwd=ROOT):
    print('+ ' + ' '.join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


def copy_tree(src, dst, skip):
    """Copy files from src into dst (overwriting), except where skip(rel) is true."""
    n = 0
    for dirpath, dirs, files in os.walk(src):
        rel_dir = os.path.relpath(dirpath, src)
        dirs[:] = [d for d in dirs if not skip(os.path.normpath(os.path.join(rel_dir, d)), True)]
        for f in files:
            rel = os.path.normpath(os.path.join(rel_dir, f))
            if skip(rel, False):
                continue
            os.makedirs(os.path.join(dst, rel_dir), exist_ok=True)
            shutil.copy2(os.path.join(src, rel), os.path.join(dst, rel))
            n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--skip-stencil', action='store_true', help='reuse stencil/www as it is')
    args = ap.parse_args()

    if not args.skip_stencil:
        stencil = os.path.join(ROOT, 'stencil')
        run('npm', 'run', 'build', '--', '--ci', cwd=stencil)  # --ci: no progress spinner
        run('npm', 'run', 'verify', cwd=stencil)

    shutil.rmtree(DIST, ignore_errors=True)
    os.makedirs(DIST)
    # Pages (index.html) all come from Stencil, never from site/; anything it
    # didn't generate shows up as broken in the known-URL check below.
    static = copy_tree(SITE, DIST, lambda rel, is_dir: not is_dir and (
        os.path.basename(rel) == 'index.html' or rel in GENERATED))
    generated = copy_tree(WWW, DIST, lambda rel, is_dir: rel in STENCIL_LEFTOVERS)
    print(f'dist/: {static} static files from site/, {generated} files from stencil/www/')

    run(sys.executable, 'tools/build-redirects.py', '--site', DIST)
    run(sys.executable, 'tools/check-known-urls.py', '--site', DIST)


if __name__ == '__main__':
    main()
