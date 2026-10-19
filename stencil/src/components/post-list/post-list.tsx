import { Component, Prop, h } from '@stencil/core';
import { Listing, PER_PAGE } from '../../data/content';

/** A series (category) or tag archive page: one table row per post, paged. */
@Component({ tag: 'post-list', shadow: false })
export class PostList {
  @Prop() listing!: Listing;
  @Prop() page = 1;

  render() {
    const { listing, page } = this;
    const rows = listing.entries.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    return (
      <div id="content" class="narrowcolumn">
        <h2 class="page-title">{listing.heading}</h2>
        <div class="archiveresults">{listing.entries.length} {listing.entries.length === 1 ? 'result' : 'results'}.</div>
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
        <page-nav base={listing.path} page={page} pages={listing.pages} />
      </div>
    );
  }
}
