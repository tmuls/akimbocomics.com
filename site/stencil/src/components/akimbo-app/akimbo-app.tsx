import { Component, Prop, h } from '@stencil/core';
import { emulsifierOnline, homePages, listings, Nav, pages, PER_PAGE, posts, SITE_TITLE } from '../../data/content';

/**
 * Picks the page for the current path. The prerenderer loads every URL into
 * this one component, so this is the whole router; the output is plain HTML
 * at the same path (/<series>/<slug>/index.html, /tag/<t>/page/N/, ...).
 */
@Component({ tag: 'akimbo-app', shadow: false })
export class AkimboApp {
  /** Path to render; defaults to the page's own location. */
  @Prop() path: string = typeof location !== 'undefined' ? location.pathname : '/';

  private page(path: string): { title: string; menu?: Nav; body: any } {
    let m = path.match(/^\/(?:page\/(\d+)\/)?$/);
    if (m) {
      const n = Number(m[1] || 1);
      // The menu bar arrows follow the newest comic's previous/next.
      if (n <= homePages.length) return { title: SITE_TITLE, menu: posts[homePages[0].comic].nav, body: <home-page page={n} /> };
    }
    m = path.match(/^(\/[^/]+\/[^/]+\/)(?:comment-page-(\d+)\/)?$/);
    const post = m && posts[m[1]];
    if (post && (!m[2] || Number(m[2]) <= post.commentPages)) {
      const commentPage = m[2] ? Number(m[2]) : undefined;
      return {
        title: `${SITE_TITLE} - ${post.title}`,
        menu: post.blog ? undefined : post.nav,
        body: post.blog ? <news-post post={post} commentPage={commentPage} /> : <comic-post post={post} commentPage={commentPage} />,
      };
    }
    if (pages[path]) {
      return { title: `${SITE_TITLE} - ${pages[path].title}`, body: <wp-page page={pages[path]} /> };
    }
    m = path.match(/^(\/(?:[^/]+\/)?[^/]+\/)(?:page\/(\d+)\/)?$/);
    const listing = m && listings[m[1]];
    const n = m && m[2] ? Number(m[2]) : 1;
    const listingPages = listing && (listing.kind === 'category' ? 1 : Math.max(1, Math.ceil(listing.entries.length / PER_PAGE)));
    if (listing && n <= listingPages) {
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
