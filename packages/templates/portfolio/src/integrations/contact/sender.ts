import 'server-only';

import { EmailDeliveryError, type EmailSender } from '@frontend/email';

export async function resolveContactSender(): Promise<EmailSender> {
  const { createOutboxSender } = await import('./outbox');
  if (process.env.PORTFOLIO_CONTACT_DELIVERY === 'cloudflare')
    throw new EmailDeliveryError('configuration');
  return createOutboxSender(process.env.PORTFOLIO_CONTACT_OUTBOX);
}
