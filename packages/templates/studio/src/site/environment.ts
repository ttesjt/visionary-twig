import { z } from 'zod';
import { metadataOriginSchema } from '../infra/metadata-schema.ts';

/** Optional production origin. No request Host header or localhost fallback is used. */
export const metadataEnvironmentSchema = z.object({
  SITE_URL: metadataOriginSchema.optional(),
});
