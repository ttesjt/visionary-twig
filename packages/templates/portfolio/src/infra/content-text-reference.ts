import { z } from 'zod';

/** Content fields opt in by accepting this exact, JSON-serializable reference. */
export const contentTextReferenceSchema = z.strictObject({
  $text: z.strictObject({ namespace: z.string().min(1), key: z.string().min(1) }),
});
export type ContentTextReference = z.output<typeof contentTextReferenceSchema>;

/** Inspect nested JSON without resolving or rewriting its Text references. */
export function validateContentTextReferences(
  value: unknown,
  context: z.RefinementCtx,
  path: (string | number)[] = []
): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((child: unknown, index) =>
      validateContentTextReferences(child, context, [...path, index])
    );
    return;
  }
  if (Object.hasOwn(value, '$text')) {
    const reference = contentTextReferenceSchema.safeParse(value);
    if (!reference.success) {
      for (const issue of reference.error.issues)
        context.addIssue({ ...issue, path: [...path, ...issue.path] });
    }
    return;
  }
  for (const [key, child] of Object.entries(value))
    validateContentTextReferences(child, context, [...path, key]);
}
