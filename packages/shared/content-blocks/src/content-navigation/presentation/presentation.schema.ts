import { z } from 'zod';
const identifier = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'Use a registered presentation identifier.');
export const navigationPartSelectionSchema = z.strictObject({
  id: identifier,
  options: z.record(z.string(), z.json()).optional(),
});
export const navigationPresentationSchema = z.strictObject({
  preset: identifier.optional(),
  options: z.record(z.string(), z.json()).optional(),
  parts: z
    .strictObject({
      title: navigationPartSelectionSchema.optional(),
      item: navigationPartSelectionSchema.optional(),
      progress: navigationPartSelectionSchema.optional(),
    })
    .optional(),
});
export type NavigationPresentation = z.infer<typeof navigationPresentationSchema>;
export type NavigationPartSelection = z.infer<typeof navigationPartSelectionSchema>;
export const NAVIGATION_PARTS = ['title', 'item', 'progress'] as const;
export type NavigationPart = (typeof NAVIGATION_PARTS)[number];
export const DEFAULT_NAVIGATION_PRESENTATION = 'default';
