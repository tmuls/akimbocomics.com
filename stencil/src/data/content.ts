// Typed access to the content data: ../content/ (committed, one JSON file
// per post/page/listing), gathered into src/data/content.json by
// scripts/bundle-content.mjs at build time.

import content from './content.json';

export interface Link {
  title: string;
  href: string;
  description?: string;
  id?: number;
}

export interface Comment {
  id: number;
  author: string;
  url: string | null;
  avatar: string | null;
  time: string;
  timeTitle: string;
  html: string;
  /** Set when the comic's author wrote it (WordPress comment-author-<name>). */
  byAuthor?: string;
  /** Comment page (/comment-page-N/) for the two posts with paged comments. */
  page?: number;
}

export interface ComicImage {
  /** File name beside the post's index.html, or a root-relative URL. */
  src: string;
  alt: string;
  title: string;
}

export interface Head {
  title: string;
  bodyClass: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface Nav {
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
}

export interface Post {
  path: string;
  series: string;
  slug: string;
  id: number;
  type: 'comic' | 'news';
  title: string;
  author: string;
  date: string;
  time: string;
  datetime: string;
  categories: Link[];
  tags: Link[];
  images: ComicImage[];
  html: string;
  postClass: string;
  nav: Nav;
  menuNav: Nav;
  /** The "Discussion (N)" count; null when the page had no such heading. */
  commentCount: number | null;
  commentsOpen: boolean;
  commentPages: number;
  comments: Comment[];
  pingbacks: Comment[];
  head: Head;
}

export interface Listing {
  path: string;
  kind: 'category' | 'tag' | 'author';
  heading: string;
  title: string;
  pages: number;
  entries: { date: string; href: string; title: string }[];
  head: Head;
  profile?: { avatar: string; html: string };
}

export interface HomePage {
  path: string;
  items: { path: string; role: 'comic' | 'blog'; commentLink?: string; excerpt?: string }[];
  nav: Nav;
  menuNav: Nav;
  head: Head;
}

interface Widget {
  id: string;
  class: string;
  title: string;
  items: Link[];
}

const site: { title: string; menu: Link[]; sidebar: Widget[]; listingPerPage: number } = content.site as any;
const widget = (id: string) => site.sidebar.find(w => w.id === id).items;
const homePages: HomePage[] = content.home.pages as any;

export const SITE_TITLE = site.title;
export const PER_PAGE = site.listingPerPage;

export const sidebar: { latestComics: Link[]; categories: Link[] } = {
  latestComics: widget('comicpress_latest_comics_widget-2'),
  categories: widget('categories-447715191'),
};
export const posts: Record<string, Post> = content.posts as any;
export const listings: Record<string, Listing> = content.listings as any;
export const home: { comic: string; news: string[]; pages: number } = {
  comic: homePages[0].items.find(i => i.role === 'comic').path,
  news: homePages[0].items.filter(i => i.role === 'blog').map(i => i.path),
  pages: homePages.length,
};

/** URL of a post's comic image. */
export const imageUrl = (post: Post, img: ComicImage) => (img.src.startsWith('/') ? img.src : post.path + img.src);
