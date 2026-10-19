---
name: stencil-migration
description: Plan, decisions and progress log for turning akimbocomics.com's ~850 duplicated WordPress-theme HTML pages into a Stencil app with shared CSS and components that prerenders the same static site. Use when working on templatizing, Stencil, components, shared CSS, extracting post/comic content into data, or changing how site/ is built. Read the progress log first and update it before ending a session.
---

# Stencil migration

**Status (2026-10-18): all five milestones done and merged to `main`.**
Everything the site is made of is in `site/`: `site/content/` (a folder
per page mirroring its URL: post.json + its images), `site/stencil/` (the
app), `site/static/` (files served as they are). `tools/build-site.py`
builds the served `dist/`. Log entries before 2026-10-18 "site/ folder"
use the older paths (`content/`, `stencil/`, images in `site/<series>/`).
Optimising, on branches: (a) content holds only data (done), (b) the
repo layout above (done), (c) next: simplify the template HTML/CSS. Goal: looks roughly the same (not
pixel-exact), every old link still works.

## Goal

`site/` was ~850 static pages crawled from WordPress (ComicPress theme). Every
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
   (`/<series>/<slug>/index.html`, `/<series>/`,
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
   image, prev/next/first/last comic navigation (within the comic's
   series), one unpaginated listing per series, and existing comments (read-only; no comment form).
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
| Comic post | `/<series>/<slug>/` | `comic` (image in `comicpane`), `nav` first/previous/next/last within the series, post (title, `storyline-cats`, entry, tags), `commentlist` |
| News post | `/news/<slug>/` | `blognav`, post (title, category, entry, tags), comments |
| Home | `/`, `/page/N/` | latest comic as above + `blogindex` of recent news posts |
| Series listing | `/<series>/` | `page-title`, `archiveresults`, one `archive-table` row per post (all of them, no paging) |
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
2. **Shared CSS** (done 2026-10-18): consolidate `comicpress-master/style.css` + inline styles
   into one stylesheet; keep the old CSS URL working.
3. **Components + page templates** for each page type above (done
   2026-10-18).
4. **Build pipeline** (done 2026-10-18): Stencil build → output folder → `build-redirects.py`
   → Dockerfile becomes multi-stage (node build, then nginx).
5. **Verify** (done 2026-10-18) with the hard-constraint checks, compare rendered pages with
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
- 2026-10-18 (site/ folder): All site source lives under `site/`. Each
  post's folder `site/content/<series>/<slug>/` holds its `post.json` and
  its images together; the Stencil config copies every non-JSON file in
  `site/content/` to the same path in the output, so images keep their
  URLs. Pages: `site/content/<slug>/page.json`; gallery:
  `site/content/emulsifier-online/gallery.json`. Served-as-is files:
  `site/static/`. The build output `dist/` stays at the repo root
  (gitignored), next to `tools/`, `nginx/`, `url-map.csv`,
  `known-urls.txt`.
- 2026-10-18 (content slimming, supersedes the two milestone-1 schema
  entries below): `content/` holds only data; its schema is in
  `content/README.md`. A post stores title, author, ISO date, optional
  categories (when not just its folder), tags, image files, hoverText,
  body, comments (id, author, ISO date, url, gravatar hash, text) and
  pingbacks. No URLs (the file path is the URL), no theme classes, no
  formatted dates, no nav, no listings, no home pages: `bundle-content.mjs`
  derives those (comic nav = neighbouring comics by date in the same series,
  First/Last = the series' oldest/newest, only where there is a
  previous/next; superseded the original "First/Last = newest comic"; blog nav = neighbours in the same blog category; listings
  newest first, a category also listing its `parent`-children; home = the
  newest comic + blog index 5 per page; 50 comments+pingbacks per comment
  page), and the components format dates and add the theme markup.
  Comments are all shown as closed one way. Avatars use
  https://secure.gravatar.com from the hash. `extract-content.py` (old
  schema) is gone; `compare-pages.py --site <exported-pages checkout>`
  remains for checking pages against the original.
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
- 2026-10-18 (milestone 2): `/css/akimbo.css` is the theme's style.css +
  navstyle.css + the inline `#header` rules, minus every rule that matches
  nothing on any generated page (`scripts/css-usage.mjs --write`, 308 → 112
  rules, 27 KB → 8.5 KB); the ComicPress GPL header stays. The old
  stylesheet URLs (`style.css`, `navstyle.css@ver=4.7.29.css`) keep being
  served unchanged as plain files (not redirected): old copies of pages
  and scrapers may still load them. Only `layout-2cvr` among body classes
  is styled, so generated pages don't reproduce WordPress's per-page body
  classes.
- 2026-10-18 (milestone 3): Done = `npm run verify` green: every page in
  the data is generated at a known URL, and `scripts/compare-pages.py`
  finds the same visible text and the same link/image URLs (old relative
  links resolved) as the `site/` page, allowing only the dropped
  non-content text (menu-bar "RSS", "| Subscribe: RSS", "[ Comments RSS ]",
  the "N queries" footer line, hidden "Cancel reply", the Facebook like
  box) and "Back to Top" pointing at `#page-head` (the old `#outside`
  anchor didn't exist). Element positions, sizes, fonts and colours were
  compared in a browser on 11 page types: identical except the footer
  (32px shorter) and post entries (18px shorter), as in the spike.
- 2026-10-18 (milestone 4): The served folder is `dist/` (gitignored),
  built by `tools/build-site.py`: Stencil build + `npm run verify`, then
  every non-`index.html` file of `site/` (except its generated
  `redirects.js`/`404.html`), then `stencil/www/` on top minus Stencil's
  unused `build/`, `robots.txt`, `sitemap.xml`, `host.config.json`, then
  `build-redirects.py --site dist` (redirects.js, 404.html, the home page's
  `?query` loader script; nginx/redirects.conf is unchanged) and
  `check-known-urls.py --site dist`. The Dockerfile's Node stage
  (`--platform=$BUILDPLATFORM`, so arm64 images don't build under QEMU)
  runs it; nginx serves `dist/`. Only the home page carries a script (the
  redirect loader for static hosts), as before.
- 2026-10-18 (milestone 4): `/css/akimbo.css` is served but not yet in
  `known-urls.txt`: adding it now would fail the plain `site/` check.
  Run `check-known-urls.py --site dist --update` in milestone 5.
- 2026-10-18: Changes are previewed on stage.akimbocomics.com (the `stage`
  branch, built by hand with the "Build stage image" workflow) before
  merging to `main`.

## Progress log

Newest first. Each session: add a dated entry (what was done, what's next,
anything surprising), and update Decisions when something is settled.

- 2026-10-18: **Series-only comic nav, unpaginated series listings (user's
  request, branch `series-nav`).** `bundle-content.mjs`: comic
  previous/next stay inside the comic's series (folder); First/Last are
  that series' oldest/newest and appear only with a previous/next; a
  one-comic series gets no nav at all (`ComicNav` renders nothing, the
  menubar arrows are already hidden). The home page's comic follows. Every
  category listing (`/<series>/`, incl. `/comics/` and `/news/`) renders
  all its posts on one page; tag and author listings stay paged. The 107
  `/<series>/page/N/` pages (214 URLs with the `index.html` forms) 301 to
  `/<series>/` (`move-url.py --kind merged`). 739 pages rendered (was 846);
  known-URL check 6321 OK; Docker redirect test 4191/0.

- 2026-10-18: Footer changed (user's request): "© 2000–<build year> Akimbo
  Comics | Back to Top ↑"; the "Powered by WordPress with ComicPress"
  credit is gone (the site no longer runs on them).

- 2026-10-18: **Retired `wp-content/` and `wp-includes/` (branch
  `retire-wp-content`).** About comic (`about2.gif` + srcset thumbnail) →
  `site/content/about/` (`/about/about2.gif`); header →
  `site/static/images/header.jpg` (`/images/header.jpg`, akimbo.css
  updated); old `style.css` and `navstyle.css@ver=4.7.29.css` redirect to
  `/css/akimbo.css` (kind `merged`); unused theme icons and dead JS →
  `site/static/legacy/comicpress/` and `legacy/wordpress/` (version
  suffixes dropped). All via `move-url.py` (16 rows added, 7 repointed);
  the 14 new paths added to known-urls.txt. Docker redirect test 3977/0.

- 2026-10-18: **Folded `/unpublished/` into published copies (branch
  `fold-unpublished`).** All 14 files duplicated published comics: 9
  byte-identical, ESD 275 x2 the same pixels re-encoded, About_1.jpg the
  About comic (about2.gif), the two "Curious_Urgency_70" files a blurry
  upscale of ESD 247 (mislabelled), and Fan_Art_1.JPG a 1280px original of
  the 400px fan art. The 1280px file now sits at the fan art's own URL
  (`/fan-art/fan-art/2001-05-14_Fan_Art_2.jpg`; the post still shows it at
  400px and links to it). `tools/move-url.py --kind duplicate` repointed
  the 56 `/comic/`, `/comics-rss|archive|mini/` rows and added a row for
  each `/unpublished/` path; `site/static/unpublished/` is gone. Docker
  redirect test 3961/0.

- 2026-10-18: **Moved everything into `site/` (branch `site-folder`).**
  `git mv` only (history follows): post JSON + images now share a folder,
  stencil/ → site/stencil/, wp-content/wp-includes/unpublished →
  site/static/. Paths updated in bundle-content.mjs, stencil.config.ts,
  verify.mjs, build-site.py, Dockerfile, .dockerignore, CI, the stage
  workflow (robots.txt now goes to site/static/) and the docs. `dist/` is
  byte-identical to main's; Docker redirect test 3947/0.
  - Next: template HTML/CSS simplification.

- 2026-10-18: **Merged to main (806c200); content slimmed on branch
  `slim-content`.** `content/` went from 668 files / 59k lines / 3.6 MB to
  621 files / 20k lines / 2.8 MB (listings and home.json are derived now).
  Checks: verify.mjs and the known-URL check pass, Docker redirect test
  3947/0, and compared with the exported pages 18 of 846 differ, all
  expected: 3 pairs of posts with identical timestamps now get proper
  previous/next (WordPress's nav skipped one of each pair) and sort by
  path in listings; https gravatars; "I'm sure I don't know" loses its
  curly apostrophes in its listing heading; the 2 news posts with the
  other closed-comments variant now look like the rest (and get a home
  "Comment" link). Fixed a milestone-1 extraction bug: a body link written
  `href=" https:/www..."` (browsers read it as https://www...) had been
  made relative; it now points at the real URL.
  - Next: merge `slim-content` once CI is green, then the template phase:
    trim component markup (wrapper divs, empty -head/-foot divs, unused
    classes) together with akimbo.css so pages look roughly the same;
    check with compare-pages.py (text/links) and a browser.

- 2026-10-18: **Milestone 5 (swap) done.** Removed the 846 exported
  `index.html` pages and the committed `redirects.js`/`404.html` from
  `site/` (now 665 static files); tagged the last commit that had them
  `exported-pages`. `dist/` rebuilt afterwards is byte-identical to the
  one built before the removal (1514 files). `build-redirects.py` and
  `check-known-urls.py` now default to `dist/` (and say to run
  `build-site.py` if it's missing); CI sets up Node, runs `build-site.py`,
  checks `nginx/redirects.conf` is committed, then the Docker redirect
  test. `/css/akimbo.css` added to `known-urls.txt`. `compare-pages.py`
  now needs `--site` (e.g. a worktree of `exported-pages`: still 0 of 846
  differ) and is no longer part of `npm run verify`; `extract-content.py`
  takes `--site` too. Docs (CLAUDE.md, README, both skills,
  stencil/README) say content lives in `content/`.
  - Stage already showed this output (M4 build; M5 changes nothing
    served): all 3947 old URLs passed `check-redirects.py` against
    https://stage.akimbocomics.com.
  - Next: merge `stencil` into `main` once CI is green (the user decides),
    then `kubectl -n akimbocomics rollout restart deploy/akimbocomics`.
    Later, optional: og:/canonical meta parity, stop Stencil emitting the
    unused `www/build/*.js`.

- 2026-10-18: **Milestone 4 (build pipeline) done.** `docker build` now
  builds the site from `content/` in ~30 s (npm ci, Stencil, verify,
  compare with `site/`, assemble `dist/`, known-URL check) and nginx serves
  it. Against the built image `check-redirects.py` passes (3947 old URLs),
  pages and `/css/akimbo.css` are 200, the old theme CSS still 200, unknown
  paths 404 with the redirect-trying 404 page. CI's redirect test builds
  the same image, so it now covers the whole pipeline. CLAUDE.md, README
  and preserve-old-links now say pages come from `content/`. Pushed to
  `stage` for a preview.
  - Next: milestone 5: look at stage, then remove the old exported
    `index.html` pages from `site/` (keeping its static files), drop
    `compare-pages.py` from the build (or keep it against a frozen copy),
    move the `site/` known-URL check and committed redirect files to
    `dist/`, add `/css/akimbo.css` to known-urls, merge to main.

- 2026-10-18: **Milestones 2 (shared CSS) and 3 (every page) done.** The
  build renders all 846 pages of `site/` from `content/` (7 home pages,
  618 posts + 4 comment pages, About, 23 series listings with their pages,
  21 tags, 2 authors, emulsifier-online) in ~7 s, copies every file beside
  each post, and `npm run verify` passes: structural checks plus
  `compare-pages.py` (0 of 846 pages differ in text or links). CSS trimmed
  to the rules the pages use (see Decisions). Did M3 rendering before the
  CSS trim so the trim could be checked against real pages.
  - New components: `wp-page` (About), `author-list` (profile + "Posts by
    X (N)" table), `emulsifier-gallery` (bare page; `afterHydrate` strips
    the stylesheet and body class when the body has `data-bare`).
    `comment-list` handles pingbacks ("Pings & Trackbacks"), paged
    comments and the two closed-comments variants; `PostBody` takes
    `blog` (the home blog index lays every post out blog-style, even
    comics) and the home "Comment"/"N Comments" link text.
  - Found while comparing: pingbacks are paged with the comments (now
    each has `page`); posts in two categories show "Comics » Eat Shit and
    Die" (root li + plain li); "1 result." is singular; the About menu
    item has `current_page_item`; home's comic also has a comment link.
    `extract-content.py` was updated and `content/` re-extracted for these.
  - `check-known-urls.py --site stencil/www` still fails only on site-wide
    static files `www/` doesn't contain yet (`wp-content/`, `wp-includes/`,
    `unpublished/`, `404.html`, `redirects.js` and redirects pointing at
    them): milestone 4 copies every non-page file from `site/` (or its
    successor folder) into the output.
  - Not done: og:/canonical parity (canonical is absolute; no og: tags),
    `www/build/*.js` (1.9 MB, all the data) is still emitted though pages
    load none of it.
  - Next: milestone 4: Dockerfile multi-stage (node build → nginx), output
    = `www/` + `site/`'s static files + `build-redirects.py` output, then
    preview on stage.

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
