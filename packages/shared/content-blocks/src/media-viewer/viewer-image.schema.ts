import { z } from 'zod';
import { imageAssetSchema, imageSourceSchema, checkUniqueImageIds } from '../media/image.schema.js';
import { meaningfulTextSchema } from '../shared/url.schema.js';

/** Additive viewer metadata; existing single-resource ImageAsset consumers remain valid. */
export const viewerImageSchema = imageAssetSchema.safeExtend({
  original: imageSourceSchema.optional(),
  description: meaningfulTextSchema.optional(),
});
export const viewerImagesSchema = z
  .array(viewerImageSchema)
  .readonly()
  .superRefine(checkUniqueImageIds);
export type ViewerImage = z.infer<typeof viewerImageSchema>;
