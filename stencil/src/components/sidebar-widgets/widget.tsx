import { h } from '@stencil/core';

/** A ComicPress sidebar widget: a title and a list of links. */
export const widget = (cls: string, title: string, links: { title: string; href: string }[]) => (
  <div class={`widget ${cls}`}>
    <div class="widget-head"></div>
    <div class="widget-content">
      <h2 class="widgettitle">{title}</h2>
      <ul>
        {links.map(l => (
          <li>
            <a href={l.href}>{l.title}</a>
          </li>
        ))}
      </ul>
    </div>
    <div class="clear"></div>
    <div class="widget-foot"></div>
  </div>
);
