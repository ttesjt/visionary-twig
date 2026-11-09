import { z } from 'zod';
import { demoIdentitySchema, DEMO_TITLE_MAX_LENGTH } from '../demo-record';
export const demoPageTitleSchema = z.string().trim().min(1).max(DEMO_TITLE_MAX_LENGTH);
const revision = z.number().int().nonnegative().safe();
export const demoPageWriteSchema = z.strictObject({
  id: demoIdentitySchema,
  title: demoPageTitleSchema,
  expectedRevision: revision,
  expectedItemId: demoIdentitySchema.nullable(),
  itemId: demoIdentitySchema.nullable(),
  project: z.unknown(),
  locales: z.array(z.string()),
});
export const demoPageUnlinkSchema = z.strictObject({
  id: demoIdentitySchema,
  expectedRevision: revision,
  expectedItemId: demoIdentitySchema,
});
