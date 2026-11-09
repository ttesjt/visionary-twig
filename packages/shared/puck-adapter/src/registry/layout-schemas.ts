import { z } from 'zod';
import {
  ALIGNS,
  COLLAPSES,
  CONTAINER_WIDTHS,
  GRID_COLUMNS,
  JUSTIFIES,
  SPACES,
} from '@frontend/ui/layout-options';

export const containerSchema = z.strictObject({
  width: z.enum(CONTAINER_WIDTHS).optional(),
  as: z.enum(['div', 'section', 'article']).optional(),
});
export const columnSchema = z.strictObject({
  space: z.enum(SPACES).optional(),
  align: z.enum(ALIGNS).optional(),
});
export const rowSchema = columnSchema.extend({
  collapse: z.enum(COLLAPSES).optional(),
  justify: z.enum(JUSTIFIES).optional(),
  wrap: z.enum(['nowrap', 'wrap']).optional(),
});
export const gridSchema = z.strictObject({
  columns: z.literal(GRID_COLUMNS).optional(),
  space: z.enum(SPACES).optional(),
  collapse: z.enum(COLLAPSES).optional(),
});
