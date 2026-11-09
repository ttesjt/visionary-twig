import { afterEach, expect, it, vi } from 'vitest';
import { createLocalPreviewAdapter } from './preview-adapter';
import { PREVIEW_TRACKING_GRANTED, PREVIEW_TRACKING_HEADER } from './tracking-signal';
import { sampleDocument } from '../samples/sample-document';

afterEach(() => vi.unstubAllGlobals());
it.each([false, true])(
  'sends a tracking grant only when the current client permits it (%s)',
  async (permitted) => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ url: '/preview/abcd' }));
    vi.stubGlobal('fetch', send);
    const preview = createLocalPreviewAdapter(permitted, 'en');
    await preview({ document: sampleDocument, theme: 'light' }, new AbortController().signal);
    expect(new Headers(send.mock.calls[0]?.[1]?.headers).get(PREVIEW_TRACKING_HEADER)).toBe(
      permitted ? PREVIEW_TRACKING_GRANTED : null
    );
  }
);
