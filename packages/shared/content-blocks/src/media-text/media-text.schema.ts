import { z } from 'zod';
import { mediaFigurePropsSchema } from '../media/image.schema.js';
import { mediaGalleryPropsSchema } from '../media-gallery/media-gallery.schema.js';
import { richTextSchema } from '../rich-text/rich-text.schema.js';
import { headingPropsSchema } from '../heading/heading.schema.js';

export const MEDIA_POSITIONS = ['start', 'end', 'top'] as const;
export const MEDIA_TEXT_PROPORTIONS = [
  'balanced',
  'text-emphasis',
  'media-emphasis',
  'text-dominant',
] as const;
export const MEDIA_TEXT_SIZES = ['full', 'compact', 'regular'] as const;
export const mediaTextPropsSchema = z.strictObject({
  media: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('image'), ...mediaFigurePropsSchema.shape }),
    z.strictObject({ type: z.literal('gallery'), ...mediaGalleryPropsSchema.shape }),
  ]),
  heading: headingPropsSchema.optional(),
  body: richTextSchema,
  mediaPosition: z.enum(MEDIA_POSITIONS).optional(),
  proportion: z.enum(MEDIA_TEXT_PROPORTIONS).optional(),
  mediaSize: z.enum(MEDIA_TEXT_SIZES).optional(),
});
export type MediaTextData = z.infer<typeof mediaTextPropsSchema>;
