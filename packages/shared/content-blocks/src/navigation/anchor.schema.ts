import { z } from 'zod';

/** Deliberately independent of Puck node IDs and translated headings. */
export const anchorNameSchema = z
  .string()
  .regex(/^[A-Za-z][\w.-]*$/u, 'Use a stable fragment name starting with a letter.');
export const anchorPropsSchema = z.strictObject({ name: anchorNameSchema });
export type AnchorData = z.infer<typeof anchorPropsSchema>;
