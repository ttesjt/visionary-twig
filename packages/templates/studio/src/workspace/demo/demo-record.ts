import { z } from 'zod';
import type { ContentResult } from '@frontend/ui-document';
// Seed identities describe only the supplied copy; new records use generated identities.
export const DEMO_RECORD_IDS = ['field-guide', 'image-study', 'reading-notes'] as const;
export const DEMO_RECORD_STATUSES = ['draft', 'ready'] as const;
export const DEMO_TITLE_MAX_LENGTH = 120;
export const DEMO_SUMMARY_MAX_LENGTH = 600;
export const DEMO_RECORD_ID_MAX_LENGTH = 128;
export const DEMO_IMAGE_URL_MAX_LENGTH = 2048;
export function isDemoImageUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'blob:';
  } catch {
    return false;
  }
}
export const demoImageUrlSchema = z
  .string()
  .trim()
  .max(DEMO_IMAGE_URL_MAX_LENGTH)
  .refine(isDemoImageUrl);
export const demoIdentitySchema = z
  .string()
  .min(1)
  .max(DEMO_RECORD_ID_MAX_LENGTH)
  .regex(/^[a-z0-9][a-z0-9-]*$/u);
export const demoRecordSchema = z.strictObject({
  id: demoIdentitySchema,
  title: z.string().trim().min(1).max(DEMO_TITLE_MAX_LENGTH),
  summary: z.string().max(DEMO_SUMMARY_MAX_LENGTH),
  status: z.enum(DEMO_RECORD_STATUSES),
  imageUrl: demoImageUrlSchema.optional(),
  pageId: demoIdentitySchema.optional(),
});
export type DemoRecord = z.infer<typeof demoRecordSchema>;

export function parseDemoRecord(input: unknown): ContentResult<DemoRecord> {
  const result = demoRecordSchema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : {
        ok: false,
        errors: result.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.map(String),
          message: issue.message,
        })),
      };
}
/** Host-managed page links do not participate in the editable record baseline. */
export function demoRecordFingerprint(record: DemoRecord): string {
  return JSON.stringify([record.id, record.title, record.summary, record.status, record.imageUrl]);
}
