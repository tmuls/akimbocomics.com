// Typed access to the content data (src/data/content.json).

import content from './content.json';

export interface Link {
  title: string;
  href: string;
  description?: string | null;
}

export interface Comment {
  id: string;
  author: string;
  url: string | null;
  avatar: string;
  time: string;
  timeTitle: string;
  html: string;
}

export interface Post {
  path: string;
  id: string;
  type: 'comic' | 'news';
  title: string;
  author: string;
  date: string;
  time: string;
  categories: Link[];
  tags: Link[];
  image: string | null;
  html: string;
  nav: { first?: string; previous?: string; next?: string; last?: string };
  comments: Comment[];
  commentsOpen: boolean;
}

export interface Listing {
  title: string;
  entries: { date: string; href: string; title: string }[];
}

export const SITE_TITLE = 'Akimbo Comics – Comics Everyone Can Hate';
export const PER_PAGE = 10;

export const sidebar: { latestComics: Link[]; categories: Link[] } = content.sidebar;
export const posts: Record<string, Post> = content.posts as any;
export const listings: Record<string, Listing> = content.listings;
export const home: { comic: string; news: string[]; pages: number } = content.home;
