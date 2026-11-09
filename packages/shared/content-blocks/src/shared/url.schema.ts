import { z } from 'zod';
import { anchorNameSchema } from '../navigation/anchor.schema.js';

/** Root-relative paths and explicit HTTP(S) URLs; host allowlists belong to the app. */
export function isSafeResourceUrl(value: string): boolean {
  if (!value || /[\s\u0000-\u001f\u007f\\]/u.test(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//');
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

export const resourceUrlSchema = z
  .string()
  .refine(isSafeResourceUrl, 'Expected a root-relative path or HTTP(S) URL without credentials.');
export const linkUrlSchema = z
  .string()
  .refine(
    (value) =>
      isSafeResourceUrl(value) ||
      (value.startsWith('#') && anchorNameSchema.safeParse(value.slice(1)).success),
    'Expected a safe URL or a named document fragment.'
  );
export const meaningfulTextSchema = z.string().trim().min(1);
