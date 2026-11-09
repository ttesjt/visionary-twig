import { afterEach, expect, it, vi } from 'vitest';
import { fetchRemoteSettings } from './fetch-settings';
afterEach(() => vi.unstubAllGlobals());
it('checks HTTP status and runtime schema rather than trusting a TypeScript assertion', async () => {
  const fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetcher);
  for (const [response, kind] of [
    [new Response('{}', { status: 404 }), 'http'],
    [new Response('{'), 'invalid-json'],
    [Response.json({ density: 'arbitrary', showNote: true }), 'invalid-data'],
  ] as const) {
    fetcher.mockResolvedValueOnce(response);
    await expect(fetchRemoteSettings('/sample')).rejects.toMatchObject({ kind });
  }
  fetcher.mockRejectedValueOnce(new Error('offline'));
  await expect(fetchRemoteSettings('/sample')).rejects.toMatchObject({ kind: 'network' });
  fetcher.mockResolvedValueOnce(Response.json({ density: 'compact', showNote: false }));
  await expect(fetchRemoteSettings('/sample')).resolves.toEqual({
    density: 'compact',
    showNote: false,
  });
});

it.each([
  new TypeError('Response body interrupted'),
  new DOMException('Response body aborted', 'AbortError'),
  new DOMException('Response body timed out', 'TimeoutError'),
])('classifies response body failure as network: %s', async (error) => {
  const body = new ReadableStream({
    start(controller) {
      controller.error(error);
    },
  });
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(body)));
  await expect(fetchRemoteSettings('/sample')).rejects.toMatchObject({ kind: 'network' });
});
