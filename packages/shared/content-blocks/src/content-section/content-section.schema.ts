import { z } from 'zod';
import { contentAlignmentSchema, contentWidthSchema } from '../shared/presentation.schema.js';
import { CONTAINER_WIDTHS } from '@frontend/ui/layout-options';
import { headingPropsSchema } from '../heading/heading.schema.js';
import { richTextSchema } from '../rich-text/rich-text.schema.js';

export const CONTENT_WIDTHS = CONTAINER_WIDTHS;
export const CONTENT_SURFACES = ['plain', 'muted', 'raised'] as const;
export const contentSectionPropsSchema = z.strictObject({
  heading: headingPropsSchema.optional(),
  align: contentAlignmentSchema.optional(),
  intro: richTextSchema.optional(),
  body: richTextSchema.optional(),
  outro: richTextSchema.optional(),
  width: contentWidthSchema.optional(),
  surface: z.enum(CONTENT_SURFACES).optional(),
});
export type ContentSectionData = z.infer<typeof contentSectionPropsSchema>;
