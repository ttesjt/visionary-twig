import { z } from 'zod';
import { navigationPresentationSchema } from './presentation/presentation.schema.js';
import { contentWidthSchema } from '../shared/presentation.schema.js';
import { anchorNameSchema } from '../navigation/anchor.schema.js';
const text = z.string().trim().min(1);
export const contentNavigationItemSchema = z.strictObject({
  label: text,
  href: z
    .string()
    .refine(
      (value) => value.startsWith('#') && anchorNameSchema.safeParse(value.slice(1)).success,
      'Use a declared local #anchor.'
    ),
});
export const contentNavigationPropsSchema = z.strictObject({
  presentation: navigationPresentationSchema.optional(),
  inlineWidth: contentWidthSchema.optional(),
  label: text,
  title: text.optional(),
  progressLabel: text,
  items: z
    .array(contentNavigationItemSchema)
    .min(1)
    .readonly()
    .superRefine((items, context) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (seen.has(item.href))
          context.addIssue({
            code: 'custom',
            path: [index, 'href'],
            message: 'Navigation destinations must be unique.',
          });
        seen.add(item.href);
      });
    }),
});
export type ContentNavigationData = z.infer<typeof contentNavigationPropsSchema>;
export type ContentNavigationItem = z.infer<typeof contentNavigationItemSchema>;
