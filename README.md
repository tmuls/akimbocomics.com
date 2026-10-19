# akimbocomics.com

A non-wordpress re-hosting of akimbocomics.com

## Run it

```
docker compose up -d --build
```

Then open http://localhost:8080. To serve on another port (e.g. 80 on a server):

```
PORT=80 docker compose up -d --build
```

Without compose:

```
docker build -t akimbocomics .
docker run -d -p 80:8080 --restart unless-stopped akimbocomics
```

Or use the prebuilt image (arm64 and amd64), rebuilt on every push to `main`
by the "Build container image" workflow:

```
docker run -d -p 80:8080 ghcr.io/tmuls/akimbocomics.com:latest
```

In the homelab k3s cluster it's deployed by `akimbocomics/akimbocomics.yaml`
in the `homelab` repo.

### Stage (stage.akimbocomics.com)

To preview changes before merging to `main`, push them to the `stage`
branch, then run Actions → **Build stage image** by hand. It builds `stage`
into `ghcr.io/tmuls/akimbocomics.com:stage` (with a `robots.txt` that keeps
search engines off), which the k3s cluster runs from
`akimbocomics/akimbocomics-stage.yaml` in the `homelab` repo.

## Layout

| Path | What |
|---|---|
| `content/` | Every post, page and listing as JSON; the pages are generated from it. |
| `stencil/` | Stencil app that prerenders every page from `content/` as plain HTML (no JavaScript) at its current URL. See `stencil/README.md`. |
| `dist/` | What's served (gitignored): built by `python3 tools/build-site.py`, i.e. the generated pages plus `site/`'s static files plus the redirect files. |
| `site/` | Static files served as they are (comic images, `wp-content/`, ...). The original exported pages are at the git tag `exported-pages`. |
| `site/<series>/` | One folder per comic series (the category links in the sidebar), e.g. `eatshitanddie/`, `washday/`, `curiousurgency/`, plus `news/`, `fan-art/`, and `comics/` for strips that were only in the generic Comics category. Its listing pages are generated from `content/listings/`. |
| `site/<series>/<post-slug>/` | One folder per post with its comic image; the page itself is generated there from `content/<series>/<post-slug>.json`. |
| `site/emulsifier-online/` | The pre-akimbo Emulsifier Online comics (was `/eo/`). |
| `site/unpublished/` | Comic images no post ever showed (re-uploads, misnamed files). |
| `url-map.csv` | **Every URL the old WordPress site answered to, mapped to its page here.** See below. |
| `known-urls.txt` | Every URL the site has ever served; each must keep working. Only grows. |
| `tools/` | `build-site.py` (build and check `dist/`), `build-redirects.py` (redirects from `url-map.csv`), `move-url.py` (record a move), `check-known-urls.py` / `check-redirects.py` (verify nothing broke). |
| `CLAUDE.md`, `.claude/skills/` | Rules and procedures for Claude Code sessions: `preserve-old-links`, `stencil-migration` (plan + progress log). |
| `.github/workflows/check-links.yml` | CI: fails if any old link breaks. |
| `nginx/default.conf` | nginx config: listens on 8080, `/healthz` for Kubernetes, caching, gzip, redirects, 404 page. |
| `nginx/redirects.conf` | 301 redirects for nginx. Generated; don't edit by hand. |
| `conversion/` | How the static site was first made from the WordPress backup; see `conversion/README.md`. |
| `Dockerfile` | Node stage runs `tools/build-site.py` (Stencil build + every check), then `nginx-unprivileged` (runs as a normal user) serves `dist/`. |
| `.github/workflows/build-image.yml` | Builds and pushes `ghcr.io/tmuls/akimbocomics.com` (`latest` and `sha-<commit>`). |
| `.github/workflows/build-stage-image.yml` | Run by hand: builds the `stage` branch into `ghcr.io/tmuls/akimbocomics.com:stage`. |

Comments, search and RSS feeds were WordPress features and don't exist here;
existing comments are preserved on each post.

## Old links (url-map.csv)

`url-map.csv` has one row per old URL: `old_url,new_url,kind,wp_id,title`.
It covers the original site's links (`/?p=123`, `/?page_id=2`, `/?cat=6`,
`/?tag=…`, `/?author=…`, `/?m=200910`, `/?paged=2`, `/?attachment_id=…`,
`/comic/<file>`, the `/comics-rss|archive|mini/` thumbnails,
`/wp-content/uploads/…`, `/eo/…`) and the paths of the first static export
(git tag `initial-export`, e.g. `/2010/10/04/eat-shit-and-die-164/`).

`tools/build-redirects.py` turns it into:

- `nginx/redirects.conf`: 301 redirects in the Docker image.
- `dist/redirects.js` + `dist/404.html`: the same for page URLs
  on static hosts without nginx (GitHub Pages).

## Making changes

Edit post/page content in `content/` (pages are generated from it; the
conversion isn't re-run), and images and other static files in `site/`.
`python3 tools/build-site.py` (or `docker compose up -d --build`) rebuilds
and checks everything. If a page or image moves:

1. `python3 tools/move-url.py OLD NEW` (or `--prefix /old/ /new/` for a
   folder): repoints existing rows and adds `OLD → NEW` in `url-map.csv`.
2. `python3 tools/build-site.py`: rebuilds `dist/` and `nginx/redirects.conf`;
   fails if any `new_url` is missing or any URL ever served would break.
3. `python3 tools/check-known-urls.py --update` to protect new pages too.
4. Commit everything together; CI re-checks it, and `main` builds a new image.
