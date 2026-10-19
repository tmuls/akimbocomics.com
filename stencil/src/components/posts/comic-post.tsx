import { Component, Prop, h } from '@stencil/core';
import { Post } from '../../data/content';
import { ComicImage, ComicNav, PostBody } from './post-body';

/** A comic post page: image, first/previous/next/last, post, comments. */
@Component({ tag: 'comic-post', shadow: false })
export class ComicPost {
  @Prop() post!: Post;

  render() {
    return [
      <ComicImage post={this.post} />,
      <div id="content" class="narrowcolumn">
        <ComicNav nav={this.post.nav} />
        <PostBody post={this.post} link />
        <comment-list comments={this.post.comments} open={this.post.commentsOpen} />
      </div>,
    ];
  }
}
