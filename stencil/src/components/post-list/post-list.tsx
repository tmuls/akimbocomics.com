import { Component, Prop, h } from '@stencil/core';
import { Listing, PER_PAGE } from '../../data/content';

/** A series/tag/author archive page: one table row per post, paged. */
@Component({ tag: 'post-list', shadow: false })
export class PostList {
  @Prop() heading!: string;
  @Prop() entries: Listing['entries'] = [];
  /** The listing's first-page URL, e.g. /eatshitanddie/. */
  @Prop() base!: string;
  @Prop() page = 1;

  render() {
    const rows = this.entries.slice((this.page - 1) * PER_PAGE, this.page * PER_PAGE);
    return (
      <div id="content" class="narrowcolumn">
        <h2 class="page-title">{this.heading}</h2>
        <div class="archiveresults">{this.entries.length} results.</div>
        <div class="clear"></div>
        <div class="post uentry">
          <div class="post-head"></div>
          <div class="entry">
            <table class="archive-table">
              {rows.map(e => (
                <tr>
                  <td class="archive-date">{e.date}</td>
                  <td class="archive-title">
                    <a href={e.href} rel="bookmark" title={`Permanent Link: ${e.title}`}>{e.title}</a>
                  </td>
                </tr>
              ))}
            </table>
          </div>
          <div class="post-foot"></div>
        </div>
        <div class="clear"></div>
        <page-nav base={this.base} page={this.page} pages={Math.ceil(this.entries.length / PER_PAGE)} />
      </div>
    );
  }
}
