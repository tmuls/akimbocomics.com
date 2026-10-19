# akimbocomics.com

Static re-hosting of the Akimbo Comics WordPress site (WordPress 4.7 +
ComicPress, ran 2009–2021 on a Linode). Served by nginx in Docker, deployed
to a Raspberry Pi k3s cluster (the `homelab` repo, `akimbocomics/`) and public
at akimbocomics.com via a Cloudflare Tunnel.

## The one rule: NEVER break an old link

Every URL the site has ever served must keep working, forever: the original
WordPress links (`/?p=123`, `/?cat=4`, `/comic/<file>.jpg`, ...), the paths of
the first static export (`/2010/10/04/slug/`), and every page or file path
served today. People, search engines and other sites link to all of them.

Any change that moves, renames, merges or removes a page or file **must**
update `url-map.csv` in the same commit. Use the `preserve-old-links` skill
(`.claude/skills/preserve-old-links/SKILL.md`) for the exact steps. Before
committing, always run:

```
python3 tools/build-redirects.py      # regenerate redirects from url-map.csv
python3 tools/check-known-urls.py     # every known URL still served or redirected
```

CI (`.github/workflows/check-links.yml`) runs these plus a full redirect test
against the real nginx image on every push; a red check means a link broke.
Never delete rows from `url-map.csv` or lines from `known-urls.txt`, and
never weaken these checks to make them pass.

## Layout

- `content/`: every post, page and listing as JSON
  (`content/<series>/<slug>.json`, ...). **Pages are generated from it**:
  edit content here, not the `index.html` files in `site/`.
- `stencil/`: the Stencil app that prerenders every page from `content/`
  as plain HTML at its current URL (`stencil/www/`).
- `site/`: the static files served as they are (comic images beside each
  post at `site/<series>/<post-slug>/`, `wp-content/`, `unpublished/`, ...)
  plus, until milestone 5 of the stencil migration, the old exported pages,
  which the build compares the generated pages against.
- `dist/` (gitignored): what's served. `python3 tools/build-site.py` builds
  it: generated pages + `site/`'s non-page files + redirect files, then checks
  every known URL against it. The Dockerfile runs this.
- `url-map.csv`: old URL → current URL (`old_url,new_url,kind,wp_id,title`).
  Source of truth for redirects. `new_url` must always be a path that exists.
- `known-urls.txt`: every URL ever served; only grows.
- `tools/`: `build-site.py` (builds `dist/`), `build-redirects.py`
  (url-map → `nginx/redirects.conf`, `redirects.js`, `404.html`),
  `check-known-urls.py` (static check; `--site dist` for the built site),
  `check-redirects.py` (requests every old URL against a server).
- `nginx/`: server config; `redirects.conf` is generated, don't hand-edit.
- `conversion/`: the one-time WordPress → static pipeline. **Don't re-run
  it**; since the `initial-export` tag the files here are the source of truth
  and are edited directly. Its input (the site archive) contains secrets and
  is never committed.

## Working on it

- Run locally: `docker compose up -d --build` → http://localhost:8080, then
  `python3 tools/check-redirects.py http://localhost:8080`. The image build
  runs Stencil and every check; it fails if any page or known URL breaks.
  Without Docker: `cd stencil && npm ci`, then `python3 tools/build-site.py`.
- Pushing to `main` builds `ghcr.io/tmuls/akimbocomics.com:latest`
  (arm64 + amd64); the Pi picks it up with
  `kubectl -n akimbocomics rollout restart deploy/akimbocomics`.
- Do bigger restructures on a branch; merge to `main` only when CI is green.
- To preview on stage.akimbocomics.com: push to the `stage` branch, then run
  the "Build stage image" workflow by hand (it builds `:stage`), then
  `kubectl -n akimbocomics rollout restart deploy/akimbocomics-stage`.
- The repo is public: no secrets, no commenter email addresses (the site's
  own `akimbocomix@hotmail.com` is fine).

## Ongoing work

- Templatizing the static HTML into a Stencil app: see the
  `stencil-migration` skill (`.claude/skills/stencil-migration/SKILL.md`),
  which holds the plan and a progress log. Update its log as you go.
