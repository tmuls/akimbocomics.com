import { h } from '@stencil/core';
import { Link } from '../../data/content';

/** A ComicPress sidebar widget: a title and a list of links. */
export const widget = (id: string, cls: string, title: string, links: Link[]) => (
  <div id={id} class={`widget ${cls}`}>
    <div class="widget-head"></div>
    <div class="widget-content">
      <h2 class="widgettitle">{title}</h2>
      <ul>
        {links.map(l => (
          <li class={l.id ? `cat-item cat-item-${l.id}` : undefined}>
            <a href={l.href} title={l.description || undefined}>{l.title}</a>
          </li>
        ))}
      </ul>
    </div>
    <div class="clear"></div>
    <div class="widget-foot"></div>
  </div>
);
