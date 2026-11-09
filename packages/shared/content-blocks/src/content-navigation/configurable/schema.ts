import { z } from 'zod';
import { resourceUrlSchema } from '../../shared/url.schema.js';
import { anchorNameSchema } from '../../navigation/anchor.schema.js';

export const NAVIGATION_COLORS = [
  'inherit',
  'ink',
  'muted',
  'surface',
  'raised',
  'line',
  'accent',
  'accent-soft',
  'transparent',
] as const;
export const NAVIGATION_ICONS = ['spark', 'code', 'compass', 'bird', 'leaf'] as const;
export const navigationMediaSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('image'), src: resourceUrlSchema }),
  z.strictObject({ kind: z.literal('icon'), name: z.enum(NAVIGATION_ICONS) }),
]);
export const NAVIGATION_PART_LIMITS = {
  variants: 24,
  minTrackHeight: 1,
  maxTrackHeight: 16,
  minMarkerSize: 8,
  maxMarkerSize: 40,
} as const;
export const NAVIGATION_PROGRESS_DEFAULTS = {
  height: 2,
  markerSize: 16,
  color: 'ink',
  track: 'line',
} as const;
const palette = z.string().regex(/^[a-z][a-z0-9-]{0,47}$/);
const color = z.enum(NAVIGATION_COLORS);
const contentFields = {
  display: z.enum(['text', 'media', 'media-text']).optional(),
  media: navigationMediaSchema.nullable().optional(),
  mediaSize: z.enum(['small', 'medium', 'large']).optional(),
  mediaFit: z.enum(['contain', 'cover']).optional(),
  mediaShape: z.enum(['square', 'intrinsic']).optional(),
};
export const navigationAppearanceSchema = z.strictObject({
  palette: palette.optional(),
  color: color.optional(),
  background: color.optional(),
  borderColor: color.optional(),
  borderWidth: z.enum(['none', 'thin', 'thick']).optional(),
  radius: z.enum(['none', 'soft', 'pill']).optional(),
  underline: z.boolean().optional(),
  font: z.enum(['system', 'mono', 'serif']).optional(),
  weight: z.enum(['regular', 'medium', 'semibold']).optional(),
});
const contentSchema = z.strictObject({ ...contentFields, showIndex: z.boolean().optional() });
export const navigationItemStateSchema = navigationAppearanceSchema.extend({
  representation: contentSchema.optional(),
});
export const navigationItemDesignSchema = z.strictObject({
  representation: contentSchema.optional(),
  base: navigationAppearanceSchema.optional(),
  unselected: navigationItemStateSchema.optional(),
  selected: navigationItemStateSchema.optional(),
});
const anchorTarget = z
  .string()
  .refine(
    (value) => value.startsWith('#') && anchorNameSchema.safeParse(value.slice(1)).success,
    'Expected a local anchor.'
  );
export const configurableTitleSchema = z
  .strictObject({
    ...contentFields,
    appearance: navigationAppearanceSchema.optional(),
    compact: z.enum(['same', 'media', 'text']).optional(),
  })
  .superRefine((value, ctx) => {
    if (((value.display ?? 'text') !== 'text' || value.compact === 'media') && !value.media)
      ctx.addIssue({
        code: 'custom',
        path: ['media'],
        message: 'Media display requires an image or icon.',
      });
  });
export const configurableItemSchema = navigationItemDesignSchema
  .extend({
    cycle: z
      .array(navigationItemDesignSchema)
      .min(1)
      .max(NAVIGATION_PART_LIMITS.variants)
      .optional(),
    overrides: z.record(anchorTarget, navigationItemDesignSchema).optional(),
  })
  .superRefine((value, ctx) => {
    const cycles = value.cycle ?? [{}];
    for (const [key, override] of [['', {}], ...Object.entries(value.overrides ?? {})] as const) {
      for (const entry of cycles) {
        for (const current of [false, true]) {
          const representation = mergeItemRepresentation([value, entry, override], current);
          if ((representation.display ?? 'text') !== 'text' && !representation.media) {
            ctx.addIssue({
              code: 'custom',
              path: key ? ['overrides', key, 'representation'] : ['representation'],
              message: 'Media display requires an image or icon in every state/cycle.',
            });
            return;
          }
        }
      }
    }
  });
export const navigationProgressDesignSchema = z.strictObject({
  palette: palette.optional(),
  color: color.optional(),
  track: color.optional(),
  height: z
    .number()
    .min(NAVIGATION_PART_LIMITS.minTrackHeight)
    .max(NAVIGATION_PART_LIMITS.maxTrackHeight)
    .optional(),
  rounded: z.boolean().optional(),
  marker: navigationMediaSchema.nullable().optional(),
  markerSize: z
    .number()
    .min(NAVIGATION_PART_LIMITS.minMarkerSize)
    .max(NAVIGATION_PART_LIMITS.maxMarkerSize)
    .optional(),
});
export const configurableProgressSchema = navigationProgressDesignSchema
  .extend({
    ticks: z.number().int().min(2).max(NAVIGATION_PART_LIMITS.variants).optional(),
    checkpoints: z.boolean().optional(),
    cycle: z
      .array(navigationProgressDesignSchema)
      .min(1)
      .max(NAVIGATION_PART_LIMITS.variants)
      .optional(),
    sections: z.record(anchorTarget, navigationProgressDesignSchema).optional(),
    stages: z
      .array(
        z.strictObject({ at: z.number().min(0).max(1), design: navigationProgressDesignSchema })
      )
      .max(NAVIGATION_PART_LIMITS.variants)
      .optional(),
  })
  .superRefine((value, ctx) => {
    value.stages?.forEach((stage, index, all) => {
      if (index > 0 && stage.at <= (all[index - 1]?.at ?? 0))
        ctx.addIssue({
          code: 'custom',
          path: ['stages', index, 'at'],
          message: 'Progress stages must have increasing, unique thresholds.',
        });
    });
  });
export type NavigationMedia = z.infer<typeof navigationMediaSchema>;
export type NavigationAppearance = z.infer<typeof navigationAppearanceSchema>;
export type NavigationItemDesign = z.infer<typeof navigationItemDesignSchema>;
export type NavigationProgressDesign = z.infer<typeof navigationProgressDesignSchema>;
export type ConfigurableTitleOptions = z.input<typeof configurableTitleSchema>;
export type ConfigurableItemOptions = z.input<typeof configurableItemSchema>;
export type ConfigurableProgressOptions = z.input<typeof configurableProgressSchema>;

/** Shared by validation, rendering and media inspection, including state-specific media. */
export function mergeItemRepresentation(
  layers: readonly NavigationItemDesign[],
  current: boolean
): NonNullable<NavigationItemDesign['representation']> {
  return layers.reduce<NonNullable<NavigationItemDesign['representation']>>(
    (result, layer) => ({
      ...result,
      ...layer.representation,
      ...(current ? layer.selected?.representation : layer.unselected?.representation),
    }),
    {}
  );
}
