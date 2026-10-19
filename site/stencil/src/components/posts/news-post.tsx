import { Component, Prop, h } from '@stencil/core';
import { Post } from '../../data/content';
import { PostBody } from './post-body';

/** A news (blog) post page. */
@Component({ tag: 'news-post', shadow: false })
export class NewsPost {
  @Prop() post!: Post;
  @Prop() commentPage?: number;

  render() {
    const { previous, next } = this.post.nav;
    return (
      <div id="content" class="narrowcolumn">
        <div class="blognav">
          {previous && <span class="blognav-prev"><a href={previous} rel="prev"> &lsaquo; Previous </a></span>}
          {next && <span class="blognav-next"><a href={next} rel="next">Next &rsaquo; </a></span>}
        </div>
        <div class="clear"></div>
        <PostBody post={this.post} blog />
        <comment-list post={this.post} page={this.commentPage} />
      </div>
    );
  }
}
