import { z } from 'zod';

const httpUrl = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash;
}, 'Expected an HTTP(S) URL without credentials or a fragment.');
export const metadataPathSchema = z
  .string()
  .refine(
    (value) => value.startsWith('/') && !value.startsWith('//') && !/[\\\s?#]/.test(value),
    'Expected an absolute site path without a query or fragment.'
  );

/** Deployment origin, not a request-derived host or an application route. */
export const metadataOriginSchema = httpUrl.refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.pathname === '/' && !url.search;
}, 'Expected a site origin without a path or query.');
export const metadataImageSchema = z.strictObject({
  src: z.union([metadataPathSchema, httpUrl]),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
