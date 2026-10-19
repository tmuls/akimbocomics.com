#!/usr/bin/env python3
"""Compare generated pages (www/) with another copy of the site's pages.

    git worktree add /tmp/exported exported-pages   # the WordPress export
    python3 scripts/compare-pages.py --site /tmp/exported/site
    python3 scripts/compare-pages.py --site /tmp/exported/site /about/ -v

Milestone 3 used this to show the generated pages match the exported
WordPress pages (tag `exported-pages`, the last commit with them in
site/). Point --site at any other build (e.g. an older dist/) to check that
a refactor of the components changes nothing a reader sees.

For each page, compares what a reader gets: the visible text of <body>
(scripts, styles, comments and display:none elements removed, whitespace
collapsed) and every link and image URL in it (the old relative links
resolved to root-relative, as in content/). Text that the generated pages
drop on purpose (see the stencil-migration skill, Decisions) is ignored.
Fails if any page differs or a site/ page has no generated counterpart.
"""
import argparse
import difflib
import html
import posixpath
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from htmltree import parse  # noqa: E402


WWW = HERE.parent / "www"
SITE = None  # --site

# Non-content text the old pages had and the generated ones drop on purpose.
DROPPED_TEXT = [
    r"\[ Comments RSS \]", r"\| Subscribe: RSS\b", r"(?<=\s)RSS(?=\s)", r"^RSS\s",
    r"\d+ queries\. [\d.]+ mb Memory usage\. [\d.]+ seconds\.",
]
# URLs the old pages linked that are dead or dropped with the text above.
DROPPED_URL = re.compile(r"^(https?:)?//(connect\.facebook\.net|www\.projectwonderful\.com|"
                         r"www\.google-analytics\.com|s\.w\.org)|^https?://akimbocomics\.com/\?feed=")


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


def visible(doc):
    body = doc.find("body") or doc
    src = body.inner_html()
    cut = []
    for n in body.iter():
        if n.tag in ("script", "style", "noscript") or "display:none" in (n.get("style") or "").replace(" ", ""):
            cut.append((n.start - body.inner_start, n.end - body.inner_start))
    for a, b in sorted(cut, reverse=True):
        src = src[:a] + " " + src[b:]
    src = re.sub(r"<!--.*?-->", " ", src, flags=re.S)
    text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", src)).split())
    for pat in DROPPED_TEXT:
        text = re.sub(pat, " ", text)
    return " ".join(text.split())


def urls(doc, page, old):
    body = doc.find("body") or doc
    out = []
    hidden = set()
    for n in body.iter():
        if n.tag in ("script", "fb:like") or "display:none" in (n.get("style") or "").replace(" ", "") or n.parent in hidden:
            hidden.add(n)
            continue
        for attr in ("href", "src"):
            v = n.get(attr)
            if v is None:
                continue
            v = html.unescape(v)
            if old:
                v = to_root(v, page)
            if v.startswith("#"):
                v = page + v  # in-page anchors: both forms are fine
            m = re.match(r"^(?:https?:)?//(?:[0-9]|secure)\.gravatar\.com/avatar/([0-9a-f]{32})", v)
            if m:
                v = "gravatar:" + m.group(1)  # http://0.gravatar.com -> https://secure.gravatar.com
            if v.endswith("#outside"):
                v = v[: -len("outside")] + "page-head"  # "Back to Top": the old anchor didn't exist
            if not DROPPED_URL.search(v):
                out.append(v)
    return out


def compare(page, verbose):
    gen = parse((WWW / page.lstrip("/") / "index.html").read_text(encoding="utf-8"))
    old = parse((SITE / page.lstrip("/") / "index.html").read_text(encoding="utf-8"))
    problems = []
    a, b = visible(old).split(), visible(gen).split()
    if a != b:
        diff = [d for d in difflib.ndiff(a, b) if d[0] in "+-"]
        problems.append(f"text differs ({len(diff)} words)" + (": " + " ".join(diff[:60]) if verbose else ""))
    ua, ub = urls(old, page, True), urls(gen, page, False)
    if ua != ub:
        diff = [d for d in difflib.ndiff(ua, ub) if d[0] in "+-"]
        problems.append(f"links differ ({len(diff)})" + (": " + " ".join(diff[:30]) if verbose else ""))
    return problems


def all_pages(root):
    return sorted("/" if p.parent == root else f"/{p.parent.relative_to(root).as_posix()}/"
                  for p in root.rglob("index.html"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True, type=Path, help="folder with the pages to compare against")
    ap.add_argument("pages", nargs="*")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    global SITE
    SITE = args.site
    pages = args.pages or all_pages(WWW)
    bad = 0
    if not args.pages:
        missing = sorted(set(all_pages(SITE)) - set(pages))
        for m in missing:
            print(f"{m}: not generated")
        bad += len(missing)
    for page in pages:
        problems = compare(page, args.verbose or bool(args.pages))
        if problems:
            bad += 1
            print(f"{page}: " + "; ".join(problems))
    print(f"{len(pages)} pages compared, {bad} with differences", file=sys.stderr)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
