import { z } from 'zod';
import { contentTextReferenceSchema } from '../infra/content-text-reference.ts';
import { projectFileSchemas } from '../features/projects/files/index.ts';

const visibleText = z.string().trim().min(1);

export const baseContentSchemas = {
  base: z.strictObject({
    displayName: visibleText,
    about: z.union([visibleText, contentTextReferenceSchema]).optional(),
  }),
};
export const contentSchemas: typeof baseContentSchemas & typeof projectFileSchemas = {
  ...baseContentSchemas,
  ...projectFileSchemas,
};
