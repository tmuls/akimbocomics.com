// Checks on the prerendered output (www/), run after a build:
//
//   npm run build && npm run verify
//
// - exactly the pages in the content data were generated, each at a URL the
//   site already serves (known-urls.txt), as <path>/index.html;
// - pages are plain HTML: no <script>, no custom elements, the theme's
//   frame and the post's title, images and comments present (so they render
//   fully with JavaScript disabled);
// - every local link/image resolves: in www/, in ../site/ (static files
//   the build doesn't copy yet), or as a url-map.csv redirect.
// scripts/compare-pages.py then checks text and links against ../site/.
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const WWW = new URL('../www/', import.meta.url).pathname;
const SITE = new URL('../../site/', import.meta.url).pathname;
const lines = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf-8').split('\n');
const known = new Set(lines('known-urls.txt').filter(l => l && !l.startsWith('#')));
const redirected = new Set(lines('url-map.csv').slice(1).map(l => l.split(',')[0]));
const content = JSON.parse(readFileSync(new URL('../src/data/content.json', import.meta.url), 'utf-8'));

const pages = [];
const walk = dir => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html') pages.push('/' + p.slice(WWW.length, -'index.html'.length));
  }
};
walk(WWW);

const errors = [];
const fail = (page, msg) => errors.push(`${page}: ${msg}`);
const exists = url => {
  const p = decodeURIComponent(url.split(/[?#]/)[0]);
  const file = p.endsWith('/') ? p + 'index.html' : p;
  return [WWW, SITE].some(root => existsSync(join(root, file))) || redirected.has(p);
};

const want = new Set(content.render);
for (const page of want) if (!pages.includes(page)) fail(page, 'not generated');

for (const page of pages) {
  const html = readFileSync(join(WWW, page, 'index.html'), 'utf-8');
  if (!want.has(page)) fail(page, 'generated but not in the content data');
  if (!known.has(page)) fail(page, 'not a URL the site already serves');
  if (/<script\b/i.test(html)) fail(page, 'has a <script>');
  const custom = html.match(/<([a-z]+-[a-z-]+)[\s>]/);
  if (custom) fail(page, `custom element <${custom[1]}> left in output`);
  for (const [, url] of html.matchAll(/\b(?:href|src)="?(\/[^"\s>]*)/g)) {
    if (!url.startsWith('//') && !exists(url)) fail(page, `broken local link ${url}`);
  }
  if (page === content.emulsifierOnline.path) continue; // outside the theme
  for (const id of ['header', 'menubar-wrapper', 'sidebar-right', 'footer', 'content']) {
    if (!html.includes(`id=${id}`) && !html.includes(`id="${id}"`)) fail(page, `missing #${id}`);
  }
  if (!html.includes('Latest Comics') || !html.includes('Categories')) fail(page, 'sidebar widgets missing');
  const m = page.match(/^(.*\/)comment-page-(\d+)\/$/);
  const post = content.posts[m ? m[1] : page];
  if (post) {
    const shownPage = m ? Number(m[2]) : post.commentPages;
    if (!html.includes(post.title.replace(/&/g, '&amp;'))) fail(page, 'post title missing');
    for (const img of post.images) {
      const url = img.src.startsWith('/') ? img.src : post.path + img.src;
      if (!existsSync(join(WWW, url))) fail(page, `comic image ${url} not copied`);
    }
    for (const c of [...post.comments, ...post.pingbacks]) {
      if ((c.page || 1) === shownPage && !html.includes(`comment-${c.id}`)) fail(page, `comment ${c.id} missing`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`${pages.length} pages OK: known paths, plain HTML, no scripts, all local links resolve`);
