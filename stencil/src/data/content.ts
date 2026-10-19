// Typed access to the content data: ../content/ (one JSON file per post or
// page, plus site.json), gathered and expanded (URLs, navigation, listings,
// home pages, comment pages) into src/data/content.json by
// scripts/bundle-content.mjs at build time. Plus the date formats the old
// theme used.

import content from './content.json';

export interface Comment {
  id: number;
  author: string;
  /** "2009-09-27T20:26" */
  date: string;
  url?: string;
  /** Gravatar hash. */
  avatar?: string;
  text: string;
  /** Comment page (/comment-page-N/), only on posts with more than one. */
  page?: number;
}

export interface Pingback {
  id: number;
  title: string;
  url: string;
  date: string;
  page?: number;
}

export interface Nav {
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
}

export interface Post {
  path: string;
  /** Category slug of the post's folder. */
  series: string;
  title: string;
  author: string;
  /** "2008-10-02T00:00" */
  date: string;
  /** Category slugs, parent first. */
  categories: string[];
  tags: string[];
  /** Comic images: file names beside the post (or root-relative URLs). */
  images: string[];
  /** The images' alt/title text when it isn't the post title. */
  hoverText?: string;
  body?: string;
  comments: Comment[];
  pingbacks: Pingback[];
  commentPages: number;
  /** In a blog category (news, fan art): blog layout and navigation. */
  blog: boolean;
  nav: Nav;
}

export interface Page {
  path: string;
  title: string;
  body: string;
  comments: Comment[];
  pingbacks: Pingback[];
  commentPages: number;
}

export interface Listing {
  path: string;
  kind: 'category' | 'tag' | 'author';
  title: string;
  /** Post paths, newest first. */
  entries: string[];
}

export interface HomePage {
  path: string;
  comic?: string;
  blog: string[];
}

export interface Category {
  slug: string;
  name: string;
  parent?: string;
}

export interface Author {
  avatar: string;
  /** "2009-03-03" */
  registered: string;
  website: string;
}

const site: {
  title: string;
  categories: Category[];
  tags: Record<string, string>;
  authors: Record<string, Author>;
} = content.site as any;

export const SITE_TITLE = site.title;
export const PER_PAGE = 10;
export const categories = site.categories;
export const categoryName = (slug: string) => site.categories.find(c => c.slug === slug)?.name ?? slug;
export const tagName = (slug: string) => site.tags[slug] ?? slug;
export const authors = site.authors;

export const posts: Record<string, Post> = content.posts as any;
export const pages: Record<string, Page> = content.pages as any;
export const listings: Record<string, Listing> = content.listings as any;
export const homePages: HomePage[] = content.home as any;
export const latestComics: Post[] = content.latestComics.map(p => posts[p]);
export const emulsifierOnline: { path: string; title: string; intro: string; images: string[] } = content.emulsifierOnline;

/** The only page in the menu bar. */
export const menu = [{ title: 'About', href: '/about/' }];

/** URL of a post's comic image. */
export const imageUrl = (post: Post, src: string) => (src.startsWith('/') ? src : post.path + src);

export const gravatar = (hash: string) => `https://secure.gravatar.com/avatar/${hash}?s=64&d=identicon&r=r`;

// ---- dates, as the ComicPress theme printed them ----------------------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parts = (iso: string) => {
  const [y, mo, d, h = 0, mi = 0] = iso.split(/[-T:]/).map(Number);
  return { y, mo, d, h, mi, wd: DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()], month: MONTHS[mo - 1] };
};
const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const pad = (n: number) => String(n).padStart(2, '0');

/** "October 2, 2008" */
export const longDate = (iso: string) => {
  const p = parts(iso);
  return `${p.month} ${p.d}, ${p.y}`;
};
/** "8:26 pm" */
export const time = (iso: string) => {
  const p = parts(iso);
  return `${p.h % 12 || 12}:${pad(p.mi)} ${p.h < 12 ? 'am' : 'pm'}`;
};
/** "Mar 03, 2020" (series and tag listings) or "Mar 3, 2020" (author pages). */
export const shortDate = (iso: string, padDay = true) => {
  const p = parts(iso);
  return `${p.month.slice(0, 3)} ${padDay ? pad(p.d) : p.d}, ${p.y}`;
};
/** "Sunday, September 27th, 2009, 8:26 pm" (comment time tooltip) */
export const fullDate = (iso: string) => {
  const p = parts(iso);
  return `${p.wd}, ${p.month} ${ordinal(p.d)}, ${p.y}, ${time(iso)}`;
};
/** "Tuesday the 3rd of Mar, 2009" (author pages) */
export const registeredDate = (iso: string) => {
  const p = parts(iso);
  return `${p.wd} the ${ordinal(p.d)} of ${p.month.slice(0, 3)}, ${p.y}`;
};
