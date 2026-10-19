"""A small HTML tree for reading the exported WordPress pages.

Standard library only (html.parser), so the extractor runs anywhere the
link checks run. Every element remembers where it sits in the source, so
`inner_html()` returns the original markup byte for byte instead of a
re-serialisation: post bodies and comments come out exactly as WordPress
wrote them.
"""
import html
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
# Elements the browser closes implicitly when a sibling starts.
AUTOCLOSE = {"p": {"p", "div", "ul", "ol", "table", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre"},
             "li": {"li"}, "td": {"td", "th", "tr"}, "th": {"td", "th", "tr"}, "tr": {"tr"},
             "option": {"option"}}


class Node:
    def __init__(self, tag, attrs, src, start, inner_start):
        self.tag, self.attrs, self.src = tag, dict(attrs), src
        self.start, self.inner_start = start, inner_start
        self.inner_end = self.end = inner_start
        self.children, self.parent = [], None

    # -- attributes -------------------------------------------------------
    def get(self, name, default=None):
        v = self.attrs.get(name, default)
        return default if v is None else v

    @property
    def id(self):
        return self.attrs.get("id")

    @property
    def classes(self):
        return (self.attrs.get("class") or "").split()

    # -- content ----------------------------------------------------------
    def inner_html(self):
        return self.src[self.inner_start:self.inner_end]

    def outer_html(self):
        return self.src[self.start:self.end]

    def text(self):
        """Visible text, entities decoded, whitespace collapsed."""
        import re
        raw = re.sub(r"<!--.*?-->", "", self.inner_html(), flags=re.S)
        return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", raw)).split())

    # -- search -----------------------------------------------------------
    def iter(self):
        for c in self.children:
            yield c
            yield from c.iter()

    def find_all(self, tag=None, cls=None, id=None, **attrs):
        out = []
        for n in self.iter():
            if tag and n.tag != tag:
                continue
            if cls and cls not in n.classes:
                continue
            if id and n.id != id:
                continue
            if any(n.attrs.get(k) != v for k, v in attrs.items()):
                continue
            out.append(n)
        return out

    def find(self, tag=None, cls=None, id=None, **attrs):
        found = self.find_all(tag, cls, id, **attrs)
        return found[0] if found else None

    def child_elements(self, tag=None):
        return [c for c in self.children if tag is None or c.tag == tag]

    def __repr__(self):
        return f"<{self.tag} {self.attrs}>"


class _Builder(HTMLParser):
    def __init__(self, src):
        super().__init__(convert_charrefs=True)
        self.src = src
        self.line_starts = [0]
        for i, ch in enumerate(src):
            if ch == "\n":
                self.line_starts.append(i + 1)
        self.root = Node("#root", {}, src, 0, 0)
        self.root.inner_end = self.root.end = len(src)
        self.stack = [self.root]

    def _pos(self):
        line, col = self.getpos()
        return self.line_starts[line - 1] + col

    def _open(self, tag, attrs, self_closing):
        start = self._pos()
        text = self.get_starttag_text()
        top = self.stack[-1]
        if top.tag in AUTOCLOSE and tag in AUTOCLOSE[top.tag]:
            self._close_to(len(self.stack) - 1, start)
        node = Node(tag, attrs, self.src, start, start + len(text))
        node.parent = self.stack[-1]
        node.parent.children.append(node)
        if self_closing or tag in VOID:
            node.end = node.inner_end = node.inner_start
        else:
            self.stack.append(node)

    def handle_starttag(self, tag, attrs):
        self._open(tag, attrs, False)

    def handle_startendtag(self, tag, attrs):
        self._open(tag, attrs, True)

    def _close_to(self, index, at, end=None):
        """Close stack[index:] at source offset `at` (end tag at..end)."""
        for n in reversed(self.stack[index:]):
            n.inner_end = at
            n.end = at if n is not self.stack[index] or end is None else end
        del self.stack[index:]

    def handle_endtag(self, tag):
        at = self._pos()
        end = self.src.index(">", at) + 1
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self._close_to(i, at, end)
                return
        # stray end tag: ignore, like a browser


def parse(src):
    b = _Builder(src)
    b.feed(src)
    b.close()
    b._close_to(1, len(src))
    return b.root
