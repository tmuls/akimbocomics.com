import { h } from '@stencil/core';
import { Post } from '../../data/content';

/**
 * One post's title block, entry and tags, as the ComicPress theme laid it
 * out. A functional component: it adds no element of its own, so the old
 * CSS selectors still match.
 */
export const PostBody = ({ post, link, commentLink }: { post: Post; link?: boolean; commentLink?: boolean }) => (
  <div class={`post-${post.id} post uentry post-${post.type === 'comic' ? 'comic' : 'blog'}`}>
    <div class="post-head"></div>
    <div class="post-content">
      <div class="post-info">
        <div class="post-text">
          <h2 class="post-title">{link ? <a href={post.path}>{post.title}</a> : post.title}</h2>
          <span class="post-author">by <a href={`/author/${post.author}/`}>{post.author}</a></span>{' '}
          <span class="posted-on">on&nbsp;</span><span class="post-date">{post.date}</span>{' '}
          <span class="posted-at">at&nbsp;</span><span class="post-time">{post.time}</span>
          {post.type === 'comic' ? (
            <ul class="storyline-cats">
              {post.categories.map(c => (
                <li class="storyline-root"><a href={c.href} rel="category tag">{c.title}</a></li>
              ))}
            </ul>
          ) : (
            <div class="post-cat">
              Posted In: {post.categories.map(c => <a href={c.href} rel="category tag">{c.title}</a>)}
            </div>
          )}
        </div>
      </div>
      <div class="clear"></div>
      <div class="entry" innerHTML={`${post.html}<div class="clear"></div>`}></div>
      <div class="clear"></div>
      <div class="post-extras">
        <div class="post-tags">
          {post.tags.length > 0 && [
            '└ Tags: ',
            post.tags.map((t, i) => [i > 0 && ', ', <a href={t.href} rel="tag">{t.title}</a>]),
            <br />,
          ]}
        </div>
        {commentLink && post.commentsOpen && (
          <div class="comment-link">
            <a href={`${post.path}#respond`}>
              <span class="comment-balloon comment-balloon-empty">&nbsp;</span> Comment{' '}
            </a>
          </div>
        )}
        <div class="clear"></div>
      </div>
    </div>
    <div class="post-foot"></div>
  </div>
);

/** The comic image, in the theme's comic-wrap frame. */
export const ComicImage = ({ post }: { post: Post }) => (
  <div id="comic-wrap" class={`comic-id-${post.id}`}>
    <div id="comic-head"></div>
    <div class="clear"></div>
    <div id="comic">
      <div id="comic-1" class="comicpane">
        <img src={post.image} alt={post.title} title={post.title} />
      </div>
    </div>
    <div class="clear"></div>
    <div id="comic-foot"></div>
  </div>
);

/** First/previous/next/last comic links. */
export const ComicNav = ({ nav }: { nav: Post['nav'] }) => [
  <div class="nav">
    {nav.first && <div class="nav-first"><a href={nav.first}>&lsaquo;&lsaquo; First</a></div>}
    <div class="nav-previous">{nav.previous && <a href={nav.previous} rel="prev">&lsaquo; Previous</a>}</div>
    <div class="nav-next">{nav.next && <a href={nav.next} rel="next">Next &rsaquo;</a>}</div>
    {nav.last && <div class="nav-last"><a href={nav.last}>Last &rsaquo;&rsaquo;</a></div>}
  </div>,
  <div class="clear"></div>,
];
