import { Config } from '@stencil/core';
import { readFileSync } from 'fs';

// Content extracted from ../site by scripts/spike-extract.py.
const content = JSON.parse(readFileSync('src/data/content.json', 'utf-8'));

// Images keep their current URLs: each comic sits beside its post's
// index.html, and the theme images stay where WordPress put them.
const siteFile = (path: string) => ({ src: `../../site${path}`, dest: path.slice(1), warn: true });
const images = Object.values<any>(content.posts)
  .filter(p => p.image)
  .map(p => siteFile(p.image));
const themeImages = [
  '/wp-content/uploads/2013/05/header1.jpg',
  '/wp-content/themes/comicpress-master/images/bubble.png',
  '/wp-content/themes/comicpress-master/images/buythis.png',
  '/wp-content/themes/comicpress-master/images/calendar.png',
  '/wp-content/themes/comicpress-master/images/comicpress-rascal.png',
  '/wp-content/themes/comicpress-master/images/nav/default/sharebox.png',
].map(siteFile);

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
      copy: [{ src: 'css/akimbo.css', dest: 'css/akimbo.css' }, ...images, ...themeImages],
    },
  ],
};
