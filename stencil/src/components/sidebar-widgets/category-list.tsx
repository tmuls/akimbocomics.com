import { Component } from '@stencil/core';
import { sidebar } from '../../data/content';
import { widget } from './widget';

/** Sidebar: every series/category. */
@Component({ tag: 'category-list', shadow: false })
export class CategoryList {
  render() {
    return widget('categories-447715191', 'widget_categories', 'Categories', sidebar.categories);
  }
}
