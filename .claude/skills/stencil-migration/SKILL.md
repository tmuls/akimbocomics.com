---
name: stencil-migration
description: Plan, decisions and progress log for turning akimbocomics.com's ~850 duplicated WordPress-theme HTML pages into a Stencil app with shared CSS and components that prerenders the same static site. Use when working on templatizing, Stencil, components, shared CSS, extracting post/comic content into data, or changing how site/ is built. Read the progress log first and update it before ending a session.
---

# Stencil migration

## Goal

`site/` is ~850 static pages crawled from WordPress (ComicPress theme). Every
page repeats the same ~10KB of theme markup (header, menu bar, sidebar,
footer) around its unique content. Replace that with:

- **content as data**: one record per post/page (title, date, series, slug,
  comic image, body HTML, tags, author, existing comments), images staying
  as files beside each post,
- **a Stencil app** with shared components and **one common CSS file**,
- **prerendered static HTML** at build time, so every page still works
  without JavaScript, stays crawlable, and is served by the same nginx image.

## Hard constraints

1. **Never break an old link.** Follow the `preserve-old-links` skill for
   every change. Generate pages at the **current paths**
   (`/<series>/<slug>/index.html`, `/<series>/`, `/<series>/page/N/`,
   `/page/N/`, `/about/`, `/tag/<t>/`, `/author/<a>/`, `/emulsifier-online/`,
   `/unpublished/`) so no redirects change. Anything that must move goes
   through `tools/move-url.py`.
2. Before the generated output replaces `site/`, it must pass
   `python3 tools/check-known-urls.py --site <output dir>` and
   `tools/check-redirects.py` against the nginx image built from it.
3. Old theme assets (`/wp-content/themes/comicpress-master/style.css`,
   `/wp-includes/js/...`, theme images) are known URLs: keep serving them,
   or redirect each to its replacement via url-map.csv.
4. Keep the visible design (it should look like the old site), the header
   image, prev/next/first/last comic navigation, series listings with
   paging, and existing comments (read-only; no comment form).
5. No secrets or commenter emails in the repo (it's public).
6. Do it on a branch; merge to `main` only with CI (`check-links.yml`) green.
   Preview it first on stage.akimbocomics.com (see `preserve-old-links`,
   "Previewing on stage"): it's the only place to see the real site
   running on the Pi before it replaces production.

## Page anatomy (from the current HTML)

Every page: `page-wrap > page > header` (logo/header image) →
`menubar-wrapper` (`menunav` prev/next arrows, `menu` with About) →
`content-wrapper > subcontent-wrapper` → main column + `sidebar-right`
(widgets: **Latest Comics** list, **Categories** list) → `footer`.

Main column varies by page type:

| Page type | Paths | Main column |
|---|---|---|
| Comic post | `/<series>/<slug>/` | `comic` (image in `comicpane`), `nav` first/previous/next/last, post (title, `storyline-cats`, entry, tags), `commentlist` |
| News post | `/news/<slug>/` | `blognav`, post (title, category, entry, tags), comments |
| Home | `/`, `/page/N/` | latest comic as above + `blogindex` of recent news posts |
| Series listing | `/<series>/`, `/<series>/page/N/` | `page-title`, `archiveresults` (one entry per post), `wp-paginav` |
| Tag / author listing | `/tag/<t>/`, `/author/<a>/` | same as series listing |
| About | `/about/` | single page |
| Emulsifier Online | `/emulsifier-online/` | list of 34 images |

Candidate components: `site-shell` (header, menu bar, sidebar, footer),
`latest-comics`, `category-list`, `comic-viewer`, `comic-nav`,
`post-body`, `comment-list`, `post-list` + `pager`.

## Suggested milestones

0. **Spike**: confirm Stencil's static prerendering (www output target,
   `stencil build --prerender`) can emit plain HTML at arbitrary nested
   paths like `/eatshitanddie/eat-shit-die-309/index.html`, copy images
   beside them, and produce pages that render fully with JS disabled. If it
   can't do this cleanly, stop and discuss alternatives with the user before
   building on it.
1. **Extract content** (done 2026-10-18): script that parses `site/**/index.html` into data
   (e.g. `content/<series>/<slug>.json`), including comments and image
   names. Commit the data; verify round-trip counts (618 posts, 1 page,
   all comments, all images).
2. **Shared CSS**: consolidate `comicpress-master/style.css` + inline styles
   into one stylesheet; keep the old CSS URL working.
3. **Components + page templates** for each page type above.
4. **Build pipeline**: Stencil build → output folder → `build-redirects.py`
   → Dockerfile becomes multi-stage (node build, then nginx).
5. **Verify** with the hard-constraint checks, compare rendered pages with
   the current ones (screenshots / text diff), then swap `site/` for the
   generated output.

## Decisions

- 2026-10-18: Stencil chosen by the user. Output must be prerendered static
  HTML at the current paths.
- 2026-10-18 (spike): The Stencil app lives in `stencil/` (branch `stencil`),
  `@stencil/core` pinned to an exact version (4.45.1). Its output is
  `stencil/www/` (gitignored) until it replaces `site/` in milestone 4.
- 2026-10-18 (spike): Prerendering = `www` output target +
  `prerender.config.ts` with `staticSite: true` (no JS shipped),
  `crawlUrls: false` and an explicit `entryUrls` list built from the content
  data, `trailingSlash: true`. One router component (`akimbo-app`) picks the
  page from `location.pathname`.
- 2026-10-18 (spike): Components use `shadow: false`, and `afterHydrate`
  unwraps their host elements, so every page is the old ComicPress markup
  (same ids/classes, no custom elements). The old CSS applies unchanged.
  One component per file (Stencil requires it); markup shared inside a page
  (`PostBody`, `ComicImage`, `ComicNav`) is functional components.
- 2026-10-18 (spike): Generated pages use root-relative folder links
  (`/eatshitanddie/eat-shit-die-309/`) instead of the export's relative
  `../../x/index.html`. Both forms stay served; only in-page hrefs change.
- 2026-10-18 (spike): One stylesheet at `/css/akimbo.css`, copied as a plain
  file (not Stencil's `globalStyle`) and linked, not inlined
  (`inlineExternalStyleSheets: false`, `hashAssets: null`). Images and theme
  images keep their current URLs (www `copy` tasks).
- 2026-10-18 (spike): Generated pages ship no JavaScript at all. The dead
  third-party scripts (jQuery, Facebook like box, Project Wonderful, old
  Google Analytics, ComicPress menu/scroll JS) and non-content text (plain
  "RSS"/"Subscribe: RSS" with no feed behind it, WordPress "N queries" debug
  line, hidden "Cancel reply") are dropped. The old JS/CSS files stay served
  for their known URLs. Ask the user before adding any script back.
- 2026-10-18 (milestone 1): Content lives in `content/` at the repo root,
  one pretty-printed JSON file per record so diffs stay readable:
  `content/<series>/<slug>.json` (posts), `content/pages/about.json`,
  `content/listings/<path>.json` (category/tag/author listings with all
  their `page/N/` entries merged), `content/home.json`, `content/site.json`
  (title, menu, sidebar widgets), `content/emulsifier-online.json`.
  `stencil/scripts/extract-content.py` wrote it (stdlib only, via the small
  `htmltree.py` parser) and `--check` re-extracts and fails if it's stale.
  `stencil/scripts/bundle-content.mjs` gathers it into the gitignored
  `src/data/content.json` at build time; components import that through
  `src/data/content.ts`.
- 2026-10-18 (milestone 1): Entry, comment and profile HTML is kept byte for
  byte as WordPress wrote it, except href/src/srcset made root-relative and
  the Facebook like box dropped. A post's comic images are
  `images: [{src, alt, title}]`, `src` a URL relative to the post's folder
  (just the file name; root-relative for the 2 posts reusing another
  post's image). Comments and pingbacks are separate lists (the theme shows
  pingbacks under "Pings & Trackbacks"); `commentCount` is the
  "Discussion (N)" number (null when there was no heading). Each page's
  `<title>`, body class, og: meta and post class are kept in `head` /
  `postClass` for parity work. Commenters' microid hashes are not kept.
- 2026-10-18: Changes are previewed on stage.akimbocomics.com (the `stage`
  branch, built by hand with the "Build stage image" workflow) before
  merging to `main`.

## Progress log

Newest first. Each session: add a dated entry (what was done, what's next,
anything surprising), and update Decisions when something is settled.

- 2026-10-18: **Milestone 1 (extract content) done.** `content/` (668 JSON
  files, 3.5 MB) holds every page of `site/`; `extract-content.py` replaced
  the spike's regex prototype and verifies on every run: 618 posts (587
  comic, 31 news), 1 page, all 1893 comment/pingback ids in `site/` exactly
  once (each post's "Discussion (N)" matches), all 601 image files in post
  folders named by their post, 34 emulsifier-online images, 46 listings
  (every entry is a known post with the same title, totals match "N
  results"), 7 home pages (no home excerpts: blog index shows full bodies),
  one identical sidebar and menu on every page. The spike build reads the
  new data and still passes `npm run verify` (41 pages); its output is
  unchanged except comment authors without a website, which the spike
  wrongly linked to the post itself.
  - Surprises: 12 posts have two comic panes (`comic-1`, `comic-2`); 2
    posts reuse another post's image (e.g. `/comics/bonus-1/`); 2 posts
    (`eat-shit-and-die-164`, `-202`) have paged comments at
    `/comment-page-1/`, `/comment-page-2/` (post URL shows the last page;
    each comment has `page`); pingbacks sit in their own "Pings &
    Trackbacks" list and a post with only pingbacks has no "Discussion"
    heading; "Discussion" without a number means 1. Author pages aren't
    plain listings: avatar, "Registered on ..." bio, then "Posts by X (N)"
    (kept as `profile` + `heading`). Every comment is closed: 621 pages
    show the login-only box saying "Comments are closed.", 2 news posts the
    plain `nocomments` line (`commentsOpen` distinguishes them). The home
    page's nav "Previous" goes to `/comics/xxxxafadionv90239u/`, the
    newest post, not the newest comic's previous. No threaded comments.
  - `www/build/*.js` now embeds all the data (~1.9 MB) though pages load
    none of it; decide in milestone 4 whether to strip `build/`.
  - Next: milestone 2 (shared CSS), then milestone 3 renders every post,
    page, listing, comment page, tag/author page and home `/page/N/` from
    `content/` (`render` in `bundle-content.mjs` still lists only the
    spike's pages). Until `site/` is replaced, run
    `npm run extract -- --check` after any `site/` edit (or re-extract).

- 2026-10-18: **Milestone 0 (spike) done: Stencil works for this.** On
  branch `stencil`, `stencil/` prerenders 41 pages: `/`, three posts
  (`eat-shit-die-309` newest/no next, `-308`, `eat-shit-and-die-101` with 5
  comments and full first/prev/next/last), `/eatshitanddie/` plus all 31
  `page/N/`, and the 5 news posts on the home page. Output is
  `www/<path>/index.html` with each comic image beside it, no `<script>`,
  no custom elements. `npm run verify` checks every page is at a path in
  `known-urls.txt`, has no scripts, and every local href/src resolves (in
  www/ or ../site/). Compared with the current pages in a browser: element
  positions match to the pixel except the footer (32px shorter, debug line
  gone) and post entries (18px shorter, empty Facebook like box gone); a
  word diff shows only the dropped non-content text listed under Decisions.
  Prerendering takes ~15 ms/page, so the full ~850 pages is ~15 s.
  - Worked: `staticSite`, explicit `entryUrls`, `afterHydrate` DOM edits,
    www `copy` tasks for images at arbitrary nested paths, JSON import of
    content data into components.
  - Gotchas: Stencil rejects more than one `@Component` per module; mock-doc
    (prerender DOM) has no `replaceWith` (use insertBefore/removeChild);
    `hashAssets` defaults on and appends `?v=hash` to img/CSS URLs; after
    adding a `@Prop` the first build can fail on a stale
    `src/components.d.ts` (rebuild); `www/build/*.js`, `host.config.json`,
    `robots.txt` and `sitemap.xml` are still emitted though no page uses
    the JS (strip or keep deliberately in milestone 4).
  - Old-site quirks to keep in mind: the home page's `<title>` ends in a
    dangling " - " (the spike drops it); others are
    `<site title> - <post/series title>`, which the spike reproduces.
    Comic nav "First" points at the newest comic (ComicPress quirk),
    preserved as data. Home shows 6 posts: the latest comic + 5 news.
    Posts with comments switched off show "Comments are closed." with no
    comment box and no home "Comment" link (`commentsOpen` in the data).
  - Not done yet: og:/canonical meta parity (canonical is now the absolute
    URL), body classes beyond `layout-2cvr`, home `/page/N/`, tag/author/
    about/emulsifier-online pages, the old theme CSS URL (milestone 2).
    `scripts/spike-extract.py` is a throwaway regex prototype covering only
    these pages.
  - Next: milestone 1, a real extractor for all 618 posts + page into
    committed `content/` data (comments, image names, tags, nav,
    commentsOpen), with round-trip count checks; then build every page
    from it and run `check-known-urls.py --site stencil/www`.

- 2026-10-18: Skill created. Link-preservation tooling and CI in place
  (`check-known-urls.py`, `move-url.py`, `check-links.yml`). No Stencil work
  started yet. Next: milestone 0 (spike).
