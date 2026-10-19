// Gathers the committed content data (../content/, written once from
// ../site by scripts/extract-content.py) into one file the components and
// configs import: src/data/content.json (gitignored, rebuilt every build).
//
//   { site, home, posts: {path: post}, pages: {path: page},
//     listings: {path: listing}, emulsifierOnline, render: [every URL to prerender] }
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

const data = {
  site: read('site.json'),
  home: read('home.json'),
  emulsifierOnline: read('emulsifier-online.json'),
  posts: {},
  pages: {},
  listings: {},
};
for (const file of walk(CONTENT)) {
  if (!file.includes('/')) continue; // site.json, home.json, emulsifier-online.json
  const rec = read(file);
  const group = file.startsWith('listings/') ? 'listings' : file.startsWith('pages/') ? 'pages' : 'posts';
  data[group][rec.path] = rec;
}

// Every page the site serves, at its current URL.
const paged = (base, n) => Array.from({ length: n }, (_, i) => (i === 0 ? base : `${base}page/${i + 1}/`));
data.render = [
  ...paged('/', data.home.pages.length),
  ...Object.values(data.posts).flatMap(p => [
    p.path,
    ...(p.commentPages > 1 ? Array.from({ length: p.commentPages }, (_, i) => `${p.path}comment-page-${i + 1}/`) : []),
  ]),
  ...Object.keys(data.pages),
  ...Object.values(data.listings).flatMap(l => paged(l.path, l.pages)),
  data.emulsifierOnline.path,
];

mkdirSync(new URL('.', `file://${OUT}`).pathname, { recursive: true });
writeFileSync(OUT, JSON.stringify(data));
const n = group => Object.keys(data[group]).length;
console.log(`content: ${n('posts')} posts, ${n('pages')} pages, ${n('listings')} listings; rendering ${data.render.length} urls`);
