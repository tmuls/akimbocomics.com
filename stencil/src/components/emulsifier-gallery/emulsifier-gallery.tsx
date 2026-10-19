import { Component, h } from '@stencil/core';
import { emulsifierOnline } from '../../data/content';

/** /emulsifier-online/: a plain list of old comics, no site theme. */
@Component({ tag: 'emulsifier-gallery', shadow: false })
export class EmulsifierGallery {
  render() {
    return [
      <p>{emulsifierOnline.intro}</p>,
      emulsifierOnline.images.map(i => [<h4>{i.caption}</h4>, <img src={emulsifierOnline.path + i.file} />, <br />, <br />]),
    ];
  }
}
