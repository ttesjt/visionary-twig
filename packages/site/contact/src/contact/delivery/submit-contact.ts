import { EmailDeliveryError } from '@frontend/email';
import type { EmailSender } from '@frontend/email';
import { validateContact } from '../contracts.js';
import type { ContactSubmitResult } from '../contracts.js';
import { createContactMessage } from './contact-message.js';
import type { ContactEmailOptions } from './contact-message.js';

export interface ContactDeliveryOptions extends ContactEmailOptions {
  readonly sender: EmailSender;
}

export type ContactDeliveryResult = Extract<
  ContactSubmitResult,
  { status: 'accepted' | 'invalid' }
>;

/** Validate request input and hand one notification to the injected sender. */
export async function submitContact(
  input: unknown,
  options: ContactDeliveryOptions,
  signal?: AbortSignal
): Promise<ContactDeliveryResult> {
  if (signal?.aborted) throw new EmailDeliveryError('aborted', { cause: signal.reason });
  const result = validateContact(input);
  if (!result.ok) return { status: 'invalid', fields: result.fields };

  await options.sender.send(createContactMessage(result.values, options), signal);
  return { status: 'accepted' };
}
