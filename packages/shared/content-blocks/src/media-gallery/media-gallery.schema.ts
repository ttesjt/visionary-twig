import { z } from 'zod';
import { mediaPresentationSchema } from '../media/media-presentation.schema.js';
import { galleryTextCatalogSchema, viewerTextSchema } from '../media/media-text.schema.js';
import { imageAssetsSchema, mediaFitSchema, mediaRatioSchema } from '../media/image.schema.js';
import { meaningfulTextSchema } from '../shared/url.schema.js';

export const GALLERY_LAYOUTS = ['grid', 'strip', 'carousel'] as const;
export const STRIP_SIZES = ['content', 'compact', 'regular', 'tall'] as const;
export const DEFAULT_GALLERY_LAYOUT = 'grid';
export const GALLERY_NAVIGATIONS = ['overlay', 'below', 'none'] as const;
export const GALLERY_PAGINATIONS = ['dots', 'thumbnails', 'none'] as const;
export const GALLERY_TRANSITIONS = ['slide', 'fade'] as const;
export const mediaGalleryPropsSchema = z.strictObject({
  images: imageAssetsSchema,
  presentation: mediaPresentationSchema.optional(),
  itemPresentation: mediaPresentationSchema.optional(),
  navigation: z.enum(GALLERY_NAVIGATIONS).optional(),
  pagination: z.enum(GALLERY_PAGINATIONS).optional(),
  transition: z.enum(GALLERY_TRANSITIONS).optional(),
  loop: z.boolean().optional(),
  autoplay: z.boolean().optional(),
  stripSize: z.enum(STRIP_SIZES).optional(),
  drag: z.boolean().optional(),
  showCount: z.boolean().optional(),
  showHint: z.boolean().optional(),
  copy: galleryTextCatalogSchema.optional(),
  viewerCopy: viewerTextSchema.optional(),
  label: meaningfulTextSchema,
  layout: z.enum(GALLERY_LAYOUTS).optional(),
  fit: mediaFitSchema.optional(),
  ratio: mediaRatioSchema.optional(),
  thumbnails: z.boolean().optional(),
  zoom: z.boolean().optional(),
  emptyLabel: meaningfulTextSchema.optional(),
});
export type MediaGalleryData = z.infer<typeof mediaGalleryPropsSchema>;
