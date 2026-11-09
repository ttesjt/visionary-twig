import { expect, it } from 'vitest';
import {
  DEFAULT_GALLERY_TEXT,
  DEFAULT_VIEWER_TEXT,
  galleryTextCatalogSchema,
  viewerTextSchema,
  mediaFigurePropsSchema,
  mediaGalleryPropsSchema,
} from '../schema.js';

const image = {
  id: 'sample',
  src: '/media/sample.svg',
  alt: 'Sample diagram',
  width: 640,
  height: 480,
};
it('validates complete neutral JSON defaults and interpolation contracts', () => {
  expect(galleryTextCatalogSchema.required().parse(DEFAULT_GALLERY_TEXT)).toEqual(
    DEFAULT_GALLERY_TEXT
  );
  expect(viewerTextSchema.required().parse(DEFAULT_VIEWER_TEXT)).toEqual(DEFAULT_VIEWER_TEXT);
  expect(() => viewerTextSchema.parse({ count: '{curent} / {total}' })).toThrow();
  expect(() => galleryTextCatalogSchema.parse({ viewerLabel: '{name}' })).toThrow();
});
it('keeps existing serialized media text keys while exposing canonical text APIs', () => {
  const legacy = {
    images: [image],
    label: 'Sample gallery',
    copy: { previous: 'Earlier', count: '{current}/{total}' },
    viewerCopy: { close: 'Dismiss' },
  };
  expect(mediaGalleryPropsSchema.parse(JSON.parse(JSON.stringify(legacy)))).toEqual(legacy);
  const figure = { image, viewerCopy: { close: 'Dismiss' } };
  expect(mediaFigurePropsSchema.parse(figure)).toEqual(figure);
  for (const key of ['text', 'viewerText']) {
    expect(() => mediaGalleryPropsSchema.parse({ ...legacy, [key]: {} })).toThrow();
  }
});
