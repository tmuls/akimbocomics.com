import { Component, h } from '@stencil/core';
import { emulsifierOnline } from '../../data/content';

/** /emulsifier-online/: a plain list of old comics, no site theme. */
@Component({ tag: 'emulsifier-gallery', shadow: false })
export class EmulsifierGallery {
  render() {
    return [
      <p>{emulsifierOnline.intro}</p>,
      emulsifierOnline.images.map(file => [<h4>{file}</h4>, <img src={emulsifierOnline.path + file} />, <br />, <br />]),
    ];
  }
}
