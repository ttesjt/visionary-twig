// @vitest-environment node
import type { EmailSender } from '@frontend/email';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handleContactRequest } from './submit-request';

vi.mock('server-only', () => ({}));
beforeEach(() => {
  vi.stubEnv('PORTFOLIO_CONTACT_DELIVERY', 'local');
  vi.stubEnv('PORTFOLIO_CONTACT_ORIGIN', 'http://localhost:3204');
  vi.stubEnv('PORTFOLIO_CONTACT_FROM', 'portfolio@example.test');
  vi.stubEnv('PORTFOLIO_CONTACT_TO', 'outbox@example.test');
});
afterEach(() => vi.unstubAllEnvs());

function request(
  locale: string,
  origin = 'http://localhost:3204',
  message = 'A small project question.'
) {
  return new Request('http://localhost:3204/api/contact?locale=' + locale, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sample Visitor', email: 'visitor@example.test', message }),
  });
}

it.each(['en', 'zh'] as const)(
  'delivers the %s request through the injected host sender',
  async (locale) => {
    const send = vi.fn<EmailSender['send']>().mockResolvedValue({ status: 'accepted' });
    const response = await handleContactRequest(request(locale), () => Promise.resolve({ send }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'accepted' });
    expect(send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ replyTo: 'visitor@example.test', to: 'outbox@example.test' }),
      expect.any(AbortSignal)
    );
  }
);

it('rejects an unrelated origin before resolving the sender', async () => {
  const sender = vi.fn<() => Promise<EmailSender>>();
  const response = await handleContactRequest(
    request('en', 'https://elsewhere.example.test'),
    sender
  );
  expect(response.status).toBe(403);
  expect(sender).not.toHaveBeenCalled();
});

it('retains field validation without sending a message', async () => {
  const send = vi.fn<EmailSender['send']>();
  const response = await handleContactRequest(request('en', undefined, ''), () =>
    Promise.resolve({ send })
  );
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ status: 'invalid' });
  expect(send).not.toHaveBeenCalled();
});
