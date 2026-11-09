import { z } from 'zod';
import { metadataImageSchema } from '../infra/metadata-schema.ts';
export const appConfigSchema = z.strictObject({
  version: z.literal(1),
  metadata: z.strictObject({ image: metadataImageSchema.optional() }).optional(),
  tracking: z.strictObject({ enabled: z.boolean() }).optional(),
  workspace: z.strictObject({ showIntroduction: z.boolean() }),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

export const configSchemas = { app: appConfigSchema };
