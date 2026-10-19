import { Component } from '@stencil/core';
import { latestComics } from '../../data/content';
import { widget } from './widget';

/** Sidebar: the five newest comics. */
@Component({ tag: 'latest-comics', shadow: false })
export class LatestComics {
  render() {
    return widget('comicpress_latest_comics_widget', 'Latest Comics', latestComics.map(p => ({ title: p.title, href: p.path })));
  }
}
