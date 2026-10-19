import { Config } from '@stencil/core';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Every file in ../content that isn't data (comic images and images in post
// bodies beside each post.json, the emulsifier-online gallery) is copied to
// the same place in the output, so it keeps its URL: content/x/y/a.jpg is
// served at /x/y/a.jpg. ../static (images/, legacy/) is added to the served
// site by tools/build-site.py.
const CONTENT = '../content';
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(json|md)$/.test(f) ? [] : [relative(CONTENT, p)];
  });
// `src` is relative to srcDir (src/).
const images = files(CONTENT).map(f => ({ src: `../${CONTENT}/${f}`, dest: f, warn: true }));

export const config: Config = {
  namespace: 'akimbo',
  srcDir: 'src',
  outputTargets: [
    {
      type: 'www',
      dir: 'www',
      baseUrl: 'https://akimbocomics.com/',
      prerenderConfig: './prerender.config.ts',
      serviceWorker: null,
      empty: true,
      copy: [{ src: 'css/akimbo.css', dest: 'css/akimbo.css' }, ...images],
    },
  ],
};
