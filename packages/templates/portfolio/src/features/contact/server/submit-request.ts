import type { ContactSubmitResult } from '@frontend/contact/contracts';
import { submitContact } from '@frontend/contact/server';
import { EmailDeliveryError } from '@frontend/email';
import { serverText } from '../../../infra/resources/server';
import { contactConfiguration } from './configuration';
import { reserveContactAttempt } from './rate-limit';
import { InvalidContactBody, readContactBody } from './request-body';
import type { EmailSender } from '@frontend/email';
import { RESOURCE_SCOPES } from '../../../site/resource-scopes';
import { TEXT_LOCALES } from '../../../site/text';

const CONTACT_REQUEST_TIMEOUT_MS = 12_000;
const invalidInput = { status: 'invalid', fields: [] } as const;

function respond(result: ContactSubmitResult, status: number, retryAfter?: number): Response {
  return Response.json(result, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(retryAfter === undefined ? {} : { 'Retry-After': String(retryAfter) }),
    },
  });
}

export async function handleContactRequest(
  request: Request,
  resolveSender: () => Promise<EmailSender>
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const locale = TEXT_LOCALES.find((lang) => searchParams.get('locale') === lang);
  if (!locale) return respond(invalidInput, 400);
  const configuration = contactConfiguration(request, process.env);
  if (configuration.status === 'invalid-origin') return respond(invalidInput, 403);
  if (configuration.status === 'unavailable')
    return respond({ status: 'failed', code: 'unavailable' }, 503);
  const retryAfter = reserveContactAttempt();
  if (retryAfter !== null)
    return respond({ status: 'failed', code: 'rate-limited' }, 429, retryAfter);

  const deadline = AbortSignal.timeout(CONTACT_REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, deadline]);
  try {
    const input = await readContactBody(request, signal);
    const [dictionary, sender] = await Promise.all([
      serverText(locale, RESOURCE_SCOPES.metadata),
      resolveSender(),
    ]);
    const result = await submitContact(
      input,
      {
        from: configuration.from,
        to: configuration.to,
        sender,
        text: {
          subject: dictionary.getText('main', 'contact.notification.subject'),
          name: dictionary.getText('main', 'contact.form.name'),
          email: dictionary.getText('main', 'contact.form.email'),
          message: dictionary.getText('main', 'contact.form.message'),
        },
      },
      signal
    );
    return respond(result, result.status === 'accepted' ? 202 : 422);
  } catch (error) {
    if (error instanceof InvalidContactBody) return respond(invalidInput, error.status);
    if (deadline.aborted || (error instanceof EmailDeliveryError && error.code === 'timeout'))
      return respond({ status: 'failed', code: 'timeout' }, 504);
    if (request.signal.aborted) return respond({ status: 'failed', code: 'timeout' }, 408);
    const deliveryCode = error instanceof EmailDeliveryError ? error.code : 'unavailable';
    console.error('Contact submission failed', { code: deliveryCode });
    return deliveryCode === 'rejected'
      ? respond({ status: 'failed', code: 'delivery-failed' }, 502)
      : respond({ status: 'failed', code: 'unavailable' }, 503);
  }
}
