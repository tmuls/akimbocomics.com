import { Component, Prop, h } from '@stencil/core';
import { emulsifierOnline, homePages, listings, Nav, pages, posts, SITE_TITLE } from '../../data/content';

/**
 * Picks the page for the current path. The prerenderer loads every URL into
 * this one component, so this is the whole router; the output is plain HTML
 * at the same path (/<series>/<slug>/index.html, /<series>/page/N/, ...).
 */
@Component({ tag: 'akimbo-app', shadow: false })
export class AkimboApp {
  /** Path to render; defaults to the page's own location. */
  @Prop() path: string = typeof location !== 'undefined' ? location.pathname : '/';

  private page(path: string): { title: string; menu?: Nav; body: any } {
    let m = path.match(/^\/(?:page\/(\d+)\/)?$/);
    if (m) {
      const n = Number(m[1] || 1);
      if (n <= homePages.length) return { title: SITE_TITLE, menu: homePages[n - 1].menuNav, body: <home-page page={n} /> };
    }
    m = path.match(/^(\/[^/]+\/[^/]+\/)(?:comment-page-(\d+)\/)?$/);
    const post = m && posts[m[1]];
    if (post && (!m[2] || Number(m[2]) <= post.commentPages)) {
      const commentPage = m[2] ? Number(m[2]) : undefined;
      return {
        title: `${SITE_TITLE} - ${post.title}`,
        menu: post.menuNav,
        body: post.type === 'comic' ? <comic-post post={post} commentPage={commentPage} /> : <news-post post={post} commentPage={commentPage} />,
      };
    }
    if (pages[path]) {
      return { title: `${SITE_TITLE} - ${pages[path].title}`, menu: pages[path].menuNav, body: <wp-page page={pages[path]} /> };
    }
    m = path.match(/^(\/(?:[^/]+\/)?[^/]+\/)(?:page\/(\d+)\/)?$/);
    const listing = m && listings[m[1]];
    const n = m && m[2] ? Number(m[2]) : 1;
    if (listing && n <= listing.pages) {
      return {
        title: `${SITE_TITLE} - ${listing.title}`,
        body: listing.kind === 'author' ? <author-list listing={listing} page={n} /> : <post-list listing={listing} page={n} />,
      };
    }
    return { title: `${SITE_TITLE} - Page not found`, body: <h2 class="page-title">Page not found</h2> };
  }

  render() {
    const path = this.path.endsWith('/') ? this.path : this.path + '/';
    if (path === emulsifierOnline.path) {
      // A hand-made page outside the theme; prerender.config.ts strips the
      // stylesheet and body class for it.
      document.title = emulsifierOnline.title;
      document.body.setAttribute('data-bare', '');
      return <emulsifier-gallery />;
    }
    const { title, menu, body } = this.page(path);
    document.title = title;
    return (
      <site-shell prev={menu?.previous} next={menu?.next} path={path}>
        {body}
      </site-shell>
    );
  }
}
