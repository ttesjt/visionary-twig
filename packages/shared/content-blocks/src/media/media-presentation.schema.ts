import { z } from 'zod';
import { contentAlignmentSchema } from '../shared/presentation.schema.js';

export const MEDIA_WIDTHS = ['full', 'compact', 'regular', 'wide'] as const;
export const MEDIA_HEIGHT_LIMITS = ['none', 'compact', 'regular', 'tall'] as const;
export const DEFAULT_MEDIA_ALIGNMENT = 'center';

/** Display bounds belong to a placement, never to the source image's intrinsic dimensions. */
export const mediaPresentationSchema = z.strictObject({
  width: z.enum(MEDIA_WIDTHS).optional(),
  maxHeight: z.enum(MEDIA_HEIGHT_LIMITS).optional(),
  align: contentAlignmentSchema.optional(),
});
export type MediaPresentation = z.infer<typeof mediaPresentationSchema>;
