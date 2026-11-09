import { describe, expect, it, vi } from 'vitest';
import { readPreviewBody, sameLocalOrigin, validatePreviewInput } from './preview-request';
import { MAX_PREVIEW_REQUEST_BYTES, PREVIEW_BODY_TIMEOUT_MS } from './preview-policy';
const document = {
  documentId: 'preview',
  schemaVersion: 1,
  revision: 1,
  data: { root: {}, content: [] },
};
const request = (host: string, origin: string) =>
  new Request('http://localhost/api/preview', { headers: { host, origin } });

describe('preview request boundary', () => {
  it('checks actual origin/host and loopback without trusting forwarded headers', () => {
    expect(sameLocalOrigin(request('127.0.0.1:3121', 'http://127.0.0.1:3121'))).toBe(true);
    for (const [host, origin] of [
      ['127.0.0.1:3121', 'http://localhost:3121'],
      ['127.0.0.1:3121', 'https://elsewhere.test'],
      ['elsewhere.test', 'http://elsewhere.test'],
      ['127.0.0.1:3121', 'null'],
    ])
      expect(sameLocalOrigin(request(host ?? '', origin ?? ''))).toBe(false);
  });
  it('reuses full document, binding and context validation', () => {
    expect(validatePreviewInput({ document, context: {} }).ok).toBe(true);
    for (const value of [
      null,
      { document, url: 'file:///private/anything' },
      { document, context: [] },
      { document: { ...document, schemaVersion: 2 } },
      { document: { ...document, variables: { content: {} } }, context: { content: {} } },
    ])
      expect(validatePreviewInput(value).ok).toBe(false);
  });
  it('bounds streamed bytes without relying on content-length and validates UTF-8/JSON', async () => {
    for (const body of [
      new Uint8Array([255]),
      '{broken',
      ' '.repeat(MAX_PREVIEW_REQUEST_BYTES + 1),
    ]) {
      const result = await readPreviewBody(
        new Request('http://localhost', { method: 'POST', body })
      );
      expect(result.ok).toBe(false);
    }
    expect(
      await readPreviewBody(
        new Request('http://localhost', { method: 'POST', body: JSON.stringify({ document }) })
      )
    ).toEqual({ ok: true, value: { document } });
  });
  it('cancels stalled body streams at a bounded deadline', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    try {
      const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({ cancel });
      const pending = readPreviewBody({ body: stream });
      await vi.advanceTimersByTimeAsync(PREVIEW_BODY_TIMEOUT_MS);
      expect((await pending).ok).toBe(false);
      expect(cancel).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
