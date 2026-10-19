# stencil/: Stencil app for akimbocomics.com (work in progress)

Prerenders the site as plain static HTML at its current URLs. See
`.claude/skills/stencil-migration/SKILL.md` for the plan, decisions and log.
Nothing here is served yet: production still serves `../site/`.

```
npm ci
npm run build     # bundle ../content into src/data, then stencil build --prerender -> www/
npm run verify    # pages at known URLs, no <script>, every local link resolves
```

Preview: `python3 -m http.server 8091 -d www`, then compare with
`python3 -m http.server 8090 -d ../site`.

Milestone 0 (spike) renders the home page, three Eat Shit and Die posts,
the series listing with all its pages, and the five news posts on the home
page. Other links point at pages only `../site/` has for now.

- `../content/`: the site's content as committed data, one JSON file per
  post (`<series>/<slug>.json`), page, listing, plus `home.json`/`site.json`.
- `scripts/extract-content.py`: wrote `../content/` from `../site/` and
  checks the round-trip totals (`npm run extract`, or `-- --check` to
  confirm the data still matches `../site/`). One-time: once generated
  pages replace `../site/`, `../content/` is edited directly.
- `scripts/bundle-content.mjs`: gathers `../content/` into
  `src/data/content.json` (gitignored) for the components and configs, and
  picks which URLs to prerender.
- `src/components/akimbo-app`: the router (one component per path).
- `src/components/site-shell`: header image, menu bar, sidebar, footer.
- `src/css/akimbo.css`: the one shared stylesheet, served at `/css/akimbo.css`.
- `prerender.config.ts`: which URLs to render, `staticSite` (no JS), and
  the hook that unwraps component tags so output is the old theme's markup.
