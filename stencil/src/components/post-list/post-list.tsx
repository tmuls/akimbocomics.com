import { Component, Prop, h } from '@stencil/core';
import { Listing, PER_PAGE, posts, shortDate } from '../../data/content';

/** A series (category) or tag archive page: one table row per post, paged. */
@Component({ tag: 'post-list', shadow: false })
export class PostList {
  @Prop() listing!: Listing;
  @Prop() page = 1;

  render() {
    const { listing, page } = this;
    const n = listing.entries.length;
    const rows = listing.entries.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(p => posts[p]);
    return (
      <div id="content" class="narrowcolumn">
        <h2 class="page-title">{listing.kind === 'tag' ? 'Posts Tagged' : 'Archive for'} &lsquo;{listing.title}&rsquo;</h2>
        <div class="archiveresults">{n} {n === 1 ? 'result' : 'results'}.</div>
        <div class="clear"></div>
        <div class="post uentry">
          <div class="post-head"></div>
          <div class="entry">
            <table class="archive-table">
              {rows.map(p => (
                <tr>
                  <td class="archive-date">{shortDate(p.date)}</td>
                  <td class="archive-title">
                    <a href={p.path} rel="bookmark">{p.title}</a>
                  </td>
                </tr>
              ))}
            </table>
          </div>
          <div class="post-foot"></div>
        </div>
        <div class="clear"></div>
        <page-nav base={listing.path} page={page} pages={Math.ceil(n / PER_PAGE)} />
      </div>
    );
  }
}
