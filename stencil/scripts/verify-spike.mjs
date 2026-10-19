// Milestone 0 checks on the prerendered output (www/), run after a build:
//
//   npm run build && npm run verify
//
// - every page is at a URL the site already serves (known-urls.txt), as
//   <path>/index.html, with its comic image beside it;
// - pages are plain HTML: no <script>, no custom elements, content present
//   (so they render fully with JavaScript disabled);
// - every local link/image in them resolves, either in www/ or in ../site/
//   (pages the spike doesn't render yet, which production still serves).
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const WWW = new URL('../www/', import.meta.url).pathname;
const SITE = new URL('../../site/', import.meta.url).pathname;
const known = new Set(
  readFileSync(new URL('../../known-urls.txt', import.meta.url), 'utf-8').split('\n').filter(l => l && !l.startsWith('#')),
);
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
  return [WWW, SITE].some(root => existsSync(join(root, file)));
};

for (const page of pages) {
  const html = readFileSync(join(WWW, page, 'index.html'), 'utf-8');
  if (!known.has(page)) fail(page, 'not a URL the site already serves');
  if (/<script\b/i.test(html)) fail(page, 'has a <script>');
  const custom = html.match(/<([a-z]+-[a-z-]+)[\s>]/);
  if (custom) fail(page, `custom element <${custom[1]}> left in output`);
  for (const id of ['header', 'menubar-wrapper', 'sidebar-right', 'footer', 'content']) {
    if (!html.includes(`id=${id}`) && !html.includes(`id="${id}"`)) fail(page, `missing #${id}`);
  }
  if (!html.includes('Latest Comics') || !html.includes('Categories')) fail(page, 'sidebar widgets missing');
  for (const [, url] of html.matchAll(/\b(?:href|src)="?(\/[^"\s>]*)/g)) {
    if (!url.startsWith('//') && !exists(url)) fail(page, `broken local link ${url}`);
  }
  const post = content.posts[page];
  if (post) {
    if (!html.includes(post.title.replace(/&/g, '&amp;'))) fail(page, 'post title missing');
    if (post.image && !existsSync(join(WWW, post.image))) fail(page, `comic image ${post.image} not beside index.html`);
    for (const c of post.comments) if (!html.includes(`comment-${c.id}`)) fail(page, `comment ${c.id} missing`);
  }
}

for (const want of ['/', '/eatshitanddie/', '/eatshitanddie/page/2/', '/eatshitanddie/eat-shit-die-309/']) {
  if (!pages.includes(want)) fail(want, 'not generated');
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`${pages.length} pages OK: known paths, plain HTML, no scripts, all local links resolve`);
