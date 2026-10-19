import { Component, Prop, h } from '@stencil/core';

/** WP-PageNavi style pager: five page numbers around the current one. */
@Component({ tag: 'page-nav', shadow: false })
export class PageNav {
  @Prop() base!: string;
  @Prop() page = 1;
  @Prop() pages = 1;

  private href(n: number) {
    return n === 1 ? this.base : `${this.base}page/${n}/`;
  }

  render() {
    const { page, pages } = this;
    if (pages < 2) return null;
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    return [
      <div id="wp-paginav">
        <div id="paginav">
          <ul>
            <li class="paginav-pages">Page {page} of {pages}</li>
            {start > 1 && <li><a href={this.href(1)} title={"\u00ab First"}>&laquo; First</a></li>}
            {page > 1 && <li class="paginav-previous"><a href={this.href(page - 1)}>&laquo;</a></li>}
            {nums.map(n =>
              n === page ? <li class="paginav-current">{n}</li> : <li><a href={this.href(n)} title={String(n)}>{n}</a></li>,
            )}
            {page < pages && <li class="paginav-next"><a href={this.href(page + 1)}>&raquo;</a></li>}
            {end < pages && <li><a href={this.href(pages)} title={"Last \u00bb"}>Last &raquo;</a></li>}
          </ul>
        </div>
        <div class="clear"></div>
      </div>,
    ];
  }
}
