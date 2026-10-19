import { Component, h } from '@stencil/core';
import { home, posts } from '../../data/content';
import { ComicImage, ComicNav, PostBody } from './post-body';

/** Home: the newest comic, then the newest news posts. */
@Component({ tag: 'home-page', shadow: false })
export class HomePage {
  render() {
    const comic = posts[home.comic];
    return [
      <ComicImage post={comic} />,
      <div id="content" class="narrowcolumn">
        <ComicNav nav={comic.nav} />
        <PostBody post={comic} link commentLink />
        <div id="blogheader"></div>
        <div class="blogindex-head"></div>
        <div class="blogindex">
          {home.news.map(p => <PostBody post={posts[p]} link commentLink />)}
        </div>
        <div class="blogindex-foot"></div>
        <page-nav base="/" page={1} pages={home.pages} />
      </div>,
    ];
  }
}
