import { z } from 'zod';
import { metadataImageSchema, metadataOriginSchema, metadataPathSchema } from '../metadata-schema';

const label = z.string().trim().min(1);
export const metadataInputSchema = z.strictObject({
  title: label,
  description: label,
  siteName: label.optional(),
  origin: metadataOriginSchema.optional(),
  openGraphLocale: label.optional(),
  alternateOpenGraphLocales: z.array(label).optional(),
  canonicalPath: metadataPathSchema.optional(),
  languagePaths: z.record(label, metadataPathSchema).optional(),
  image: metadataImageSchema.extend({ alt: label }).optional(),
});
export type MetadataInput = z.input<typeof metadataInputSchema>;
