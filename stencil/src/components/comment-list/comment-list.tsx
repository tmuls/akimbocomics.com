import { Component, Prop, h } from '@stencil/core';
import { Comment, Post } from '../../data/content';

/**
 * Existing comments and pingbacks, read-only; commenting is closed. Two
 * posts have paged comments: `page` picks which /comment-page-N/ to show
 * (the post's own URL shows the last one, as WordPress did).
 */
@Component({ tag: 'comment-list', shadow: false })
export class CommentList {
  @Prop() post!: Pick<Post, 'path' | 'comments' | 'pingbacks' | 'commentsOpen'> & { commentPages?: number };
  @Prop() page?: number;

  private item(c: Comment, i: number, kind: 'comment' | 'pingback') {
    const parity = i % 2 ? 'odd alt thread-odd thread-alt' : 'even thread-even';
    const by = c.byAuthor ? ` byuser comment-author-${c.byAuthor}` : '';
    const avatar = c.avatar && <img alt={c.author} src={c.avatar} class="avatar avatar-64 photo" height="64" width="64" />;
    return (
      <li id={`comment-${c.id}`} class={`${kind}${by} ${parity} depth-1`}>
        {avatar && (
          <div class="comment-avatar">
            {c.url ? <a href={c.url} rel="external nofollow" title={c.author}>{avatar}</a> : avatar}
          </div>
        )}
        <div class="comment-content">
          <div class="comment-author vcard">
            {c.url ? (
              <cite title={c.url}><a href={c.url} title={c.author} class="external nofollow">{c.author}</a></cite>
            ) : (
              <cite>{c.author}</cite>
            )}
          </div>
          <div class="comment-meta-data">
            <span class="comment-time" title={c.timeTitle}>{c.time}</span>{' '}
            <span class="comment-permalink">
              <span class="separator">|</span> <a href={`#comment-${c.id}`} title="Permalink to comment">#</a>
            </span>
          </div>
          {kind === 'comment' && <div class="comment-text" innerHTML={c.html}></div>}
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
            {page > 1 && <li><a class="prev page-numbers" href={href(page - 1)}>&laquo; Previous</a></li>}
            {Array.from({ length: pages }, (_, i) => i + 1).map(n =>
              n === page ? <li class="page-numbers current">{n}</li> : <li><a class="page-numbers" href={href(n)}>{n}</a></li>,
            )}
            {page < pages && <li><a class="next page-numbers" href={href(page + 1)}>Next &raquo;</a></li>}
          </ul>
        </div>
        <div class="clear"></div>
      </div>
    );
  }

  render() {
    const { comments, pingbacks, commentsOpen } = this.post;
    const pages = this.post.commentPages || 1;
    const page = this.page || pages;
    const onPage = (list: Comment[]) => (pages > 1 ? list.filter(c => c.page === page) : list);
    const shown = onPage(comments);
    const pings = onPage(pingbacks);
    const total = comments.length + pingbacks.length;
    return [
      <div id="comment-wrapper-head"></div>,
      <div id="comment-wrapper">
        {comments.length > 0 && [
          // ComicPress drops the number when there's just one.
          <h3 id="comments">Discussion {total > 1 && `(${total}) `}&not;</h3>,
          <ol class="commentlist">{shown.map((c, i) => this.item(c, i, 'comment'))}</ol>,
        ]}
        {pings.length > 0 && (
          <div id="pingtrackback-wrap">
            <h3 id="pingtrackback">Pings &amp; Trackbacks &not;</h3>
            <ol class="commentlist">
              <li>
                <ul>{pings.map((c, i) => this.item(c, i, 'pingback'))}</ul>
              </li>
            </ol>
          </div>
        )}
        {pages > 1 && this.pager(page, pages)}
        {commentsOpen ? (
          <div class="comment-wrapper-respond">
            <div id="respond" class="comment-respond">
              <h3 id="reply-title" class="comment-reply-title">Comment &not;</h3>
              <p class="must-log-in">Comments are closed.</p>
            </div>
            <div class="clear"></div>
          </div>
        ) : (
          <p class="nocomments">Comments are closed.</p>
        )}
      </div>,
      <div id="comment-wrapper-foot"></div>,
    ];
  }
}
