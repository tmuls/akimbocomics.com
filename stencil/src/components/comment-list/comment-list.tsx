import { Component, Prop, h } from '@stencil/core';
import { Comment } from '../../data/content';

/** Existing comments, read-only; commenting is closed. */
@Component({ tag: 'comment-list', shadow: false })
export class CommentList {
  @Prop() comments: Comment[] = [];
  /** Whether the post still showed WordPress's (login-only) comment box. */
  @Prop() open = false;

  render() {
    const n = this.comments.length;
    return [
      <div id="comment-wrapper-head"></div>,
      <div id="comment-wrapper">
        {n > 0 && [
          <h3 id="comments">Discussion ({n}) &not;</h3>,
          <ol class="commentlist">
            {this.comments.map((c, i) => (
              <li id={`comment-${c.id}`} class={`comment depth-1 ${i % 2 ? 'odd alt' : 'even'}`}>
                <div class="comment-avatar">
                  <img alt={c.author} src={c.avatar} class="avatar avatar-64 photo" height="64" width="64" />
                </div>
                <div class="comment-content">
                  <div class="comment-author vcard">
                    <cite>{c.url ? <a href={c.url} class="external nofollow">{c.author}</a> : c.author}</cite>
                  </div>
                  <div class="comment-meta-data">
                    <span class="comment-time" title={c.timeTitle}>{c.time}</span>{' '}
                    <span class="comment-permalink">
                      <span class="separator">|</span> <a href={`#comment-${c.id}`} title="Permalink to comment">#</a>
                    </span>
                  </div>
                  <div class="comment-text" innerHTML={c.html}></div>
                </div>
                <div class="clear"></div>
              </li>
            ))}
          </ol>,
        ]}
        {!this.open && <p class="nocomments">Comments are closed.</p>}
        {this.open && <div class="comment-wrapper-respond">
          <div id="respond" class="comment-respond">
            <h3 id="reply-title" class="comment-reply-title">Comment &not;</h3>
            <p class="must-log-in">Comments are closed.</p>
          </div>
          <div class="clear"></div>
        </div>}
      </div>,
      <div id="comment-wrapper-foot"></div>,
    ];
  }
}
