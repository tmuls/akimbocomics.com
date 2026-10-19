import { Component, Prop, h } from '@stencil/core';
import { Post } from '../../data/content';
import { ComicImage, ComicNav, PostBody } from './post-body';

/** A comic post page: image, first/previous/next/last, post, comments. */
@Component({ tag: 'comic-post', shadow: false })
export class ComicPost {
  @Prop() post!: Post;
  /** Comment page to show, for /comment-page-N/ URLs. */
  @Prop() commentPage?: number;

  render() {
    return [
      <ComicImage post={this.post} />,
      <div id="content" class="narrowcolumn">
        <ComicNav nav={this.post.nav} />
        <PostBody post={this.post} link />
        <comment-list post={this.post} page={this.commentPage} />
      </div>,
    ];
  }
}
