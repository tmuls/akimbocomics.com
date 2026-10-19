# stencil/: Stencil app for akimbocomics.com (work in progress)

Prerenders the site as plain static HTML at its current URLs. See
`.claude/skills/stencil-migration/SKILL.md` for the plan, decisions and log.
This is what's served: `../tools/build-site.py` builds it into `../dist/`
with `../site/`'s static files, and the Dockerfile serves that.

```
npm ci
npm run build     # bundle ../content into src/data, then stencil build --prerender -> www/
npm run verify    # pages at known URLs, no <script>, links resolve; same text/links as ../site
```

Preview the whole site: `python3 ../tools/build-site.py`, then
`python3 -m http.server 8091 -d ../dist` (in `../.claude/launch.json`), or
`docker compose up -d --build` from the repo root for the real nginx.

- `../content/`: the site's content as committed data, one JSON file per
  post (`<series>/<slug>.json`), page, listing, plus `home.json`/`site.json`.
- `scripts/extract-content.py`: wrote `../content/` once from the exported
  WordPress pages (now at the git tag `exported-pages`); `../content/` is
  edited directly since.
- `scripts/bundle-content.mjs`: gathers `../content/` into
  `src/data/content.json` (gitignored) for the components and configs, and
  lists every URL to prerender.
- `scripts/verify.mjs`: structural checks on `www/` (see its header).
- `scripts/compare-pages.py --site DIR`: compares each page's visible text
  and every link/image URL with the same page in another copy of the site
  (the `exported-pages` tag, or an older build) to check a change alters
  nothing a reader sees.
- `scripts/css-usage.mjs`: lists rules in `akimbo.css` that match nothing
  on any page (`--write` drops them).
- `src/components/akimbo-app`: the router: picks the page component per path
  (home, comic/news post and its comment pages, About, series/tag/author
  listing, emulsifier-online).
- `src/components/site-shell`: header image, menu bar, sidebar, footer.
- `src/css/akimbo.css`: the one shared stylesheet, served at `/css/akimbo.css`.
- `prerender.config.ts`: which URLs to render, `staticSite` (no JS), and
  the hook that unwraps component tags so output is the old theme's markup.
