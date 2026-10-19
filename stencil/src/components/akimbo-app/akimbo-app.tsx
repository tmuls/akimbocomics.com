import { Component, Prop, h } from '@stencil/core';
import { home, listings, posts, PER_PAGE, SITE_TITLE } from '../../data/content';

/**
 * Picks the page for the current path. The prerenderer loads every URL into
 * this one component, so this is the whole router; the output is plain HTML
 * at the same path (/<series>/<slug>/index.html, /<series>/page/N/, ...).
 */
@Component({ tag: 'akimbo-app', shadow: false })
export class AkimboApp {
  /** Path to render; defaults to the page's own location. */
  @Prop() path: string = typeof location !== 'undefined' ? location.pathname : '/';

  private page() {
    const path = this.path.endsWith('/') ? this.path : this.path + '/';
    const post = posts[path];
    if (path === '/') {
      return { title: SITE_TITLE, menu: posts[home.comic].nav, body: <home-page /> };
    }
    if (post) {
      return {
        title: `${SITE_TITLE} - ${post.title}`,
        menu: post.type === 'comic' ? post.nav : {},
        body: post.type === 'comic' ? <comic-post post={post} /> : <news-post post={post} />,
      };
    }
    const m = path.match(/^(\/[^/]+\/)(?:page\/(\d+)\/)?$/);
    const listing = m && listings[m[1]];
    const n = m && m[2] ? Number(m[2]) : 1;
    if (listing && n <= Math.ceil(listing.entries.length / PER_PAGE)) {
      return {
        title: `${SITE_TITLE} - ${listing.title}`,
        menu: {},
        body: <post-list heading={`Archive for ‘${listing.title}’`} entries={listing.entries} base={m[1]} page={n} />,
      };
    }
    return { title: `${SITE_TITLE} - Page not found`, menu: {}, body: <h2 class="page-title">Page not found</h2> };
  }

  render() {
    const { title, menu, body } = this.page();
    document.title = title;
    return (
      <site-shell prev={menu.previous} next={menu.next}>
        {body}
      </site-shell>
    );
  }
}
