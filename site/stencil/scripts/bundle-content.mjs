// Gathers the content data (site/content/: a folder per post or page,
// mirroring its URL, with post.json or page.json and its images, plus
// site.json) into src/data/content.json (gitignored, rebuilt every
// build) and works out everything that follows from it, the way WordPress
// did: each post's URL, comic and blog navigation, series/tag/author
// listings, the home page's pages, comment pages and the list of URLs to
// prerender. Formatting and markup are the components' job.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const CONTENT = new URL('../../content/', import.meta.url).pathname;
const OUT = new URL('../src/data/content.json', import.meta.url).pathname;
const BLOG_PER_PAGE = 5; // home page blog index
const COMMENTS_PER_PAGE = 50; // WordPress paged comments and pingbacks together

const read = file => JSON.parse(readFileSync(join(CONTENT, file), 'utf-8'));
const walk = dir =>
  readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [relative(CONTENT, p)] : [];
  });

const site = read('site.json');
const blogCategories = new Set(site.blogCategories);
const parentOf = Object.fromEntries(site.categories.map(c => [c.slug, c.parent]));

// Comments and pingbacks share pages, oldest first.
const pageComments = rec => {
  rec.comments ??= [];
  rec.pingbacks ??= [];
  const all = [...rec.comments, ...rec.pingbacks].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  rec.commentPages = Math.max(1, Math.ceil(all.length / COMMENTS_PER_PAGE));
  if (rec.commentPages > 1) all.forEach((c, i) => (c.page = Math.floor(i / COMMENTS_PER_PAGE) + 1));
  return rec;
};

const posts = {};
const pages = {};
for (const file of walk(CONTENT)) {
  const parts = file.split('/');
  if (parts.length === 2 && parts[1] === 'page.json') {
    pages[`/${parts[0]}/`] = pageComments({ ...read(file), path: `/${parts[0]}/` });
  } else if (parts.length === 3 && parts[2] === 'post.json') {
    const [folder, slug] = parts;
    const rec = read(file);
    posts[`/${folder}/${slug}/`] = pageComments({
      ...rec,
      path: `/${folder}/${slug}/`,
      series: folder,
      categories: rec.categories ?? [folder],
      tags: rec.tags ?? [],
      images: rec.images ?? [],
      blog: blogCategories.has(folder),
    });
  } // site.json, gallery.json: read below
}

// Oldest first; WordPress ordered by date (ties: by path here).
const byDate = Object.values(posts).sort((a, b) => a.date.localeCompare(b.date) || a.path.localeCompare(b.path));
const newestFirst = [...byDate].reverse();
const comics = byDate.filter(p => !p.blog);
const newestComic = comics[comics.length - 1];

// Comic nav stays inside the comic's series (its folder): previous/next by
// date, First/Last the series' oldest/newest, each only when there's
// somewhere to go (a one-comic series gets no nav).
for (const series of new Set(comics.map(p => p.series))) {
  const list = comics.filter(p => p.series === series);
  list.forEach((p, i) => {
    const previous = list[i - 1]?.path;
    const next = list[i + 1]?.path;
    p.nav = { first: previous && list[0].path, previous, next, last: next && list[list.length - 1].path };
  });
}
// Blog nav: previous/next post in the same category.
for (const cat of blogCategories) {
  const list = byDate.filter(p => p.series === cat);
  list.forEach((p, i) => (p.nav = { previous: list[i - 1]?.path, next: list[i + 1]?.path }));
}

// Listings, newest first. A category also lists its child categories' posts.
const listings = {};
const listing = (path, kind, title, list) => (listings[path] = { path, kind, title, entries: list.map(p => p.path) });
for (const c of site.categories) {
  listing(`/${c.slug}/`, 'category', c.name, newestFirst.filter(p => p.categories.some(k => k === c.slug || parentOf[k] === c.slug)));
}
for (const [slug, name] of Object.entries(site.tags)) {
  listing(`/tag/${slug}/`, 'tag', name, newestFirst.filter(p => p.tags.includes(slug)));
}
for (const name of Object.keys(site.authors)) {
  listing(`/author/${name}/`, 'author', name, newestFirst.filter(p => p.author === name));
}

// Home: the newest comic on page 1, then the blog index, 5 posts a page.
const blogPosts = newestFirst.filter(p => p.blog).map(p => p.path);
const home = Array.from({ length: Math.ceil(blogPosts.length / BLOG_PER_PAGE) }, (_, i) => ({
  path: i === 0 ? '/' : `/page/${i + 1}/`,
  comic: i === 0 ? newestComic.path : undefined,
  blog: blogPosts.slice(i * BLOG_PER_PAGE, (i + 1) * BLOG_PER_PAGE),
}));

const data = {
  site,
  posts,
  pages,
  listings,
  home,
  latestComics: [...comics].reverse().slice(0, 5).map(p => p.path),
  emulsifierOnline: { path: '/emulsifier-online/', ...read('emulsifier-online/gallery.json') },
};

// Every page the site serves, at its current URL.
const PER_PAGE = 10;
const paged = (base, n) => Array.from({ length: n }, (_, i) => (i === 0 ? base : `${base}page/${i + 1}/`));
data.render = [
  ...home.map(h => h.path),
  ...Object.values(posts).flatMap(p => [
    p.path,
    ...(p.commentPages > 1 ? Array.from({ length: p.commentPages }, (_, i) => `${p.path}comment-page-${i + 1}/`) : []),
  ]),
  ...Object.keys(pages),
  // Category listings are one page; tag and author listings are paged.
  ...Object.values(listings).flatMap(l => (l.kind === 'category' ? [l.path] : paged(l.path, Math.ceil(l.entries.length / PER_PAGE)))),
  data.emulsifierOnline.path,
];

mkdirSync(new URL('.', `file://${OUT}`).pathname, { recursive: true });
writeFileSync(OUT, JSON.stringify(data));
const n = o => Object.keys(o).length;
console.log(`content: ${n(posts)} posts, ${n(pages)} pages, ${n(listings)} listings; rendering ${data.render.length} urls`);
