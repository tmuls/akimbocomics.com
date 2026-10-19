// Gathers the committed content data (../content/, written once from
// ../site by scripts/extract-content.py) into one file the components and
// configs import: src/data/content.json (gitignored, rebuilt every build).
//
//   { site, home, posts: {path: post}, pages: {path: page},
//     listings: {path: listing}, render: [urls to prerender] }
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const CONTENT = new URL('../../content/', import.meta.url).pathname;
const OUT = new URL('../src/data/content.json', import.meta.url).pathname;

const read = file => JSON.parse(readFileSync(join(CONTENT, file), 'utf-8'));
const walk = dir =>
  readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [relative(CONTENT, p)] : [];
  });

const data = { site: read('site.json'), home: read('home.json'), posts: {}, pages: {}, listings: {} };
for (const file of walk(CONTENT)) {
  if (!file.includes('/')) continue; // site.json, home.json, emulsifier-online.json
  const rec = read(file);
  const group = file.startsWith('listings/') ? 'listings' : file.startsWith('pages/') ? 'pages' : 'posts';
  data[group][rec.path] = rec;
}

// What the build prerenders. Still milestone 0's pages: the home page, its
// posts, three Eat Shit and Die posts and that series' listing. Milestone 3
// renders every post, page and listing from the same data.
const SERIES = '/eatshitanddie/';
const home = data.home.pages[0];
const listingPages = n => Array.from({ length: n }, (_, i) => (i === 0 ? SERIES : `${SERIES}page/${i + 1}/`));
data.render = [
  '/',
  ...new Set([
    '/eatshitanddie/eat-shit-die-309/', // newest comic: no next/last
    '/eatshitanddie/eat-shit-die-308/',
    '/eatshitanddie/eat-shit-and-die-101/', // has comments, full nav
    ...home.items.map(i => i.path),
  ]),
  ...listingPages(Math.ceil(data.listings[SERIES].entries.length / data.site.listingPerPage)),
];

mkdirSync(new URL('.', `file://${OUT}`).pathname, { recursive: true });
writeFileSync(OUT, JSON.stringify(data));
const n = group => Object.keys(data[group]).length;
console.log(`content: ${n('posts')} posts, ${n('pages')} pages, ${n('listings')} listings; rendering ${data.render.length} urls`);
