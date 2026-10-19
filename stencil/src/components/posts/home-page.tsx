import { Component, Prop, h } from '@stencil/core';
import { homePages, posts } from '../../data/content';
import { ComicImage, ComicNav, PostBody } from './post-body';

/** Home and /page/N/: the newest comic (page 1 only), then the blog index. */
@Component({ tag: 'home-page', shadow: false })
export class HomePage {
  @Prop() page = 1;

  render() {
    const hp = homePages[this.page - 1];
    const comic = hp.items.find(i => i.role === 'comic');
    const blog = hp.items.filter(i => i.role === 'blog');
    return [
      comic && <ComicImage post={posts[comic.path]} />,
      <div id="content" class="narrowcolumn">
        {comic && [
          <ComicNav nav={hp.nav} />,
          <PostBody post={posts[comic.path]} link commentLink={comic.commentLink} />,
        ]}
        <div id="blogheader"></div>
        <div class="blogindex-head"></div>
        <div class="blogindex">
          {blog.map(i => {
            const post = posts[i.path];
            return <PostBody post={i.excerpt ? { ...post, html: i.excerpt } : post} link blog commentLink={i.commentLink} />;
          })}
        </div>
        <div class="blogindex-foot"></div>
        <page-nav base="/" page={this.page} pages={homePages.length} />
        <div id="sidebar-underblog" class="customsidebar"></div>
      </div>,
    ];
  }
}
