import { z } from 'zod';
import { contentAlignmentSchema } from '../shared/presentation.schema.js';
import { meaningfulTextSchema } from '../shared/url.schema.js';

export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export const HEADING_APPEARANCES = ['display', 'title', 'subtitle'] as const;
export const DEFAULT_HEADING_LEVEL = 2;
export const headingLevelSchema = z.literal(HEADING_LEVELS);
export const headingPropsSchema = z.strictObject({
  text: meaningfulTextSchema,
  align: contentAlignmentSchema.optional(),
  level: headingLevelSchema.optional(),
  appearance: z.enum(HEADING_APPEARANCES).optional(),
});
export type HeadingData = z.infer<typeof headingPropsSchema>;
