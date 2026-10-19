# stencil/: Stencil app for akimbocomics.com (work in progress)

Prerenders the site as plain static HTML at its current URLs. See
`.claude/skills/stencil-migration/SKILL.md` for the plan, decisions and log.
Nothing here is served yet: production still serves `../site/`.

```
npm ci
npm run build     # bundle ../content into src/data, then stencil build --prerender -> www/
npm run verify    # pages at known URLs, no <script>, links resolve; same text/links as ../site
```

Preview: `python3 -m http.server 8091 -d www`, then compare with
`python3 -m http.server 8090 -d ../site` (both are in `../.claude/launch.json`).
`www/` has every page (846) and every image beside a post, but not yet the
site-wide static files (`wp-content/`, `wp-includes/`, `unpublished/`,
`404.html`, `redirects.js`), so images in the About page don't show locally;
milestone 4 copies those in.

- `../content/`: the site's content as committed data, one JSON file per
  post (`<series>/<slug>.json`), page, listing, plus `home.json`/`site.json`.
- `scripts/extract-content.py`: wrote `../content/` from `../site/` and
  checks the round-trip totals (`npm run extract`, or `-- --check` to
  confirm the data still matches `../site/`). One-time: once generated
  pages replace `../site/`, `../content/` is edited directly.
- `scripts/bundle-content.mjs`: gathers `../content/` into
  `src/data/content.json` (gitignored) for the components and configs, and
  lists every URL to prerender.
- `scripts/verify.mjs`: structural checks on `www/` (see its header).
- `scripts/compare-pages.py`: compares each page's visible text and every
  link/image URL with the page in `../site/` it replaces (`-v PATH` shows
  the diff); allows only the non-content text dropped on purpose.
- `scripts/css-usage.mjs`: lists rules in `akimbo.css` that match nothing
  on any page (`--write` drops them).
- `src/components/akimbo-app`: the router: picks the page component per path
  (home, comic/news post and its comment pages, About, series/tag/author
  listing, emulsifier-online).
- `src/components/site-shell`: header image, menu bar, sidebar, footer.
- `src/css/akimbo.css`: the one shared stylesheet, served at `/css/akimbo.css`.
- `prerender.config.ts`: which URLs to render, `staticSite` (no JS), and
  the hook that unwraps component tags so output is the old theme's markup.
