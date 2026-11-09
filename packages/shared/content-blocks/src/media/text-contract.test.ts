import { expect, it } from 'vitest';
import {
  DEFAULT_GALLERY_TEXT,
  DEFAULT_VIEWER_TEXT,
  galleryTextCatalogSchema,
  viewerTextSchema,
} from '../schema.js';

it('validates complete neutral JSON defaults and interpolation contracts', () => {
  expect(galleryTextCatalogSchema.required().parse(DEFAULT_GALLERY_TEXT)).toEqual(
    DEFAULT_GALLERY_TEXT
  );
  expect(viewerTextSchema.required().parse(DEFAULT_VIEWER_TEXT)).toEqual(DEFAULT_VIEWER_TEXT);
  expect(() => viewerTextSchema.parse({ count: '{curent} / {total}' })).toThrow();
  expect(() => galleryTextCatalogSchema.parse({ viewerLabel: '{name}' })).toThrow();
});
