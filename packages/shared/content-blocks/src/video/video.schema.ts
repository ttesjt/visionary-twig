import { z } from 'zod';
import { mediaPresentationSchema } from '../media/media-presentation.schema.js';
import { intrinsicDimensionSchema } from '../media/image.schema.js';
import { meaningfulTextSchema, resourceUrlSchema } from '../shared/url.schema.js';

export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'] as const;
export const videoPropsSchema = z.strictObject({
  presentation: mediaPresentationSchema.optional(),
  label: meaningfulTextSchema,
  sources: z
    .array(z.strictObject({ src: resourceUrlSchema, type: z.enum(VIDEO_TYPES) }))
    .min(1)
    .readonly(),
  width: intrinsicDimensionSchema,
  height: intrinsicDimensionSchema,
  poster: resourceUrlSchema.optional(),
  caption: meaningfulTextSchema.optional(),
  tracks: z
    .array(
      z.strictObject({
        src: resourceUrlSchema,
        srcLang: meaningfulTextSchema,
        label: meaningfulTextSchema,
        kind: z.enum(['captions', 'subtitles']),
        default: z.boolean().optional(),
      })
    )
    .readonly()
    .refine(
      (tracks) => tracks.filter((track) => track.default).length <= 1,
      'Only one default caption track is allowed.'
    )
    .optional(),
});
export type VideoData = z.infer<typeof videoPropsSchema>;
