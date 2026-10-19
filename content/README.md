# content/

The site's content as data. Every page is generated from these files by
`stencil/` (see `stencil/README.md`); edit them directly. Only content lives
here: theme markup, CSS classes, date formatting, navigation, listings and
the home page are all worked out by the build.

## Posts: `<series>/<slug>.json`

The file's place is the post's URL: `eatshitanddie/eat-shit-and-die-101.json`
is `/eatshitanddie/eat-shit-and-die-101/`, and its comic image sits beside the
generated page in `site/eatshitanddie/eat-shit-and-die-101/`.

```jsonc
{
  "title": "Eat Shit And Die 101",
  "author": "emulsifier",              // a key of site.json "authors"
  "date": "2008-10-02T00:00",
  "categories": ["comics", "eatshitanddie"],  // only when not just [series]
  "tags": ["zeno"],                    // keys of site.json "tags"
  "images": ["2008-10-02-Eat_Shit_And_Die_101.jpg"],  // beside the page, or a root-relative URL
  "hoverText": "...",                  // image alt/title, when not the title
  "body": "<p>...</p>",                // post text (HTML)
  "comments": [{ "id": 638, "author": "Tropylium", "date": "2009-09-27T20:26",
                 "url": "...", "avatar": "<gravatar hash>", "text": "<p>...</p>" }],
  "pingbacks": [{ "id": 220436, "title": "...", "url": "...", "date": "..." }]
}
```

Everything but `title`, `author` and `date` is optional. Comment `id`s are
the old WordPress ids: `#comment-638` links depend on them.

Derived by the build: a post in a `blogCategories` category (news, fan art)
is a blog post (blog layout, previous/next within its category, listed on
the home page); any other post is a comic (comic navigation by date,
"Latest Comics"). Series, tag and author listings, home pages and comment
pages (50 per page) follow from the posts.

## `pages/<slug>.json`

WordPress pages (only `/about/`): `title`, `body`, `comments`, `pingbacks`.

## `site.json`

Site title; `categories` (sidebar order; `parent`: the parent's listing also
lists this category's posts); `blogCategories`; `tags` (slug → name);
`authors` (gravatar hash, registration date, website).

## `emulsifier-online.json`

The pre-akimbo gallery page: title, intro, image files.
