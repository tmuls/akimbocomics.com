import { Component, Prop, h } from '@stencil/core';
import { menu, SITE_TITLE } from '../../data/content';

/** The year the site was built: the copyright runs to the present. */
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * The ComicPress page frame every page shares: header image, menu bar,
 * sidebar and footer. The page's own content goes in the slot. Markup and
 * ids/classes match the old theme so akimbo.css applies unchanged.
 */
@Component({ tag: 'site-shell', shadow: false })
export class SiteShell {
  /** Menu bar arrows (previous/next comic), when the page has them. */
  @Prop() prev?: string;
  @Prop() next?: string;
  /** The page's own path, to mark its menu item current. */
  @Prop() path?: string;

  render() {
    return [
      <div id="page-head"></div>,
      <div id="page-wrap">
        <div id="page">
          <div id="header">
            <h1><a href="/">{SITE_TITLE}</a></h1>
            <div class="description"></div>
            <div class="clear"></div>
          </div>
          <div id="menubar-wrapper">
            <div class="menunav">
              {(this.prev || this.next) && [
                <div class="menunav-prev">{this.prev && <a href={this.prev} rel="prev">&lsaquo;</a>}</div>,
                <div class="menunav-next">{this.next && <a href={this.next} rel="next">&rsaquo;</a>}</div>,
              ]}
            </div>
            <div class="menu">
              <ul>
                {menu.map(l => (
                  <li class={`page_item${l.href === this.path ? ' current_page_item' : ''}`}>
                    <a href={l.href}>{l.title}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div class="clear"></div>
          </div>
          <div id="content-wrapper-head"></div>
          <div id="content-wrapper">
            <div id="subcontent-wrapper-head"></div>
            <div id="subcontent-wrapper">
              <div id="section-wrap">
                <slot />
                <div class="clear"></div>
              </div>
              <div id="sidebar-right">
                <div class="sidebar-head"></div>
                <div class="sidebar">
                  <latest-comics />
                  <category-list />
                </div>
                <div class="sidebar-foot"></div>
              </div>
              <div id="subcontent-wrapper-foot"></div>
              <div class="clear"></div>
            </div>
            <div class="clear"></div>
          </div>
          <div id="content-wrapper-foot"></div>
          <div id="footer">
            <p class="footer-text">
              &copy; 2000&ndash;{COPYRIGHT_YEAR} <a href="/">Akimbo Comics</a>{' '}
              <span class="footer-pipe">|</span> <a href="#page-head">Back to Top &uarr;</a>
            </p>
          </div>
        </div>
      </div>,
      <div id="page-foot"></div>,
    ];
  }
}
