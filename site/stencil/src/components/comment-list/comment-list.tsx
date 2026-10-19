import { Component, Prop, h } from '@stencil/core';
import { Comment, fullDate, gravatar, longDate, Page, Pingback, Post, time } from '../../data/content';

/**
 * Existing comments and pingbacks, read-only; commenting is closed. Two
 * posts have paged comments: `page` picks which /comment-page-N/ to show
 * (the post's own URL shows the last one, as WordPress did).
 */
@Component({ tag: 'comment-list', shadow: false })
export class CommentList {
  @Prop() post!: Post | Page;
  @Prop() page?: number;

  private meta(c: { id: number; date: string }) {
    return (
      <div class="comment-meta-data">
        <span class="comment-time" title={fullDate(c.date)}>{longDate(c.date)} at {time(c.date)}</span>{' '}
        <span class="comment-permalink">
          <span class="separator">|</span> <a href={`#comment-${c.id}`} title="Permalink to comment">#</a>
        </span>
      </div>
    );
  }

  private comment(c: Comment, i: number) {
    const avatar = c.avatar && <img alt={c.author} src={gravatar(c.avatar)} class="avatar avatar-64 photo" height="64" width="64" />;
    return (
      <li id={`comment-${c.id}`} class={`comment ${i % 2 ? 'odd' : 'even'}`}>
        {avatar && (
          <div class="comment-avatar">{c.url ? <a href={c.url} rel="external nofollow" title={c.author}>{avatar}</a> : avatar}</div>
        )}
        <div class="comment-content">
          <div class="comment-author vcard">
            <cite>{c.url ? <a href={c.url} class="external nofollow">{c.author}</a> : c.author}</cite>
          </div>
          {this.meta(c)}
          <div class="comment-text" innerHTML={c.text}></div>
        </div>
        <div class="clear"></div>
      </li>
    );
  }

  private pingback(p: Pingback) {
    return (
      <li id={`comment-${p.id}`} class="pingback">
        <div class="comment-content">
          <div class="comment-author vcard">
            <cite><a href={p.url} class="external nofollow">{p.title}</a></cite>
          </div>
          {this.meta(p)}
        </div>
        <div class="clear"></div>
      </li>
    );
  }

  private pager(page: number, pages: number) {
    const href = (n: number) => `${this.post.path}comment-page-${n}/#comments`;
    return (
      <div id="wp-paginav">
        <div id="paginav">
          <ul>
            <li class="paginav-extend">Comment Pages</li>
            {page > 1 && <li><a href={href(page - 1)}>&laquo; Previous</a></li>}
            {Array.from({ length: pages }, (_, i) => i + 1).map(n =>
              n === page ? <li class="current">{n}</li> : <li><a href={href(n)}>{n}</a></li>,
            )}
            {page < pages && <li><a href={href(page + 1)}>Next &raquo;</a></li>}
          </ul>
        </div>
        <div class="clear"></div>
      </div>
    );
  }

  render() {
    const { comments, pingbacks, commentPages: pages } = this.post;
    const page = this.page || pages;
    const onPage = <T extends { page?: number }>(list: T[]) => (pages > 1 ? list.filter(c => c.page === page) : list);
    const total = comments.length + pingbacks.length;
    const pings = onPage(pingbacks);
    return [
      <div id="comment-wrapper-head"></div>,
      <div id="comment-wrapper">
        {comments.length > 0 && [
          // ComicPress drops the number when there's just one.
          <h3 id="comments">Discussion {total > 1 && `(${total}) `}&not;</h3>,
          <ol class="commentlist">{onPage(comments).map((c, i) => this.comment(c, i))}</ol>,
        ]}
        {pings.length > 0 && (
          <div id="pingtrackback-wrap">
            <h3 id="pingtrackback">Pings &amp; Trackbacks &not;</h3>
            <ol class="commentlist">
              <li>
                <ul>{pings.map(p => this.pingback(p))}</ul>
              </li>
            </ol>
          </div>
        )}
        {pages > 1 && this.pager(page, pages)}
        <div class="comment-wrapper-respond">
          <div id="respond" class="comment-respond">
            <h3 id="reply-title" class="comment-reply-title">Comment &not;</h3>
            <p class="must-log-in">Comments are closed.</p>
          </div>
          <div class="clear"></div>
        </div>
      </div>,
      <div id="comment-wrapper-foot"></div>,
    ];
  }
}
