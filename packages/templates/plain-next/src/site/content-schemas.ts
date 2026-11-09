import { z } from 'zod';
import { contentTextReferenceSchema } from '../infra/content-text-reference.ts';
export const contentSchemas = {
  base: z.strictObject({ collection: z.string().min(1) }),
  catalog: z.strictObject({
    works: z.array(
      z.strictObject({
        id: z.string(),
        title: z.union([z.string(), contentTextReferenceSchema]),
        year: z.number().int(),
      })
    ),
  }),
  'making-notes': z.strictObject({
    entries: z.array(z.strictObject({ workId: z.string(), technique: z.string() })),
  }),
};
