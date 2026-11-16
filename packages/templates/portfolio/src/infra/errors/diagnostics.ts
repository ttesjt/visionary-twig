/** A server digest can match logs; raw thrown messages stay out of fallback UI. */
export function errorDigest(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object') return undefined;
  const digest: unknown = Object.getOwnPropertyDescriptor(error, 'digest')?.value;
  return typeof digest === 'string' && digest.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(digest)
    ? digest
    : undefined;
}
