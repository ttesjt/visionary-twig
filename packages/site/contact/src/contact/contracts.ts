import { EMAIL_LIMITS, emailAddressSchema } from '@frontend/email';
import { z } from 'zod';

export const CONTACT_LIMITS = {
  name: 120,
  email: EMAIL_LIMITS.addressCharacters,
  message: 4_000,
} as const;

export const contactValuesSchema = z.strictObject({
  name: z.string().trim().max(CONTACT_LIMITS.name).optional(),
  email: z.string().trim().pipe(emailAddressSchema),
  message: z.string().trim().min(1).max(CONTACT_LIMITS.message),
});
export type ContactValues = Readonly<z.infer<typeof contactValuesSchema>>;

const contactFieldSchema = contactValuesSchema.keyof();
export type ContactField = z.infer<typeof contactFieldSchema>;
export const CONTACT_FIELDS: readonly ContactField[] = Object.freeze(contactFieldSchema.options);

const contactFailureCodeSchema = z.enum([
  'unavailable',
  'timeout',
  'delivery-failed',
  'rate-limited',
  'verification-failed',
]);
export type ContactFailureCode = z.infer<typeof contactFailureCodeSchema>;

export const contactSubmitResultSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('accepted') }),
  z.strictObject({ status: z.literal('invalid'), fields: z.array(contactFieldSchema).readonly() }),
  z.strictObject({ status: z.literal('failed'), code: contactFailureCodeSchema }),
]);
export type ContactSubmitResult = Readonly<z.infer<typeof contactSubmitResultSchema>>;
export type ContactSubmit = (
  values: ContactValues,
  signal: AbortSignal
) => Promise<ContactSubmitResult>;

type ContactValidation =
  | { readonly ok: true; readonly values: ContactValues }
  | { readonly ok: false; readonly fields: readonly ContactField[] };

/** Return only field identifiers so validation messages can be localized by the caller. */
export function validateContact(input: unknown): ContactValidation {
  const parsed = contactValuesSchema.safeParse(input);
  if (parsed.success) return { ok: true, values: parsed.data };

  const fields = new Set<ContactField>();
  for (const issue of parsed.error.issues) {
    const field = contactFieldSchema.safeParse(issue.path[0]);
    if (field.success) fields.add(field.data);
  }
  return { ok: false, fields: [...fields] };
}
