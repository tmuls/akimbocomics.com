#!/usr/bin/env python3
"""Milestone 1: extract every page of ../site/ into committed data (../content/).

    python3 stencil/scripts/extract-content.py           # (re)write content/
    python3 stencil/scripts/extract-content.py --check   # fail if content/ is stale

Reads each site/**/index.html exported from WordPress (ComicPress theme) and
writes:

  content/<series>/<slug>.json   one per post (618): metadata, entry HTML,
                                 comic image, nav, comments
  content/pages/<slug>.json      the one WordPress page (/about/)
  content/listings/<path>.json   category (series), tag and author listings,
                                 all their /page/N/ pages merged
  content/home.json              the home page and its /page/N/ pages
  content/site.json              site title, menu and sidebar widgets
  content/emulsifier-online.json the hand-made image gallery page

Images stay where they are, as files beside each post's index.html; the data
only names them. Links inside extracted HTML are made root-relative
(../../x/index.html -> /x/) since the generated pages use folder URLs.

Every page is checked while extracting (each must be recognised, each post
must parse completely) and the totals are checked against the site at the
end: 618 posts, 1 page, every comment and pingback, every image file in a
post folder. Standard library only.

This ran once (milestone 1). Since milestone 5 the exported pages are gone
from site/ and content/ is the source of truth, edited directly; to re-run
it, point --site at a checkout of the tag `exported-pages`.
"""
import argparse
import html
import json
import posixpath
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from htmltree import parse  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
CONTENT = ROOT / "content"

EXPECTED = {"posts": 618, "pages": 1}
LISTING_PER_PAGE = 10  # entries per series/tag/author listing page
SITE_TITLE_SEP = " - "


class ExtractError(Exception):
    pass


def need(cond, page, what):
    if not cond:
        raise ExtractError(f"{page}: {what}")


# ---------------------------------------------------------------- links

def to_root(href, page):
    """A link as written in the export -> root-relative URL.

    `page` is the URL of the folder holding the page (/a/b/). Folder links
    (x/index.html) become /x/; files keep their name; absolute, protocol,
    mailto: and #fragment links are left alone.
    """
    if not href or re.match(r"^([a-z][a-z0-9+.-]*:|//|#|/)", href, re.I):
        return href
    frag = ""
    if "#" in href:
        href, frag = href.split("#", 1)
        frag = "#" + frag
    if not href:
        return page + frag
    url = posixpath.normpath(posixpath.join(page, href))
    if url == "/index.html" or url == "/.":
        url = "/"
    elif url.endswith("/index.html"):
        url = url[: -len("index.html")]
    elif not posixpath.splitext(url)[1] and not url.endswith("/"):
        url += "/"
    return url + frag


ATTR_RE = re.compile(r"""(\s(?:href|src))=(["'])(.*?)\2""", re.S | re.I)
SRCSET_RE = re.compile(r"""(\ssrcset)=(["'])(.*?)\2""", re.S | re.I)


def fix_links(fragment, page):
    """Rewrite href/src/srcset in an HTML fragment to root-relative URLs.

    Only the URL changes; quoting, entities and everything else stay as
    written, so the fragment is otherwise the original markup.
    """
    def one(m):
        url = html.unescape(m.group(3))
        new = to_root(url, page)
        if new == url:
            return m.group(0)
        return f"{m.group(1)}={m.group(2)}{html.escape(new, quote=False)}{m.group(2)}"

    def srcset(m):
        parts = []
        for cand in m.group(3).split(","):
            bits = cand.strip().split()
            if bits:
                bits[0] = html.escape(to_root(html.unescape(bits[0]), page), quote=False)
            parts.append(" ".join(bits))
        return f"{m.group(1)}={m.group(2)}{', '.join(parts)}{m.group(2)}"

    return SRCSET_RE.sub(srcset, ATTR_RE.sub(one, fragment))


def link(a, page):
    return {"title": a.text(), "href": to_root(a.get("href", ""), page)}


# ---------------------------------------------------------------- pages

def url_of(index_html):
    rel = index_html.parent.relative_to(SITE).as_posix()
    return "/" if rel == "." else f"/{rel}/"


def head_info(doc, page):
    title = doc.find("title")
    meta = {m.get("property"): m.get("content") for m in doc.find_all("meta") if m.get("property")}
    body = doc.find("body")
    info = {
        "title": title.text() if title else None,
        "bodyClass": body.get("class") if body else None,
    }
    for prop, key in (("og:title", "ogTitle"), ("og:description", "ogDescription"), ("og:image", "ogImage")):
        if prop in meta:
            info[key] = meta[prop]
    return info


def page_kind(doc):
    body = doc.find("body")
    classes = body.classes if body else []
    if "single" in classes:
        return "post"
    if "page" in classes and "page-template-default" in classes:
        return "page"
    if "home" in classes:
        return "home"
    for k in ("category", "tag", "author"):
        if k in classes and "archive" in classes:
            return k
    return None


def menu_nav(doc, page):
    nav = {}
    for kind, cls in (("previous", "menunav-prev"), ("next", "menunav-next")):
        div = doc.find("div", cls=cls)
        a = div and div.find("a")
        if a:
            nav[kind] = to_root(a.get("href"), page)
    return nav


def comic_nav(doc, page):
    nav = {}
    navdiv = doc.find("div", cls="nav")
    if navdiv:
        for kind in ("first", "previous", "next", "last"):
            div = navdiv.find("div", cls=f"nav-{kind}")
            a = div and div.find("a")
            if a:
                nav[kind] = to_root(a.get("href"), page)
    blognav = doc.find("div", cls="blognav")
    if blognav:
        for kind, cls in (("previous", "blognav-prev"), ("next", "blognav-next")):
            span = blognav.find("span", cls=cls)
            a = span and span.find("a")
            if a:
                nav[kind] = to_root(a.get("href"), page)
    return nav


def entry_html(entry, page):
    """Post body as WordPress wrote it, minus the dead Facebook like box and
    the theme's trailing clear div."""
    s = entry.inner_html()
    for fb in entry.find_all("span", cls="facebook-like"):
        s = s.replace(fb.outer_html(), "", 1)
    s = re.sub(r'\s*<div class="clear"></div>\s*$', "", s)
    return fix_links(s.strip(), page)


def post_record(div, page, url):
    """The post block (div.post-N): title, byline, cats, entry, tags."""
    need(div is not None, url, "no post block")
    pid = next((c[5:] for c in div.classes if re.fullmatch(r"post-\d+", c)), None)
    text = div.find("div", cls="post-text")
    need(text is not None, url, "no post-text")
    h2 = text.find("h2")
    author = text.find("span", cls="post-author")
    date = text.find("span", cls="post-date")
    time_ = text.find("span", cls="post-time")
    cats_el = text.find("ul", cls="storyline-cats") or text.find("div", cls="post-cat")
    entry = div.find("div", cls="entry")
    tags_el = div.find("div", cls="post-tags")
    rec = {
        "id": int(pid),
        "title": h2.text() if h2 else None,
        "author": author.find("a").text() if author and author.find("a") else None,
        "date": date.text() if date else None,
        "time": time_.text() if time_ else None,
    }
    if rec["date"] and rec["time"]:
        rec["datetime"] = datetime.strptime(f"{rec['date']} {rec['time']}", "%B %d, %Y %I:%M %p").isoformat()
    rec["categories"] = [link(a, page) for a in cats_el.find_all("a")] if cats_el else []
    rec["tags"] = [link(a, page) for a in tags_el.find_all("a")] if tags_el else []
    rec["html"] = entry_html(entry, page) if entry else ""
    rec["postClass"] = div.get("class")
    return rec


def comments_of(doc, page, url):
    wrapper = doc.find("div", id="comment-wrapper")
    # count: the "Discussion (N)" heading, None when there's no heading
    # (no comments, or only pingbacks).
    out = {"comments": [], "pingbacks": [], "count": None, "open": False, "pages": 1, "page": 1}
    if wrapper is None:
        return out
    h3 = wrapper.find("h3", id="comments")
    if h3:
        # ComicPress writes "Discussion (N)", or just "Discussion" for one.
        m = re.search(r"\((\d+)\)", h3.text())
        out["count"] = int(m.group(1)) if m else 1
    for li in wrapper.find_all("li"):
        if not (li.id or "").startswith("comment-"):
            continue
        kind = "pingback" if "pingback" in li.classes else "trackback" if "trackback" in li.classes else "comment"
        need(kind in ("comment", "pingback"), url, f"unknown comment type {li.classes}")
        cite = li.find("cite")
        a = cite.find("a") if cite else None
        avatar = li.find("div", cls="comment-avatar")
        img = avatar.find("img") if avatar else None
        ctime = li.find("span", cls="comment-time")
        ctext = li.find("div", cls="comment-text")
        c = {
            "id": int(li.id[len("comment-"):]),
            "author": cite.text() if cite else "",
            "url": to_root(a.get("href"), page) if a else None,
            "avatar": img.get("src") if img else None,
            "time": ctime.text() if ctime else None,
            "timeTitle": ctime.get("title") if ctime else None,
            "html": fix_links(ctext.inner_html().strip(), page) if ctext else "",
        }
        by = [k[len("comment-author-"):] for k in li.classes if k.startswith("comment-author-")]
        if by:
            c["byAuthor"] = by[0]  # styled as the comic's author
        need(li.find("ul", cls="children") is None, url, "threaded comments")
        out["pingbacks" if kind == "pingback" else "comments"].append(c)
    respond = wrapper.find("div", id="respond")
    out["open"] = respond is not None
    pag = wrapper.find("div", cls="commentnav") or next(
        (d for d in wrapper.find_all("ul") if d.find("li", cls="paginav-extend")), None)
    if pag:
        nums = [int(x.text()) for x in pag.find_all() if "page-numbers" in x.classes and x.text().isdigit()]
        cur = pag.find("li", cls="current") or next(x for x in pag.find_all() if "current" in x.classes)
        out["pages"], out["page"] = max(nums), int(cur.text())
    return out


def extract_post(doc, url, files):
    page = url
    series, slug = url.strip("/").split("/")
    rec = {"path": url, "series": series, "slug": slug}
    pane = doc.find("div", id="comic")
    panes = pane.find_all("div", cls="comicpane") if pane else []
    block = doc.find("div", cls="post")
    rec.update(post_record(block, page, url))
    rec["type"] = "comic" if panes else "news"
    # Usually one comic image; a few posts have two panes (comic-1, comic-2).
    rec["images"] = []
    for i, p in enumerate(panes, 1):
        need(p.id == f"comic-{i}", url, f"comic pane {p.id}")
        imgs = p.find_all("img")
        need(len(imgs) == 1, url, f"{len(imgs)} images in {p.id}")
        # `src` is a URL relative to the post's folder: just the file name
        # when the image sits beside index.html (nearly always), otherwise
        # root-relative (a few posts reuse another post's image).
        src = html.unescape(imgs[0].get("src"))
        if "/" in src:
            src = to_root(src, page)
            need((SITE / src.lstrip("/")).is_file(), url, f"comic image {src} missing")
        else:
            need(src in files, url, f"comic image {src} missing")
        rec["images"].append({"src": src, "alt": imgs[0].get("alt"), "title": imgs[0].get("title")})
    rec["nav"] = comic_nav(doc, page)
    rec["menuNav"] = menu_nav(doc, page)
    c = comments_of(doc, page, url)
    rec["commentCount"] = c["count"]
    rec["commentsOpen"] = c["open"]
    rec["commentPages"] = c["pages"]
    rec["comments"] = c["comments"]
    rec["pingbacks"] = c["pingbacks"]
    rec["head"] = head_info(doc, page)
    rec["_shownCommentPage"] = c["page"]
    return rec


def extract_comment_page(doc, url):
    """/series/slug/comment-page-N/: the same post with one page of comments."""
    post_url = url.rsplit("comment-page-", 1)[0]
    n = int(url.rstrip("/").rsplit("-", 1)[1])
    c = comments_of(doc, post_url, url)
    need(c["page"] == n, url, f"shows comment page {c['page']}")
    return post_url, n, c


def extract_page(doc, url):
    block = doc.find("div", cls="page")
    need(block is not None, url, "no page block")
    entry = block.find("div", cls="entry")
    title = block.find("h2", cls="page-title")
    pid = next(c[5:] for c in block.classes if re.fullmatch(r"post-\d+", c))
    c = comments_of(doc, url, url)
    need(c["pages"] == 1, url, "paged comments on a page")
    return {
        "path": url,
        "slug": url.strip("/"),
        "id": int(pid),
        "title": title.text(),
        "author": next((k[len("post-author-"):] for k in block.classes if k.startswith("post-author-")), None),
        "html": entry_html(entry, url),
        "postClass": block.get("class"),
        "menuNav": menu_nav(doc, url),
        "commentCount": c["count"],
        "commentsOpen": c["open"],
        "comments": c["comments"],
        "pingbacks": c["pingbacks"],
        "head": head_info(doc, url),
    }


def paginav(doc):
    """(page, of) from a listing's 'Page 1 of N' pager, or (1, 1)."""
    li = doc.find("li", cls="paginav-pages")
    if not li:
        return 1, 1
    m = re.fullmatch(r"Page (\d+) of (\d+)", li.text())
    return int(m.group(1)), int(m.group(2))


def extract_listing_page(doc, url, base):
    content = doc.find("div", id="content")
    heading = content.find("h2", cls="page-title")
    results = content.find("div", cls="archiveresults")
    rec = {}
    if heading is None:  # author page: profile, then "Posts by X (N)"
        heading = content.find("div", cls="userpage-posts").find("h3")
        total = int(re.search(r"\((\d+)\)", heading.text()).group(1))
        avatar = content.find("div", cls="userpage-avatar").find("img")
        rec["profile"] = {
            "avatar": avatar.get("src"),
            "html": fix_links(content.find("div", cls="userpage-bio").inner_html().strip(), url),
        }
    else:
        total = int(re.match(r"(\d+) results?", results.text()).group(1))
    entries = []
    for tr in content.find_all("tr"):
        d = tr.find("td", cls="archive-date")
        a = tr.find("td", cls="archive-title").find("a")
        entries.append({"date": d.text(), "href": to_root(a.get("href"), url), "title": a.text()})
    n, of = paginav(doc)
    return {
        "heading": heading.text(),
        "total": total,
        "page": n,
        "pages": of,
        "entries": entries,
        "head": head_info(doc, url),
        **rec,
    }


def extract_home_page(doc, url):
    content = doc.find("div", id="content")
    items = []
    comic = doc.find("div", id="comic")
    first = None
    if comic:
        first = content.find("div", cls="post")
        a = first.find("h2", cls="post-title").find("a")
        cl = first.find("div", cls="comment-link")
        items.append({"path": to_root(a.get("href"), url), "role": "comic",
                      "commentLink": cl.find("a").text() if cl else None})
    index = content.find("div", cls="blogindex")
    for div in (index.find_all("div", cls="post") if index else []):
        a = div.find("h2", cls="post-title").find("a")
        rec = post_record(div, url, url)
        cl = div.find("div", cls="comment-link")
        items.append({
            "path": to_root(a.get("href"), url),
            "role": "blog",
            "_html": rec["html"],
            "commentLink": cl.find("a").text() if cl else None,
        })
    n, of = paginav(doc)
    return {"page": n, "pages": of, "items": items, "nav": comic_nav(doc, url),
            "menuNav": menu_nav(doc, url), "head": head_info(doc, url)}


def extract_sidebar(doc, page):
    side = doc.find("div", id="sidebar-right")
    widgets = []
    for w in side.find_all("div", cls="widget"):
        title = w.find("h2", cls="widgettitle")
        ul = w.find("ul")
        items = []
        for li in ul.child_elements("li"):
            a = li.find("a")
            item = link(a, page)
            if a.get("title"):
                item["description"] = a.get("title")
            cat = next((c[len("cat-item-"):] for c in li.classes if re.fullmatch(r"cat-item-\d+", c)), None)
            if cat:
                item["id"] = int(cat)
            need(li.find("ul") is None, page, "nested sidebar list")
            items.append(item)
        widgets.append({"id": w.id, "class": " ".join(c for c in w.classes if c != "widget"),
                        "title": title.text(), "items": items})
    return widgets


def extract_menu(doc, page):
    menu = doc.find("div", cls="menu")
    return [link(a, page) for a in menu.find_all("a")]


def extract_emulsifier(doc, url):
    imgs = [html.unescape(i.get("src")) for i in doc.find_all("img")]
    heads = [h.text() for h in doc.find_all("h4")]
    return {"path": url, "title": doc.find("title").text(), "intro": doc.find("p").text(),
            "images": [{"file": f, "caption": c} for f, c in zip(imgs, heads)]}


# ---------------------------------------------------------------- main

def strip_private(obj):
    """Drop _working fields before writing."""
    if isinstance(obj, dict):
        return {k: strip_private(v) for k, v in obj.items() if not k.startswith("_")}
    if isinstance(obj, list):
        return [strip_private(v) for v in obj]
    return obj


def extract():
    out = {}  # relative path under content/ -> data
    posts, pages, listings, home_pages, comment_pages = {}, {}, {}, {}, {}
    sidebars, menus = Counter(), Counter()
    unknown = []

    for index in sorted(SITE.rglob("index.html")):
        url = url_of(index)
        src = index.read_text(encoding="utf-8")
        doc = parse(src)
        if url == "/emulsifier-online/":
            out["emulsifier-online.json"] = extract_emulsifier(doc, url)
            continue
        if "/comment-page-" in url:
            comment_pages[url] = extract_comment_page(doc, url)
            continue
        kind = page_kind(doc)
        files = {p.name for p in index.parent.iterdir() if p.is_file()}
        if kind == "post":
            posts[url] = extract_post(doc, url, files)
        elif kind == "page":
            pages[url] = extract_page(doc, url)
        elif kind == "home":
            home_pages[url] = extract_home_page(doc, url)
        elif kind in ("category", "tag", "author"):
            base = re.sub(r"page/\d+/$", "", url)
            listings.setdefault(base, {"kind": kind, "pages": {}})["pages"][url] = extract_listing_page(doc, url, base)
        else:
            unknown.append(url)
            continue
        side = json.dumps(extract_sidebar(doc, url), sort_keys=True)
        sidebars[side] += 1
        menus[json.dumps(extract_menu(doc, url))] += 1

    if unknown:
        raise ExtractError(f"unrecognised pages: {unknown}")

    # Comment pages: give each comment of a paged post its page number.
    by_post = {}
    for url, (post_url, n, c) in comment_pages.items():
        by_post.setdefault(post_url, {})[n] = c
    for post_url, cps in by_post.items():
        post = posts[post_url]
        need(sorted(cps) == list(range(1, post["commentPages"] + 1)), post_url, "missing comment pages")
        last = cps[post["commentPages"]]
        need(post["_shownCommentPage"] == post["commentPages"], post_url, "post doesn't show its last comment page")
        need([x["id"] for x in last["comments"] + last["pingbacks"]]
             == [x["id"] for x in post["comments"] + post["pingbacks"]], post_url,
             "post page differs from its last comment page")
        # WordPress paged comments and pingbacks together, 50 per page.
        comments, pingbacks = [], []
        for n in sorted(cps):
            comments += [{**x, "page": n} for x in cps[n]["comments"]]
            pingbacks += [{**x, "page": n} for x in cps[n]["pingbacks"]]
        post["comments"], post["pingbacks"] = comments, pingbacks
    for post in posts.values():
        need(post["commentPages"] == 1 or post["path"] in by_post, post["path"], "comment pages not exported")

    # Site-wide pieces must be the same on every page to be shared data.
    need(len(sidebars) == 1, "sidebar", f"{len(sidebars)} different sidebars")
    need(len(menus) == 1, "menu", f"{len(menus)} different menus")
    titles = {p["head"]["title"].split(SITE_TITLE_SEP)[0] for p in posts.values()}
    need(len(titles) == 1, "title", f"site titles differ: {titles}")
    out["site.json"] = {
        "title": titles.pop(),
        "menu": json.loads(menus.most_common(1)[0][0]),
        "sidebar": json.loads(sidebars.most_common(1)[0][0]),
        "listingPerPage": LISTING_PER_PAGE,
    }

    for url, p in posts.items():
        p.pop("_shownCommentPage")
        out[f"{p['series']}/{p['slug']}.json"] = p
    for url, p in pages.items():
        out[f"pages/{p['slug']}.json"] = p

    for base, l in listings.items():
        first = l["pages"][base]
        entries = []
        for n in range(1, first["pages"] + 1):
            u = base if n == 1 else f"{base}page/{n}/"
            need(u in l["pages"], base, f"listing page {u} missing")
            need(l["pages"][u]["page"] == n, u, "wrong page number")
            entries += l["pages"][u]["entries"]
        need(len(l["pages"]) == first["pages"], base, "extra listing pages")
        need(len(entries) == first["total"], base, f"{len(entries)} entries, says {first['total']}")
        need(first["pages"] == 1 or len(first["entries"]) == LISTING_PER_PAGE, base, "page size")
        for e in entries:
            need(e["href"] in posts, base, f"lists unknown post {e['href']}")
            need(e["title"] == posts[e["href"]]["title"], base, f"title differs for {e['href']}")
        m = re.fullmatch(r"(?:Archive for|Posts Tagged) ‘(.*)’", first["heading"])
        out[f"listings{base}".rstrip("/") + ".json"] = {
            "path": base,
            "kind": l["kind"],
            "heading": first["heading"],
            "title": m.group(1) if m else first["head"]["title"].split(SITE_TITLE_SEP, 1)[1],
            "pages": first["pages"],
            "entries": entries,
            "head": first["head"],
            **({"profile": first["profile"]} if "profile" in first else {}),
        }

    home = home_pages["/"]
    hp = []
    for n in range(1, home["pages"] + 1):
        u = "/" if n == 1 else f"/page/{n}/"
        need(u in home_pages, u, "home page missing")
        h = home_pages[u]
        for item in h["items"]:
            need(item["path"] in posts, u, f"home links to unknown post {item['path']}")
            if item["role"] == "blog":
                full = posts[item["path"]]["html"]
                if item["_html"] != full:
                    item["excerpt"] = item["_html"]  # home shows a shortened body
        hp.append({"path": u, "items": h["items"], "nav": h["nav"], "menuNav": h["menuNav"], "head": h["head"]})
    need(len(home_pages) == home["pages"], "/", "extra home pages")
    out["home.json"] = {"pages": hp}

    return out, posts, pages


def verify(out, posts, pages):
    """Round-trip totals against site/ itself (independent regex counts)."""
    problems = []
    singles = [p for p in SITE.rglob("index.html")
               if "/comment-page-" not in p.as_posix()
               and re.search(r'<body[^>]*class="[^"]*\bsingle\b', p.read_text(encoding="utf-8"))]
    counts = {"posts": len(posts), "pages": len(pages)}
    for k, want in EXPECTED.items():
        if counts[k] != want:
            problems.append(f"{counts[k]} {k}, expected {want}")
    if len(singles) != len(posts):
        problems.append(f"{len(singles)} single-post pages in site/, {len(posts)} extracted")

    # Every comment/pingback <li> in the site, by id, exactly once in the data.
    site_ids = set()
    for p in SITE.rglob("index.html"):
        site_ids |= {int(x) for x in re.findall(r'<li id="comment-(\d+)"', p.read_text(encoding="utf-8"))}
    data_ids = Counter()
    claimed = 0
    for rec in list(posts.values()) + list(pages.values()):
        for c in rec["comments"] + rec["pingbacks"]:
            data_ids[c["id"]] += 1
        claimed += rec["commentCount"] or 0
        shown = len(rec["comments"]) + len(rec["pingbacks"])
        if rec["commentCount"] is None and rec["comments"] or rec["commentCount"] not in (None, shown):
            problems.append(f"{rec['path']}: says {rec['commentCount']} comments, has "
                            f"{len(rec['comments']) + len(rec['pingbacks'])}")
    dup = [i for i, n in data_ids.items() if n > 1]
    if dup:
        problems.append(f"comments in more than one post: {dup[:10]}")
    if set(data_ids) != site_ids:
        problems.append(f"comment ids differ: missing {sorted(site_ids - set(data_ids))[:10]}, "
                        f"extra {sorted(set(data_ids) - site_ids)[:10]}")

    # Every image file in a post folder is named by its post's data.
    images = referenced = 0
    unreferenced = []
    img_ext = re.compile(r"\.(jpe?g|png|gif|webp|bmp)$", re.I)
    for rec in posts.values():
        folder = SITE / rec["series"] / rec["slug"]
        blob = json.dumps(rec, ensure_ascii=False)
        for f in folder.iterdir():
            if f.is_file() and f.name != "index.html":
                need(img_ext.search(f.name), rec["path"], f"non-image file {f.name}")
                images += 1
                if any(i["src"] == f.name for i in rec["images"]) or f.name in blob:
                    referenced += 1
                else:
                    unreferenced.append(f"{rec['path']}{f.name}")
    if unreferenced:
        problems.append(f"image files not named by any data: {unreferenced[:10]}")
    em = out["emulsifier-online.json"]
    em_files = sorted(f.name for f in (SITE / "emulsifier-online").iterdir() if f.name != "index.html")
    if sorted(i["file"] for i in em["images"]) != em_files:
        problems.append("emulsifier-online images differ from its folder")

    comic_posts = sum(1 for p in posts.values() if p["type"] == "comic")
    summary = (f"{len(posts)} posts ({comic_posts} comic, {len(posts) - comic_posts} news), "
               f"{len(pages)} page, {sum(data_ids.values())} comments+pingbacks "
               f"(= {len(site_ids)} unique <li> in site/, {claimed} by the Discussion counts), "
               f"{images} post images ({referenced} named), {len(em['images'])} emulsifier-online images, "
               f"{sum(1 for k in out if k.startswith('listings/'))} listings")
    return problems, summary


def serialise(data):
    return json.dumps(strip_private(data), indent=1, ensure_ascii=False) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="don't write; fail if content/ differs")
    ap.add_argument("--site", type=Path, help="exported site to read (default: ../site)")
    args = ap.parse_args()
    global SITE
    if args.site:
        SITE = args.site.resolve()
    try:
        out, posts, pages = extract()
    except ExtractError as e:
        sys.exit(f"extract failed: {e}")
    problems, summary = verify(out, posts, pages)
    for p in problems:
        print(f"PROBLEM: {p}", file=sys.stderr)
    if problems:
        sys.exit(1)
    print(summary, file=sys.stderr)

    want = {CONTENT / k: serialise(v) for k, v in out.items()}
    have = {p for p in CONTENT.rglob("*.json")} if CONTENT.exists() else set()
    stale = sorted(p for p in want if not p.exists() or p.read_text(encoding="utf-8") != want[p])
    extra = sorted(have - set(want))
    if args.check:
        for p in stale:
            print(f"STALE: {p.relative_to(ROOT)}", file=sys.stderr)
        for p in extra:
            print(f"EXTRA: {p.relative_to(ROOT)}", file=sys.stderr)
        sys.exit(1 if stale or extra else 0)
    for p in stale:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(want[p], encoding="utf-8")
    for p in extra:
        p.unlink()
    print(f"wrote {len(stale)} of {len(want)} files in content/", file=sys.stderr)


if __name__ == "__main__":
    main()
