import { describe, expect, it } from 'vitest';
import { imageAssetSchema, imageMediaSchema, imageSourceSchema } from './image.schema.js';
import { imageAssetToMedia, imageMediaToAsset, selectImageSource } from './image-resource.js';

const legacy = { id: 'stable', src: '/image.png', width: 1200, height: 800, alt: 'A drawing' };
const image = {
  ...imageAssetToMedia(legacy),
  sources: {
    thumbnail: { url: '/thumb.png', width: 300, height: 200 },
    display: { url: '/display.png', width: 1200, height: 900 },
  },
};

describe('image resource boundaries', () => {
  it('preserves existing ImageAsset inputs and does not grant original access', () => {
    expect(imageAssetSchema.parse(legacy)).toEqual(legacy);
    const media = imageAssetToMedia(legacy);
    expect(imageMediaToAsset(media, 'display')).toEqual(legacy);
    expect(selectImageSource(media, 'original')).toBeUndefined();
  });
  it('uses each variant own dimensions and keeps identity separate from URLs', () => {
    expect(imageMediaToAsset(image, 'thumbnail')).toMatchObject({
      id: 'stable',
      src: '/thumb.png',
      width: 300,
      height: 200,
    });
    expect(imageMediaToAsset(image, 'display')).toMatchObject({
      id: 'stable',
      src: '/display.png',
      height: 900,
    });
  });
  it('falls back from a missing preview to display, never to original', () => {
    const media = {
      ...image,
      sources: {
        display: image.sources.display,
        original: { url: '/highest.png', width: 3000, height: 2000 },
      },
    };
    expect(imageMediaToAsset(media, 'thumbnail')).toMatchObject({
      src: '/display.png',
      width: 1200,
      height: 900,
    });
    expect(imageMediaToAsset(media, 'display').src).toBe('/display.png');
  });
  it('enforces required variants, shared URL/alt rules and source attributes', () => {
    expect(
      imageMediaSchema.safeParse({ ...image, sources: { thumbnail: image.sources.thumbnail } })
        .success
    ).toBe(false);
    expect(imageMediaSchema.safeParse({ ...image, alt: '' }).success).toBe(false);
    expect(imageMediaSchema.safeParse({ ...image, decorative: true, alt: '' }).success).toBe(true);
    for (const invalid of [
      { url: '//host/image.png' },
      { width: 0 },
      { height: 2.5 },
      { mimeType: 'text/html' },
      { bytes: -1 },
      { bytes: Number.MAX_SAFE_INTEGER + 1 },
      { storageKey: 'private' },
    ]) {
      expect(imageSourceSchema.safeParse({ ...image.sources.thumbnail, ...invalid }).success).toBe(
        false
      );
    }
  });
});
