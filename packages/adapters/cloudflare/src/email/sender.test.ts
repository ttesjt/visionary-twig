import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCloudflareEmailSender } from './sender.js';
const message = {
  from: 'site@example.test',
  to: 'owner@example.test',
  replyTo: 'visitor@example.test',
  subject: 'A message',
  text: 'Hello.',
};
const accountId = 'a'.repeat(32);
const accepted = (values = {}) => ({
  success: true,
  errors: [],
  result: { delivered: [message.to], queued: [], permanent_bounces: [], ...values },
});
function sender(fetcher: typeof fetch, timeoutMs = 100) {
  return createCloudflareEmailSender({
    accountId,
    apiToken: 'private-test-token',
    fetch: fetcher,
    timeoutMs,
  });
}
afterEach(() => vi.useRealTimers());
describe('Cloudflare email transport', () => {
  it('maps only supported message fields and confirms the requested recipient', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(accepted({ message_id: 'opaque-id' })));
    expect(await sender(fetcher).send(message)).toEqual({
      status: 'delivered',
      messageId: 'opaque-id',
    });
    const [url, request] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`
    );
    expect(request?.headers).toMatchObject({ Authorization: 'Bearer private-test-token' });
    if (typeof request?.body !== 'string') throw new Error('Expected a JSON email request.');
    expect(JSON.parse(request.body)).toEqual({
      from: message.from,
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
    });
  });
  it('treats a queued recipient as accepted without claiming inbox delivery', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(accepted({ delivered: [], queued: [message.to] })));
    expect(await sender(fetcher).send(message)).toEqual({ status: 'accepted' });
  });
  it.each([
    { delivered: [], permanent_bounces: [message.to] },
    { suppressed_recipients: [message.to] },
    { delivered: ['someone-else@example.test'] },
  ])('does not report success for rejected or unacknowledged recipients', async (result) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(accepted(result)));
    await expect(sender(fetcher).send(message)).rejects.toBeInstanceOf(Error);
  });
  it('preserves safe failure codes without reflecting provider messages or secrets', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          success: false,
          errors: [{ code: 10102, message: 'private-test-token' }],
          result: null,
        },
        { status: 403 }
      )
    );
    const failure = await sender(fetcher)
      .send(message)
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: 'unauthorized',
      providerStatus: 403,
      providerCodes: [10102],
    });
    if (!(failure instanceof Error)) throw new Error('Expected a delivery failure.');
    expect(failure.message).not.toContain('private-test-token');
  });
  it('rejects unsafe mail before calling the provider', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      sender(fetcher).send({ ...message, subject: 'Bad\nHeader' })
    ).rejects.toMatchObject({ code: 'invalid-message' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('ends hanging fetch operations even when the injected transport ignores abort', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const pending = expect(sender(fetcher).send(message)).rejects.toMatchObject({
      code: 'timeout',
    });
    await vi.advanceTimersByTimeAsync(101);
    await pending;
  });
  it('bounds hanging response bodies and cancels their reader', async () => {
    vi.useFakeTimers();
    const cancelled = vi.fn();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(new ReadableStream({ cancel: cancelled })));
    const pending = expect(sender(fetcher).send(message)).rejects.toMatchObject({
      code: 'timeout',
    });
    await vi.advanceTimersByTimeAsync(101);
    await pending;
    expect(cancelled).toHaveBeenCalled();
  });
  it('honors cancellation and rejects oversized provider responses', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn<typeof fetch>();
    await expect(sender(fetcher).send(message, controller.signal)).rejects.toMatchObject({
      code: 'aborted',
    });
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(new Response('x'.repeat(70_000)));
    await expect(sender(fetcher).send(message)).rejects.toMatchObject({ code: 'invalid-response' });
  });
});
