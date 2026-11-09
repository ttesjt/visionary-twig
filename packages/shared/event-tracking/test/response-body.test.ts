import { afterEach, expect, it, vi } from 'vitest';
import { EventTracker } from '../src/index.js';

afterEach(() => vi.unstubAllGlobals());

it.each([202, 503])('preserves HTTP %s when response body cleanup rejects', async (status) => {
  const body = new ReadableStream({
    start(controller) {
      controller.error(new TypeError('Response body interrupted'));
    },
  });
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status })));
  const tracker = new EventTracker({
    projects: { sample: { url: 'https://events.example.test/capture' } },
  });
  await expect(tracker.track('sample', 'opened', {})).resolves.toEqual(
    status === 202
      ? { status: 'accepted', httpStatus: status }
      : { status: 'failed', reason: 'http-error', httpStatus: status }
  );
});

it('does not wait for response body cleanup after receiving HTTP status', async () => {
  const cancel = vi.fn(() => new Promise<void>(() => {}));
  const body = new ReadableStream({ cancel });
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 202 }))
  );
  const tracker = new EventTracker({
    projects: { sample: { url: 'https://events.example.test/capture' } },
    timeoutMs: 30,
  });
  await expect(tracker.track('sample', 'opened', {})).resolves.toEqual({
    status: 'accepted',
    httpStatus: 202,
  });
  expect(cancel).toHaveBeenCalledOnce();
});
