import { componentPublicProps } from './component-props.js';
import type { JsonObject } from '@frontend/ui-document';
import {
  heroPropsSchema,
  mediaFigurePropsSchema,
  mediaGalleryPropsSchema,
  mediaTextPropsSchema,
  videoPropsSchema,
} from '@frontend/content-blocks/schema';
/** Parse with the same component schemas; unused context values never grant access. */
export function componentMediaSources(type: string, props: JsonObject): readonly string[] {
  const data = componentPublicProps(props);
  if (type === 'Hero') {
    const parsed = heroPropsSchema.parse(data);
    return parsed.image ? [parsed.image.src] : [];
  }
  if (type === 'MediaFigure') return [mediaFigurePropsSchema.parse(data).image.src];
  if (type === 'MediaGallery')
    return mediaGalleryPropsSchema.parse(data).images.map((image) => image.src);
  if (type === 'MediaText') {
    const media = mediaTextPropsSchema.parse(data).media;
    return media.type === 'image' ? [media.image.src] : media.images.map((image) => image.src);
  }
  if (type === 'Video') {
    const video = videoPropsSchema.parse(data);
    return [
      ...video.sources.map((source) => source.src),
      ...(video.poster ? [video.poster] : []),
      ...(video.tracks ?? []).map((track) => track.src),
    ];
  }
  return [];
}
