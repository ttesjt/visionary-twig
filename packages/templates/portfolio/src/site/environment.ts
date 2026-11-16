import { z } from 'zod';
import { metadataOriginSchema } from '../infra/metadata-schema.ts';

/** Server-only declarations. Unknown process variables belong to other capabilities. */
export const exampleUpstreamEnvironmentSchema = z.object({
  EXAMPLE_UPSTREAM_URL: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash
    );
  }),
  EXAMPLE_UPSTREAM_API_KEY: z
    .string()
    .min(1)
    .max(4096)
    .refine((value) => !/[^\x21-\x7e]/.test(value)),
});

/** Optional production origin. No request Host header or localhost fallback is used. */
export const metadataEnvironmentSchema = z.object({
  SITE_URL: metadataOriginSchema.optional(),
});
