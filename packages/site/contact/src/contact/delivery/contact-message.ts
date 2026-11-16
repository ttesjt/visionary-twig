import { EmailDeliveryError, emailMessageSchema } from '@frontend/email';
import type { EmailMessage } from '@frontend/email';
import type { ContactValues } from '../contracts.js';

export interface ContactEmailOptions {
  readonly from: string;
  readonly to: string;
  readonly text: {
    readonly subject: string;
    readonly name: string;
    readonly email: string;
    readonly message: string;
  };
}

export function createContactMessage(
  values: ContactValues,
  options: ContactEmailOptions
): EmailMessage {
  const { text } = options;
  const body = [
    ...(values.name ? [`${text.name}: ${values.name}`] : []),
    `${text.email}: ${values.email}`,
    '',
    `${text.message}:`,
    values.message,
  ];
  const message = emailMessageSchema.safeParse({
    from: options.from,
    to: options.to,
    replyTo: values.email,
    subject: text.subject,
    text: body.join('\n'),
  });
  if (!message.success) throw new EmailDeliveryError('configuration', { cause: message.error });
  return message.data;
}
