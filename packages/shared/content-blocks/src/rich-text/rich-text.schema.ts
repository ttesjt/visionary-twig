import { z } from 'zod';
import { contentAlignmentSchema } from '../shared/presentation.schema.js';
import { linkUrlSchema, meaningfulTextSchema } from '../shared/url.schema.js';

export const RICH_TEXT_HEADING_LEVELS = [2, 3, 4, 5, 6] as const;
const textNode = z.strictObject({ type: z.literal('text'), text: z.string() });
const strongNode = z.strictObject({ type: z.literal('strong'), text: z.string() });
const emphasisNode = z.strictObject({ type: z.literal('emphasis'), text: z.string() });
const codeNode = z.strictObject({ type: z.literal('code'), text: z.string() });
const linkNode = z.strictObject({
  type: z.literal('link'),
  label: meaningfulTextSchema,
  href: linkUrlSchema,
});
export const richTextInlineSchema = z.discriminatedUnion('type', [
  textNode,
  strongNode,
  emphasisNode,
  codeNode,
  linkNode,
]);
const inlines = z.array(richTextInlineSchema).readonly();
export const richTextBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), content: inlines }),
  z.strictObject({
    type: z.literal('heading'),
    level: z.literal(RICH_TEXT_HEADING_LEVELS),
    content: inlines,
  }),
  z.strictObject({
    type: z.literal('list'),
    ordered: z.boolean(),
    items: z.array(z.strictObject({ content: inlines })).readonly(),
  }),
]);
export const richTextSchema = z.array(richTextBlockSchema).readonly();
export const richTextPropsSchema = z.strictObject({
  content: richTextSchema,
  align: contentAlignmentSchema.optional(),
});
export type RichTextInline = z.infer<typeof richTextInlineSchema>;
export type RichTextBlock = z.infer<typeof richTextBlockSchema>;
export type RichTextData = z.infer<typeof richTextPropsSchema>;
