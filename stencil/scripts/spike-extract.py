#!/usr/bin/env python3
"""Milestone 0 spike: pull just enough content out of ../site/ to render a
few pages with Stencil. Writes src/data/content.json (gitignored).

This is a throwaway prototype of milestone 1 (content extraction); it only
reads the handful of pages the spike renders. Regex parsing is fine here
because every page was emitted by the same WordPress theme.
"""
import html
import json
import posixpath
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
OUT = Path(__file__).resolve().parents[1] / "src" / "data" / "content.json"

# Pages the spike prerenders.
COMIC_POSTS = [
    "/eatshitanddie/eat-shit-die-309/",      # newest comic: no next/last
    "/eatshitanddie/eat-shit-die-308/",
    "/eatshitanddie/eat-shit-and-die-101/",  # has comments, full nav
]
SERIES = "/eatshitanddie/"
NEWS_ON_HOME = 5  # the comic is the 6th post on the page


def read(path):
    """path is a site URL like /x/y/ -> that folder's index.html text."""
    return (SITE / path.strip("/") / "index.html").read_text(encoding="utf-8")


def text(fragment):
    """Inner HTML -> plain text (entities decoded)."""
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def one(pattern, s, default=None, flags=re.S):
    m = re.search(pattern, s, flags)
    return m.group(1) if m else default


def to_root(href, page):
    """Relative export link -> root-relative folder URL (/a/b/)."""
    if re.match(r"^([a-z]+:|//|#|/)", href):
        return href
    frag = ""
    if "#" in href:
        href, frag = href.split("#", 1)
        frag = "#" + frag
    url = posixpath.normpath(posixpath.join(page, href)) if href else page.rstrip("/")
    if url.endswith("/index.html"):
        url = url[: -len("index.html")]
    elif url == "/index.html" or url == "/." or url == ".":
        url = "/"
    elif not posixpath.splitext(url)[1] and not url.endswith("/"):
        url += "/"
    return url + frag


def fix_links(fragment, page):
    return re.sub(
        r'\b(href|src)="([^"]*)"',
        lambda m: f'{m.group(1)}="{to_root(html.unescape(m.group(2)), page)}"',
        fragment,
    )


def links(block, page):
    """All <a> in a block as [{title, href}]."""
    return [
        {"title": text(t), "href": to_root(html.unescape(h), page)}
        for h, t in re.findall(r'<a href="([^"]*)"[^>]*>(.*?)</a>', block, re.S)
    ]


def post(page):
    s = read(page)
    info = one(r'<div class="post-text">(.*?)</div>\s*</div>', s)
    entry = one(r'<div class="entry">(.*?)<div class="clear"></div>\s*</div>', s, "")
    entry = re.sub(r'<span class="facebook-like">.*?</span>', "", entry, flags=re.S)
    tags = one(r'<div class="post-tags">(.*?)</div>', s, "")
    nav = {}
    for kind in ("first", "previous", "next", "last"):
        h = one(rf'<div class="nav-{kind}"><a href="([^"]*)"', s)
        if h:
            nav[kind] = to_root(html.unescape(h), page)
    if not nav:  # news posts use blognav
        for kind, cls in (("previous", "prev"), ("next", "next")):
            h = one(rf'<span class="blognav-{cls}"><a href="([^"]*)"', s)
            if h:
                nav[kind] = to_root(html.unescape(h), page)
    img = one(r'<div id="comic-1" class="comicpane"><img src="([^"]*)"', s)
    comments = []
    for cid, li in re.findall(r'<li id="comment-(\d+)"[^>]*>(.*?)</li>', s, re.S):
        cite = one(r"<cite[^>]*>(.*?)</cite>", li, "")
        comments.append({
            "id": cid,
            "author": text(cite),
            "url": to_root(html.unescape(one(r'<a href="([^"]*)"', cite, "")), page) or None,
            "avatar": html.unescape(one(r"<img alt='[^']*' src='([^']*)'", li, "")),
            "time": text(one(r'<span class="comment-time"[^>]*>(.*?)</span>', li, "")),
            "timeTitle": html.unescape(one(r'<span class="comment-time" title="([^"]*)"', li, "")),
            "html": fix_links(one(r'<div class="comment-text">\s*(.*?)\s*</div>', li, ""), page).strip(),
        })
    date, time_ = text(one(r'<span class="post-date">(.*?)</span>', info)), text(one(r'<span class="post-time">(.*?)</span>', info))
    return {
        "path": page,
        "id": one(r'<div class="post-(\d+) post ', s),
        "type": "comic" if img else "news",
        "title": text(one(r'<h2 class="post-title">(.*?)</h2>', info)),
        "author": text(one(r'<span class="post-author">by (.*?)</span>', info)),
        "date": date,
        "time": time_,
        "sortKey": datetime.strptime(f"{date} {time_}", "%B %d, %Y %I:%M %p").isoformat(),
        "categories": links(one(r'<(?:ul class="storyline-cats"|div class="post-cat")>(.*?)</(?:ul|div)>', s, ""), page),
        "tags": links(tags, page),
        "image": img and posixpath.join(page, html.unescape(img)),
        "html": fix_links(entry, page).strip(),
        "nav": nav,
        "comments": comments,
        # WordPress showed the (login-only) comment box and the home page's
        # "Comment" link only for posts that still allowed comments.
        "commentsOpen": 'id="respond"' in s,
    }


def listing(series):
    first = read(series)
    title = text(one(r'<h2 class="page-title">Archive for &#8216;(.*?)&#8217;</h2>', first))
    total = int(one(r'<div class="archiveresults">(\d+) results', first))
    pages = int(one(r"Page 1 of (\d+)", first, "1"))
    entries = []
    for n in range(1, pages + 1):
        page = series if n == 1 else f"{series}page/{n}/"
        for d, h, t in re.findall(
            r'<td class="archive-date">(.*?)</td><td class="archive-title"><a href="([^"]*)"[^>]*>(.*?)</a>',
            read(page),
        ):
            entries.append({"date": d, "href": to_root(html.unescape(h), page), "title": text(t)})
    assert len(entries) == total, (series, len(entries), total)
    return {"title": title, "entries": entries}


def sidebar():
    s = read("/")
    latest = one(r"<h2 class=\"widgettitle\">Latest Comics</h2>\s*<ul>(.*?)</ul>", s)
    cats = one(r"<h2 class=\"widgettitle\">Categories</h2>\s*<ul>(.*?)</ul>", s)
    categories = [
        {"href": to_root(html.unescape(h), "/"), "description": html.unescape(d or "") or None, "title": text(t)}
        for h, d, t in re.findall(r'<a href="([^"]*)"\s*(?:title="([^"]*)")?\s*>(.*?)</a>', cats, re.S)
    ]
    return {"latestComics": links(latest, "/"), "categories": categories}


def main():
    news = sorted(
        (post(f"/news/{p.name}/") for p in (SITE / "news").iterdir() if (p / "index.html").exists() and p.name != "page"),
        key=lambda p: p["sortKey"], reverse=True,
    )
    latest_comic = sidebar()["latestComics"][0]["href"]
    posts = {p: post(p) for p in dict.fromkeys(COMIC_POSTS + [latest_comic])}
    home_news = news[:NEWS_ON_HOME]
    posts.update({p["path"]: p for p in home_news})
    home_pages = int(one(r"Page 1 of (\d+)", read("/")))
    data = {
        "sidebar": sidebar(),
        "posts": posts,
        "listings": {SERIES: listing(SERIES)},
        "home": {"comic": latest_comic, "news": [p["path"] for p in home_news], "pages": home_pages},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(posts)} posts, "
          f"{sum(len(l['entries']) for l in data['listings'].values())} listing entries", file=sys.stderr)


if __name__ == "__main__":
    main()
