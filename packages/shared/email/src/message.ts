import { z } from 'zod';

export const EMAIL_LIMITS = { addressCharacters: 254, subjectCharacters: 200 } as const;
const headerText = z
  .string()
  .min(1)
  .refine((value) => !/[\r\n\x00]/.test(value), 'Invalid mail header.');
export const emailAddressSchema = z
  .email()
  .max(EMAIL_LIMITS.addressCharacters)
  .refine((value) => !/[\r\n\x00]/.test(value), 'Invalid mail address.');
export const emailMessageSchema = z.strictObject({
  from: emailAddressSchema,
  to: emailAddressSchema,
  replyTo: emailAddressSchema.optional(),
  subject: headerText.max(EMAIL_LIMITS.subjectCharacters),
  text: z.string().min(1),
});
export type EmailMessage = Readonly<z.infer<typeof emailMessageSchema>>;
