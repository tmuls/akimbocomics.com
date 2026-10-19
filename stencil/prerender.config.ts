import { PrerenderConfig } from '@stencil/core';
import { readFileSync } from 'fs';

const content = JSON.parse(readFileSync('src/data/content.json', 'utf-8'));

export const config: PrerenderConfig = {
  // Chosen in scripts/bundle-content.mjs (still the spike's pages).
  entryUrls: content.render,
  // Only what's listed: the spike's data doesn't cover every linked page.
  crawlUrls: false,
  // Plain HTML: no Stencil runtime, no custom-element scripts.
  staticSite: true,
  trailingSlash: true,
  canonicalUrl: url => `https://akimbocomics.com${url.pathname}`,
  hydrateOptions: () => ({
    // Keep the one shared stylesheet as a <link>, not inlined per page.
    inlineExternalStyleSheets: false,
    removeHtmlComments: true,
    removeUnusedStyles: false,
    // Keep image/CSS URLs exactly as written (no ?v=hash).
    hashAssets: null,
  }),
  afterHydrate: document => {
    // Unwrap our components' host elements so the page is the old theme's
    // markup exactly, with no custom elements left in it.
    for (const host of Array.from(document.querySelectorAll('*')).reverse()) {
      if (!host.tagName.includes('-')) continue;
      while (host.firstChild) host.parentNode.insertBefore(host.firstChild, host);
      host.parentNode.removeChild(host);
    }
    document.documentElement.removeAttribute('class');
    document.documentElement.removeAttribute('data-stencil-build');
  },
};
