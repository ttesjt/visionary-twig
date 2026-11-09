import { DEFAULT_CONTENT_LIMITS } from '../../document/limits.js';
import type { ContentReadResult, ContentSaveResult, ContentUnavailable } from '../contracts.js';
import { assertContentKey } from '../prepare-save.js';
import type { HttpReadEndpoint, HttpTransportOptions, HttpWriteEndpoint } from './contracts.js';
import { HttpFailure } from './response.js';

export const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const MAX_HTTP_TIMEOUT_MS = 2_147_483_647;

type RequestResult = ContentReadResult | ContentSaveResult;
type Endpoint = HttpReadEndpoint | HttpWriteEndpoint;

export function createHttpRequester(options: HttpTransportOptions) {
  const trusted = new URL(options.origin);
  if (
    !['http:', 'https:'].includes(trusted.protocol) ||
    trusted.username ||
    trusted.password ||
    trusted.href !== `${trusted.origin}/`
  )
    throw new TypeError(
      'origin must be an HTTP(S) origin without a path, query, fragment or credentials.'
    );
  const timeoutMs = options.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_CONTENT_LIMITS.maxBytes;
  for (const [name, value] of Object.entries({ timeoutMs, maxResponseBytes })) {
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new RangeError(`${name} must be a positive safe integer.`);
  }
  if (timeoutMs > MAX_HTTP_TIMEOUT_MS)
    throw new RangeError(`timeoutMs must not exceed ${MAX_HTTP_TIMEOUT_MS}.`);
  // Validate host-provided header names before the first request.
  const names = new Headers();
  names.set(options.versionHeaders.revision, '1');
  if (options.versionHeaders.etag !== undefined) names.set(options.versionHeaders.etag, 'etag');
  if (options.versionHeaders.revision.toLowerCase() === options.versionHeaders.etag?.toLowerCase())
    throw new TypeError('Revision and etag response headers must be distinct.');
  const fetcher = options.fetch ?? globalThis.fetch;

  async function run<T extends RequestResult>(
    endpoint: Endpoint | undefined,
    key: string,
    signal: AbortSignal | undefined,
    handle: (response: Response) => Promise<T>,
    body?: string,
    extraHeaders?: Readonly<Record<string, string>>
  ): Promise<T | ContentUnavailable | { readonly status: 'cancelled' }> {
    assertContentKey(key);
    if (signal?.aborted) return { status: 'cancelled' };
    if (!endpoint)
      return {
        status: 'unavailable',
        reason: 'unconfigured',
        message: 'Content endpoint is not configured.',
      };
    const configuredEndpoint = endpoint;
    let url: URL;
    try {
      url = new URL(endpoint.urlForKey(key), trusted);
    } catch {
      return {
        status: 'unavailable',
        reason: 'unsafe-endpoint',
        message: 'Invalid content endpoint.',
      };
    }
    if (url.origin !== trusted.origin || url.username || url.password || url.hash)
      return {
        status: 'unavailable',
        reason: 'unsafe-endpoint',
        message:
          'Content endpoint must stay within the configured origin and have no credentials or fragment.',
      };
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const interrupted = new Promise<ContentUnavailable | { readonly status: 'cancelled' }>(
      (resolve) => {
        controller.signal.addEventListener(
          'abort',
          () =>
            resolve(
              timedOut
                ? {
                    status: 'unavailable',
                    reason: 'timeout',
                    message: 'Content request timed out.',
                  }
                : { status: 'cancelled' }
            ),
          { once: true }
        );
      }
    );
    async function execute(): Promise<T | ContentUnavailable> {
      try {
        const headers = new Headers(configuredEndpoint.headers);
        for (const [name, value] of Object.entries(extraHeaders ?? {})) headers.set(name, value);
        headers.set('accept', 'application/json');
        if (body !== undefined) headers.set('content-type', 'application/json');
        const response = await fetcher(url, {
          method: configuredEndpoint.method,
          headers,
          redirect: 'error',
          credentials: configuredEndpoint.credentials ?? 'omit',
          cache: configuredEndpoint.cache ?? 'no-store',
          signal: controller.signal,
          ...(body === undefined ? {} : { body }),
        });
        return await handle(response);
      } catch (error) {
        if (error instanceof HttpFailure) return error.result;
        // Cancellation is classified by the competing deadline promise. Never expose
        // fetch errors that may contain URLs, tokens or server response details.
        return { status: 'unavailable', reason: 'network', message: 'Content request failed.' };
      }
    }
    try {
      return await Promise.race([interrupted, execute()]);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
      controller.abort();
    }
  }
  return { run, maxResponseBytes };
}
