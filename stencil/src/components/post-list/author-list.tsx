import { Component, Prop, h } from '@stencil/core';
import { Listing, PER_PAGE } from '../../data/content';

/** An author page: ComicPress's user profile, then their posts, paged. */
@Component({ tag: 'author-list', shadow: false })
export class AuthorList {
  @Prop() listing!: Listing;
  @Prop() page = 1;

  render() {
    const { listing, page } = this;
    const rows = listing.entries.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    return (
      <div id="content" class="narrowcolumn">
        <div class="post uentry">
          <div class="post-head"></div>
          <div class="post-content">
            <div class="userpage-avatar">
              <img alt={listing.title} src={listing.profile.avatar} class="avatar avatar-64 photo" height="64" width="64" />
            </div>
            <div class="userpage-info">
              <div class="userpage-bio" innerHTML={listing.profile.html}></div>
            </div>
            <div class="clear"></div>
            <div class="userpage-posts">
              <h3>{listing.heading}</h3>
              <ol>
                <li>
                  <table class="month-table">
                    {rows.map(e => (
                      <tr>
                        <td class="archive-date" {...{ align: 'right' }}>{e.date}</td>
                        <td class="archive-title"><a href={e.href}>{e.title}</a></td>
                      </tr>
                    ))}
                  </table>
                </li>
              </ol>
              <page-nav base={listing.path} page={page} pages={listing.pages} />
            </div>
          </div>
          <div class="post-foot"></div>
        </div>
      </div>
    );
  }
}
