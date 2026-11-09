import { z } from 'zod';

export const SCROLL_BOUNDARY_RANGES = ['past-start', 'within'] as const;
export const SCROLL_BOUNDARY_STATES = ['pending', 'before', 'active', 'after', 'disabled'] as const;
export const DEFAULT_SCROLL_BOUNDARY_RANGE = 'past-start';
export const DEFAULT_SCROLL_BOUNDARY_OFFSET = 0;
export const scrollBoundaryPropsSchema = z.strictObject({
  range: z.enum(SCROLL_BOUNDARY_RANGES).optional(),
  /** Behavioral reference line in CSS pixels, relative to the chosen scroll viewport. */
  offset: z.number().finite().nonnegative().optional(),
  disabled: z.boolean().optional(),
});
export type ScrollBoundaryData = z.infer<typeof scrollBoundaryPropsSchema>;
export type ScrollBoundaryState = (typeof SCROLL_BOUNDARY_STATES)[number];
export type ScrollBoundaryRange = (typeof SCROLL_BOUNDARY_RANGES)[number];
