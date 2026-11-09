import { z } from 'zod';
import { linkUrlSchema, meaningfulTextSchema } from '../shared/url.schema.js';

export const ACTION_KINDS = ['primary', 'secondary', 'text'] as const;
export const DEFAULT_ACTION_KIND = 'secondary';
export const ACTION_ICONS = [
  'website',
  'github',
  'download',
  'video',
  'external',
  'smartphone',
] as const;
const actionFields = {
  id: meaningfulTextSchema,
  label: meaningfulTextSchema,
  kind: z.enum(ACTION_KINDS).optional(),
  icon: z.enum(ACTION_ICONS).optional(),
};
export const actionLinkSchema = z.discriminatedUnion('availability', [
  z.strictObject({
    ...actionFields,
    availability: z.literal('available'),
    href: linkUrlSchema,
    newTab: z.boolean().optional(),
  }),
  z.strictObject({
    ...actionFields,
    availability: z.literal('unavailable'),
    reason: meaningfulTextSchema,
  }),
]);
export const NEW_TAB_HINT_DISPLAYS = ['visible', 'accessible'] as const;
export const actionLinksPropsSchema = z.strictObject({
  newTabHint: meaningfulTextSchema.optional(),
  newTabHintDisplay: z.enum(NEW_TAB_HINT_DISPLAYS).optional(),
  actions: z
    .array(actionLinkSchema)
    .readonly()
    .superRefine((actions, context) => {
      const ids = new Set<string>();
      actions.forEach((action, index) => {
        if (ids.has(action.id))
          context.addIssue({
            code: 'custom',
            path: [index, 'id'],
            message: 'Action IDs must be unique.',
          });
        ids.add(action.id);
      });
    }),
  label: meaningfulTextSchema.optional(),
});
export type ActionLink = z.infer<typeof actionLinkSchema>;
export type ActionLinksData = z.infer<typeof actionLinksPropsSchema>;
