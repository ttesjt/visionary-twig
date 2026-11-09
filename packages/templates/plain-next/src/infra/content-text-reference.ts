import { z } from 'zod';

/** Content fields opt in by accepting this exact, JSON-serializable reference. */
export const contentTextReferenceSchema = z.strictObject({
  $text: z.strictObject({ namespace: z.string().min(1), key: z.string().min(1) }),
});
export type ContentTextReference = z.output<typeof contentTextReferenceSchema>;
