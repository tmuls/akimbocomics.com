import { Component } from '@stencil/core';
import { categories } from '../../data/content';
import { widget } from './widget';

/** Sidebar: every series/category. */
@Component({ tag: 'category-list', shadow: false })
export class CategoryList {
  render() {
    return widget('widget_categories', 'Categories', categories.map(c => ({ title: c.name, href: `/${c.slug}/` })));
  }
}
