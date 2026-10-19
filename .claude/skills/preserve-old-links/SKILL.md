---
name: preserve-old-links
description: Keep every old akimbocomics.com URL working. Use for ANY change that moves, renames, merges, deletes or regenerates pages, images, CSS/JS or folders in site/ (or a generated build output), changes URL structure, or touches url-map.csv, known-urls.txt, nginx redirects or the build. Covers updating url-map.csv, regenerating redirects, and verifying nothing broke.
---

# Preserve old links

The site's hard rule: **every URL it has ever served keeps working.** That
includes the original WordPress URLs (`/?p=992`, `/?cat=4`, `/?m=200810`,
`/comic/<file>.jpg`, `/wp-content/uploads/...`), the first static export's
paths (`/2015/02/03/slug/`, `.../index.html`), and every page and file path
served now, including theme CSS/JS and images.

A URL "works" if it is served directly, or `url-map.csv` redirects it (301)
to a path that is served. Redirects must be one hop: never point a row at a
path that is itself redirected.

## The files

| File | Role |
|---|---|
| `url-map.csv` | `old_url,new_url,kind,wp_id,title`. Source of truth for redirects. Never delete rows; only repoint `new_url`. |
| `known-urls.txt` | Every URL ever served. Only grows. Never delete lines. |
| `tools/move-url.py` | Records a move in url-map.csv (repoints rows, adds old → new). |
| `tools/build-redirects.py` | Regenerates `nginx/redirects.conf`, `site/redirects.js`, `site/404.html` from url-map.csv. Fails if a `new_url` doesn't exist. |
| `tools/check-known-urls.py` | Fails if any known URL is neither served nor redirected. `--update` adds new URLs to the baseline. `--site DIR` checks another output folder. |
| `tools/check-redirects.py` | Requests every old URL against a running server; expects 301 → `new_url` → 200. |

## Procedure for any change

1. **Before changing anything**, confirm the baseline passes:
   `python3 tools/check-known-urls.py`
2. Make the change (move/rename files, regenerate output, ...).
3. Record every move in `url-map.csv`:
   - one page or file: `python3 tools/move-url.py OLD NEW`
     (for a post folder, move its image too, or use `--prefix`)
   - a folder or many pages: `python3 tools/move-url.py --prefix /old/ /new/`
   - deleting something with no replacement: don't. Point it at the
     closest equivalent page (e.g. its series listing) by adding a row
     `old,new,removed,,` and run step 4. Removed CSS/JS/images likewise need
     a row (to their replacement) or must stay.
4. Regenerate and check:
   ```
   python3 tools/build-redirects.py
   python3 tools/check-known-urls.py          # must pass
   ```
5. If anything is BROKEN, fix `url-map.csv` (or restore the file); never edit
   the checkers, `known-urls.txt` or CI to make it pass.
6. Full check against the real server:
   ```
   docker compose up -d --build
   python3 tools/check-redirects.py http://localhost:8080
   docker compose down
   ```
7. Add new pages/files to the baseline so they're protected from now on:
   `python3 tools/check-known-urls.py --update`
8. Commit `url-map.csv`, `known-urls.txt`, the regenerated redirect files and
   the site changes **together**. CI (`check-links.yml`) re-runs all of this.

## Switching to a generated build (e.g. Stencil)

Treat the build output folder as the new `site/`. Before it replaces
`site/` in the Docker image, `python3 tools/check-known-urls.py --site <output>`
must pass. Prefer generating pages at the exact current paths so no new rows
are needed; any path that changes goes through step 3. `build-redirects.py`
writes into `site/` (redirects.js, 404.html, index.html loader); move that
into the generator's output step when the output folder changes.

## Notes

- nginx also answers the no-slash and `index.html` forms of every old folder
  path, and ignores extra query params (`/?p=992&cpage=2`).
- The JS fallback (`site/redirects.js`) only covers page URLs on hosts
  without nginx; images can't be redirected client-side.
- Don't map to external sites, and keep `new_url` root-relative (`/x/y/`).
