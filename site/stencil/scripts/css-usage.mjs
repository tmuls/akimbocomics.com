// Which rules in src/css/akimbo.css apply to any generated page (www/)?
//
//   node scripts/css-usage.mjs           # report selectors nothing matches
//   node scripts/css-usage.mjs --write   # drop them from akimbo.css
//
// Each selector is tested (pseudo-classes and pseudo-elements stripped, so
// a:hover counts if there is an <a>) against every page with Stencil's
// mock-doc. A selector matching no element on any page styles nothing, so
// --write removes it, and removes a rule once none of its selectors are left
// (or it has no declarations), plus section comments left with no rules.
// Run after `npm run build`; only meaningful when www/ has every page.
import { createDocument } from '@stencil/core/mock-doc';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const CSS = new URL('../src/css/akimbo.css', import.meta.url).pathname;
const WWW = new URL('../www/', import.meta.url).pathname;

const pages = [];
const walk = dir => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html') pages.push(p);
  }
};
walk(WWW);
// Pages repeat the same frame; one document per distinct page is plenty.
const docs = [...new Set(pages.map(p => readFileSync(p, 'utf-8')))].map(html => createDocument(html));

// akimbo.css has no @-rules: it is comments and `selectors { declarations }`.
const css = readFileSync(CSS, 'utf-8');
const items = [];
const re = /\/\*[\s\S]*?\*\/|\s+|([^{}\s/][^{}]*)\{([^}]*)\}/g;
let m;
while ((m = re.exec(css))) {
  if (m[0].startsWith('/*')) items.push({ comment: m[0] });
  else if (m[1] !== undefined) items.push({ selectors: m[1].trim().split(/\s*,\s*/), body: m[2] });
  else if (m[0].trim()) throw new Error(`can't parse CSS near: ${m[0].slice(0, 60)}`);
}

const used = new Map();
const matches = sel => {
  if (!used.has(sel)) {
    const base = sel.replace(/::?[a-z-]+(\([^)]*\))?/gi, '').replace(/\s+([>+~])\s*$/, '').trim() || '*';
    let hit;
    try {
      hit = docs.some(d => d.querySelector(base));
    } catch {
      hit = true; // a selector mock-doc can't evaluate: keep it
    }
    used.set(sel, hit);
  }
  return used.get(sel);
};

const unused = [];
const kept = [];
for (const it of items) {
  if (it.comment) {
    kept.push(it);
    continue;
  }
  const live = it.selectors.filter(matches);
  unused.push(...it.selectors.filter(s => !matches(s)));
  if (live.length && it.body.trim()) kept.push({ ...it, selectors: live });
}

console.log(`${unused.length} of ${used.size} selectors match nothing on ${pages.length} pages`);
if (!process.argv.includes('--write')) {
  console.log(unused.join('\n'));
  process.exit(0);
}

// A comment directly followed by another comment (or the end) heads a
// section whose rules are all gone; keep the file's intro and the licence.
const out = kept.filter(
  (it, i) => !it.comment || i === 0 || /License/.test(it.comment) || (kept[i + 1] && !kept[i + 1].comment),
);
const text = out
  .map(it => (it.comment ? `\n${it.comment}\n` : `${it.selectors.join(',\n')} {${it.body.replace(/\s+$/, '\n')}}\n`))
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
writeFileSync(CSS, text + '\n');
console.log(`wrote ${CSS}: ${kept.filter(i => !i.comment).length} rules (was ${items.filter(i => !i.comment).length})`);
