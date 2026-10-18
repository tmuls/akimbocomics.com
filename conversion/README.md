# WordPress → static conversion

How `site/` and `url-map.csv` were made from the original WordPress site.
You don't need this for day-to-day changes: since the `initial-export` tag,
the static files in `site/` are the source of truth and get edited directly
(see "After the conversion" below). This is here so the conversion can be
re-run or audited.

## What you need

- **The site archive**: `site-akimbocomics.com.tar.gz` from the 2026-10-18
  server backup (`~/server-backup-2026-10-18/` on the Mac). It holds the
  WordPress files and a database dump (`akimbocomics.sql`). It contains
  passwords and commenters' email addresses, so it is **not** in this repo;
  keep it private.
- Docker, `wget` and `python3` (3.7+). Port 8080 free.

## Run it

```
conversion/convert.sh ~/server-backup-2026-10-18/site-akimbocomics.com.tar.gz
```

Takes a few minutes. It replaces `site/` and `url-map.csv` and regenerates
the redirects; check the result with `git status` / `git diff --stat` and
`docker compose up -d --build`.

## What it does

1. Extracts the archive into `conversion/work/` (git-ignored) and points the
   WordPress copy at a local database and `http://localhost:8080`.
2. Adds two must-use plugins from `wordpress/mu-plugins/`:
   - `normalize-urls.php`: one folder per comic series (the category links
     in the sidebar), one subfolder per post: `/<series>/<post-slug>/`. A post
     in several categories goes in its most specific one; posts only in the
     generic "Comics" category go in `/comics/`.
   - `static-export.php`: removes head links to dynamic endpoints, and
     rewrites hard-coded links to the live site (header image, uploads,
     `?p=` links between posts) so they point at the local copy.
3. Runs WordPress 4.7 on PHP 7.0 with MariaDB (`wordpress/`) from the archive.
4. Exports WordPress's IDs, slugs and URLs (`wordpress/export-urls.php`).
5. Crawls the site with `wget` into static HTML.
6. `postprocess.py`: removes what only worked on live WordPress (comment
   form, feeds, login links, emoji loader), unlinks commenter email
   addresses, fixes an extensionless comic, and copies comic images no page
   uses.
7. `normalize.py`: moves each comic image (and uploads used by only one
   post) into its post's folder, `/eo/` to `/emulsifier-online/`, unused
   comic images to `/unpublished/`, and rewrites every reference.
8. `build-urlmap.py`: writes `url-map.csv`, every URL the old site answered
   to (`?p=`, `?page_id=`, `?cat=`, `?tag=`, `?author=`, `?m=`, `?paged=`,
   `?attachment_id=`, `/comic/...`, thumbnails, uploads, `/eo/`) plus the
   paths of the initial export, mapped to the new paths.
9. Moves the result into `site/` and runs `tools/build-redirects.py`.

## After the conversion

Change files in `site/` directly; don't re-run the conversion (it would
overwrite those changes). When a page moves, keep old links working:

1. Update `url-map.csv`: point every row whose `new_url` was the old path at
   the new one, and add a row from the old path to the new path.
2. Run `python3 tools/build-redirects.py`. It fails if any `new_url` doesn't
   exist in `site/`.
