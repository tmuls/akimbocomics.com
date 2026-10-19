import { Component, Prop, h } from '@stencil/core';
import { homePages, posts } from '../../data/content';
import { ComicImage, ComicNav, PostBody } from './post-body';

/** Home and /page/N/: the newest comic (page 1 only), then the blog index. */
@Component({ tag: 'home-page', shadow: false })
export class HomePage {
  @Prop() page = 1;

  render() {
    const hp = homePages[this.page - 1];
    const comic = hp.comic && posts[hp.comic];
    return [
      comic && <ComicImage post={comic} />,
      <div id="content" class="narrowcolumn">
        {comic && [<ComicNav nav={comic.nav} />, <PostBody post={comic} link commentLink />]}
        <div id="blogheader"></div>
        <div class="blogindex-head"></div>
        <div class="blogindex">
          {hp.blog.map(p => (
            <PostBody post={posts[p]} link blog commentLink />
          ))}
        </div>
        <div class="blogindex-foot"></div>
        <page-nav base="/" page={this.page} pages={homePages.length} />
      </div>,
    ];
  }
}
