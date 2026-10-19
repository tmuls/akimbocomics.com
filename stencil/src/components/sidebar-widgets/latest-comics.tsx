import { Component } from '@stencil/core';
import { sidebar } from '../../data/content';
import { widget } from './widget';

/** Sidebar: the five newest comics. */
@Component({ tag: 'latest-comics', shadow: false })
export class LatestComics {
  render() {
    return widget('comicpress_latest_comics_widget-2', 'comicpress_latest_comics_widget', 'Latest Comics', sidebar.latestComics);
  }
}
