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
1. **Extract content**: script that parses `site/**/index.html` into data
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
- 2026-10-18: Changes are previewed on stage.akimbocomics.com (the `stage`
  branch, built by hand with the "Build stage image" workflow) before
  merging to `main`.

## Progress log

Newest first. Each session: add a dated entry (what was done, what's next,
anything surprising), and update Decisions when something is settled.

- 2026-10-18: Skill created. Link-preservation tooling and CI in place
  (`check-known-urls.py`, `move-url.py`, `check-links.yml`). No Stencil work
  started yet. Next: milestone 0 (spike).
