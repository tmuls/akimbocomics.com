import { Component, Prop, h } from '@stencil/core';
import { Page } from '../../data/content';

/** A WordPress page (only /about/): title, body, comments. */
@Component({ tag: 'wp-page', shadow: false })
export class WpPage {
  @Prop() page!: Page;

  render() {
    const { page } = this;
    return (
      <div id="content" class="narrowcolumn">
        <div class="post page uentry">
          <div class="post-head"></div>
          <div class="post-content">
            <div class="post-info">
              <div class="post-text">
                <h2 class="page-title">{page.title}</h2>
              </div>
            </div>
            <div class="clear"></div>
            <div class="entry" innerHTML={`${page.body}<div class="clear"></div>`}></div>
          </div>
          <div class="post-foot"></div>
        </div>
        <comment-list post={page} />
      </div>
    );
  }
}
