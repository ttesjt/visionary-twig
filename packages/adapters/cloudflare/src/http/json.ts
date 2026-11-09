export const CLOUDFLARE_RESPONSE_MAX_BYTES = 65_536;
export type HttpFailure = 'network' | 'timeout' | 'aborted' | 'invalid-response';
export class CloudflareHttpError extends Error {
  constructor(
    readonly code: HttpFailure,
    options: ErrorOptions = {}
  ) {
    super('Cloudflare request failed: ' + code, options);
    this.name = 'CloudflareHttpError';
  }
}
export interface JsonRequestOptions {
  readonly body: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}
/** Bounds the entire fetch/body operation, including transports that ignore abort. */
export async function requestCloudflareJson(
  url: string,
  options: JsonRequestOptions,
  fetcher: typeof fetch = fetch
): Promise<{ readonly status: number; readonly data: unknown }> {
  const controller = new AbortController();
  let rejectDeadline: (error: Error) => void = () => {};
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject;
  });
  const abort = () => {
    controller.abort();
    rejectDeadline(new CloudflareHttpError('aborted'));
  };
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => {
    controller.abort();
    rejectDeadline(new CloudflareHttpError('timeout'));
  }, options.timeoutMs);
  let cancelBody: () => void = () => {};
  const operation = async () => {
    if (options.signal?.aborted) throw new CloudflareHttpError('aborted');
    const response = await fetcher(url, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (controller.signal.aborted) {
      void response.body?.cancel().catch(() => {});
      throw new CloudflareHttpError('aborted');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new CloudflareHttpError('invalid-response');
    cancelBody = () => {
      void reader.cancel().catch(() => {});
    };
    let text = '';
    let size = 0;
    const decoder = new TextDecoder('utf-8', { fatal: true });
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        const chunk: unknown = part.value;
        if (!(chunk instanceof Uint8Array)) throw new CloudflareHttpError('invalid-response');
        size += chunk.byteLength;
        if (size > CLOUDFLARE_RESPONSE_MAX_BYTES) throw new CloudflareHttpError('invalid-response');
        text += decoder.decode(chunk, { stream: true });
      }
      text += decoder.decode();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch (cause) {
        if (response.ok) throw new CloudflareHttpError('invalid-response', { cause });
        data = null;
      }
      return { status: response.status, data };
    } catch (cause) {
      if (cause instanceof CloudflareHttpError) throw cause;
      throw new CloudflareHttpError('invalid-response', { cause });
    } finally {
      cancelBody();
      reader.releaseLock();
    }
  };
  try {
    return await Promise.race([operation(), deadline]);
  } catch (cause) {
    if (cause instanceof CloudflareHttpError) throw cause;
    throw new CloudflareHttpError('network', { cause });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
    controller.abort();
    cancelBody();
  }
}
