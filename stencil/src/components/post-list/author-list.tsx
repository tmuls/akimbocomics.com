import { Component, Prop, h } from '@stencil/core';
import { authors, gravatar, Listing, PER_PAGE, posts, registeredDate, shortDate } from '../../data/content';

/** An author page: ComicPress's user profile, then their posts, paged. */
@Component({ tag: 'author-list', shadow: false })
export class AuthorList {
  @Prop() listing!: Listing;
  @Prop() page = 1;

  render() {
    const { listing, page } = this;
    const author = authors[listing.title];
    const rows = listing.entries.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(p => posts[p]);
    return (
      <div id="content" class="narrowcolumn">
        <div class="post uentry">
          <div class="post-head"></div>
          <div class="post-content">
            <div class="userpage-avatar">
              <img alt={listing.title} src={gravatar(author.avatar)} class="avatar avatar-64 photo" height="64" width="64" />
            </div>
            <div class="userpage-info">
              <div class="userpage-bio">
                <cite>{listing.title}</cite>
                <br />
                Registered on {registeredDate(author.registered)}
                <br />
                <br />
                Website: <a href={author.website}>{author.website}</a>
                <br />
              </div>
            </div>
            <div class="clear"></div>
            <div class="userpage-posts">
              <h3>Posts by {listing.title} ({listing.entries.length}) &not;</h3>
              <ol>
                <li>
                  <table class="month-table">
                    {rows.map(p => (
                      <tr>
                        <td class="archive-date">{shortDate(p.date, false)}</td>
                        <td class="archive-title"><a href={p.path}>{p.title}</a></td>
                      </tr>
                    ))}
                  </table>
                </li>
              </ol>
              <page-nav base={listing.path} page={page} pages={Math.ceil(listing.entries.length / PER_PAGE)} />
            </div>
          </div>
          <div class="post-foot"></div>
        </div>
      </div>
    );
  }
}
