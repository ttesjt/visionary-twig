import { z } from 'zod';
import { mediaPresentationSchema } from './media-presentation.schema.js';
import { viewerTextSchema } from './media-text.schema.js';
import { meaningfulTextSchema, resourceUrlSchema } from '../shared/url.schema.js';

export const intrinsicDimensionSchema = z.number().int().positive();
export const MEDIA_FITS = ['contain', 'cover'] as const;
export const MEDIA_RATIOS = ['intrinsic', 'square', 'landscape', 'portrait'] as const;
export const DEFAULT_MEDIA_FIT = 'contain';
export const DEFAULT_MEDIA_RATIO = 'intrinsic';
export const mediaFitSchema = z.enum(MEDIA_FITS);
export const mediaRatioSchema = z.enum(MEDIA_RATIOS);
const imageDescriptionSchema = z
  .strictObject({
    id: meaningfulTextSchema,
    alt: z.string(),
    caption: meaningfulTextSchema.optional(),
    decorative: z.boolean().optional(),
  })
  .superRefine((image, context) => {
    if (image.decorative ? image.alt !== '' : !image.alt.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['alt'],
        message: 'Decorative images require empty alt; other images require meaningful alt.',
      });
    }
  });
export const imageSourceSchema = z.strictObject({
  url: resourceUrlSchema,
  width: intrinsicDimensionSchema,
  height: intrinsicDimensionSchema,
  mimeType: z
    .string()
    .regex(/^image\/[a-zA-Z0-9.+-]+$/u)
    .optional(),
  bytes: z.number().int().positive().safe().optional(),
});
export const imageSourcesSchema = z.strictObject({
  thumbnail: imageSourceSchema.optional(),
  display: imageSourceSchema,
  original: imageSourceSchema.optional(),
});
export const imageAssetSchema = imageDescriptionSchema.safeExtend({
  src: resourceUrlSchema,
  width: intrinsicDimensionSchema,
  height: intrinsicDimensionSchema,
});
export const imageMediaSchema = imageDescriptionSchema.safeExtend({
  type: z.literal('image'),
  sources: imageSourcesSchema,
});
export function checkUniqueImageIds(
  images: readonly { readonly id: string }[],
  context: z.RefinementCtx
): void {
  const ids = new Set<string>();
  images.forEach((image, index) => {
    if (ids.has(image.id))
      context.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: 'Image IDs must be unique in a dataset.',
      });
    ids.add(image.id);
  });
}
export const imageAssetsSchema = z
  .array(imageAssetSchema)
  .readonly()
  .superRefine(checkUniqueImageIds);
export const mediaFigurePropsSchema = z.strictObject({
  presentation: mediaPresentationSchema.optional(),
  image: imageAssetSchema,
  fit: mediaFitSchema.optional(),
  ratio: mediaRatioSchema.optional(),
  loading: z.enum(['eager', 'lazy']).optional(),
  failureLabel: meaningfulTextSchema.optional(),
  zoom: z.boolean().optional(),
  zoomLabel: meaningfulTextSchema.optional(),
  viewerCopy: viewerTextSchema.optional(),
});
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type ImageSource = z.infer<typeof imageSourceSchema>;
export type ImageSources = z.infer<typeof imageSourcesSchema>;
export type ImageMedia = z.infer<typeof imageMediaSchema>;
export type MediaFit = z.infer<typeof mediaFitSchema>;
export type MediaRatio = z.infer<typeof mediaRatioSchema>;
export type MediaFigureData = z.infer<typeof mediaFigurePropsSchema>;
