import { Config } from '@stencil/core';
import { existsSync, readdirSync, readFileSync } from 'fs';

// Content data from ../content, bundled by scripts/bundle-content.mjs.
const content = JSON.parse(readFileSync('src/data/content.json', 'utf-8'));

// Images keep their current URLs: every file beside a post's index.html
// (its comic, images in its body; extract-content.py checks the data names
// each one).
const siteFile = (path: string) => ({ src: `../../site${path}`, dest: path.slice(1), warn: true });
const images = Object.keys(content.posts)
  .filter(path => existsSync(`../site${path}`)) // news posts without images have no folder
  .flatMap(path => readdirSync(`../site${path}`).map(f => siteFile(path + f)));
const gallery = content.emulsifierOnline;
const galleryImages = gallery.images.map((i: any) => siteFile(gallery.path + i.file));
// The only image akimbo.css uses; the old theme's other files stay served
// as they are.
const themeImages = ['/wp-content/uploads/2013/05/header1.jpg'].map(siteFile);

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
      copy: [{ src: 'css/akimbo.css', dest: 'css/akimbo.css' }, ...images, ...galleryImages, ...themeImages],
    },
  ],
};
