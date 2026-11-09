import {
  imageAssetSchema,
  imageMediaSchema,
  type ImageAsset,
  type ImageMedia,
  type ImageSource,
} from './image.schema.js';

/** Selects an explicitly supplied variant; original is never inferred. */
export function selectImageSource(
  media: ImageMedia,
  role: keyof ImageMedia['sources']
): ImageSource | undefined {
  return media.sources[role];
}

/** Existing single-src renderers consume this projection without schema changes. */
export function imageMediaToAsset(media: ImageMedia, role: 'thumbnail' | 'display'): ImageAsset {
  const { type: _type, sources, ...description } = imageMediaSchema.parse(media);
  void _type;
  const source = sources[role] ?? sources.display;
  return imageAssetSchema.parse({
    ...description,
    src: source.url,
    width: source.width,
    height: source.height,
  });
}

/** Explicit compatibility path; a legacy src does not imply original permission. */
export function imageAssetToMedia(image: ImageAsset) {
  const { src, width, height, ...description } = imageAssetSchema.parse(image);
  const source = { url: src, width, height };
  return {
    ...imageMediaSchema.parse({ ...description, type: 'image', sources: { display: source } }),
    sources: { thumbnail: source, display: source },
  };
}
