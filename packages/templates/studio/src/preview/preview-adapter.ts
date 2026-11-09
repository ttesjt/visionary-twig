import type { TextLocale } from '../site/text';
import { studioHref } from '../workspace/navigation/studio-url';
import type { StudioPreviewAdapter } from '@frontend/studio';
import { PREVIEW_TRACKING_GRANTED, PREVIEW_TRACKING_HEADER } from './tracking-signal';

export function createLocalPreviewAdapter(
  permitted: boolean,
  locale: TextLocale
): StudioPreviewAdapter {
  return async ({ document, context, theme }, signal) => {
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(permitted ? { [PREVIEW_TRACKING_HEADER]: PREVIEW_TRACKING_GRANTED } : {}),
      },
      body: JSON.stringify({ document, context }),
      signal,
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const body: unknown = await response.json();
    if (
      response.ok &&
      typeof body === 'object' &&
      body !== null &&
      'url' in body &&
      typeof body.url === 'string'
    ) {
      const url = new URL(body.url, location.origin);
      if (
        url.origin === location.origin &&
        /^\/preview\/[0-9a-f-]+$/.test(url.pathname) &&
        !url.search &&
        !url.hash
      )
        return {
          ok: true,
          url: studioHref(`${url.pathname}?theme=${encodeURIComponent(theme)}`, locale),
        };
    }
    return {
      ok: false,
      errors: [
        {
          code: 'preview-request-failed',
          path: [],
          message: `Local preview failed (HTTP ${response.status}). Check the document and context, then retry.`,
        },
      ],
    };
  };
}
