import {
  DEFAULT_MEDIA_ALIGNMENT,
  mediaPresentationSchema,
  type MediaPresentation,
} from './media-presentation.schema.js';

/** Missing height stays unset so a gallery may provide the shared image-height bound. */
export function mediaPresentationAttributes(value: MediaPresentation | undefined) {
  const presentation = mediaPresentationSchema.optional().parse(value);
  return {
    'data-media-width': presentation?.width,
    'data-media-height': presentation?.maxHeight,
    'data-media-align': presentation ? (presentation.align ?? DEFAULT_MEDIA_ALIGNMENT) : undefined,
  };
}
