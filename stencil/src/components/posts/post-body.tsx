import { h } from '@stencil/core';
import { imageUrl, Nav, Post } from '../../data/content';

/**
 * One post's title block, entry and tags, as the ComicPress theme laid it
 * out. A functional component: it adds no element of its own, so the old
 * CSS selectors still match.
 *
 * `blog` lays it out as a blog post (category as "Posted In:"), the way
 * news posts and every post in the home page's blog index look; otherwise
 * as a comic (storyline category list). `commentLink` is the home page's
 * "Comment" / "N Comments" link text.
 */
export const PostBody = ({ post, link, blog, commentLink }: { post: Post; link?: boolean; blog?: boolean; commentLink?: string }) => {
  const count = commentLink && commentLink.match(/^(\d+) /);
  return (
    <div class={`post-${post.id} post uentry post-${blog ? 'blog' : 'comic'}`}>
      <div class="post-head"></div>
      <div class="post-content">
        <div class="post-info">
          <div class="post-text">
            <h2 class="post-title">{link ? <a href={post.path}>{post.title}</a> : post.title}</h2>
            <span class="post-author">by <a href={`/author/${post.author}/`}>{post.author}</a></span>{' '}
            <span class="posted-on">on&nbsp;</span><span class="post-date">{post.date}</span>{' '}
            <span class="posted-at">at&nbsp;</span><span class="post-time">{post.time}</span>
            {blog ? (
              <div class="post-cat">
                Posted In: {post.categories.map(c => <a href={c.href} rel="category tag">{c.title}</a>)}
              </div>
            ) : (
              <ul class="storyline-cats">
                {/* Parent category first: "Comics » Eat Shit and Die". */}
                {post.categories.map((c, i, all) => (
                  <li class={i === 0 ? 'storyline-root' : undefined}>
                    <a href={c.href} rel="category tag">{c.title}</a>
                    {i < all.length - 1 && ' » '}
                  </li>
                ))}
              </ul>
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
          {commentLink && (
            <div class="comment-link">
              {count ? (
                <a href={`${post.path}#comments`}>
                  <span class="comment-balloon">{count[1]}</span> {commentLink.slice(count[0].length)}{' '}
                </a>
              ) : (
                <a href={`${post.path}#respond`}>
                  <span class="comment-balloon comment-balloon-empty">&nbsp;</span> {commentLink}{' '}
                </a>
              )}
            </div>
          )}
          <div class="clear"></div>
        </div>
      </div>
      <div class="post-foot"></div>
    </div>
  );
};

/** The comic image(s), in the theme's comic-wrap frame. */
export const ComicImage = ({ post }: { post: Post }) => (
  <div id="comic-wrap" class={`comic-id-${post.id}`}>
    <div id="comic-head"></div>
    <div class="clear"></div>
    <div id="comic">
      {post.images.map((img, i) => (
        <div id={`comic-${i + 1}`} class="comicpane">
          <img src={imageUrl(post, img)} alt={img.alt} title={img.title} />
        </div>
      ))}
    </div>
    <div class="clear"></div>
    <div id="comic-foot"></div>
  </div>
);

/** First/previous/next/last comic links. */
export const ComicNav = ({ nav }: { nav: Nav }) => [
  <div class="nav">
    {nav.first && <div class="nav-first"><a href={nav.first}>&lsaquo;&lsaquo; First</a></div>}
    <div class="nav-previous">{nav.previous && <a href={nav.previous} rel="prev">&lsaquo; Previous</a>}</div>
    <div class="nav-next">{nav.next && <a href={nav.next} rel="next">Next &rsaquo;</a>}</div>
    {nav.last && <div class="nav-last"><a href={nav.last}>Last &rsaquo;&rsaquo;</a></div>}
  </div>,
  <div class="clear"></div>,
];
