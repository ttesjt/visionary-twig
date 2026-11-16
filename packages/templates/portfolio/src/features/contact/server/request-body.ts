import { CONTACT_LIMITS } from '@frontend/contact/contracts';

// A JSON string escape can take six ASCII bytes per UTF-16 code unit.
const CONTACT_FIELD_JSON_OVERHEAD_BYTES = 256;
const MAX_CONTACT_JSON_BYTES =
  (CONTACT_LIMITS.name + CONTACT_LIMITS.email + CONTACT_LIMITS.message) * 6 +
  CONTACT_FIELD_JSON_OVERHEAD_BYTES;

export class InvalidContactBody extends Error {
  constructor(
    readonly status: 400 | 413 | 415,
    options?: ErrorOptions
  ) {
    super('Invalid contact request body.', options);
    this.name = 'InvalidContactBody';
  }
}

export async function readContactBody(request: Request, signal: AbortSignal): Promise<unknown> {
  const mediaType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') throw new InvalidContactBody(415);
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidContactBody(400);
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let readBytes = 0;
    let json = '';
    for (;;) {
      signal.throwIfAborted();
      const next = await reader.read();
      signal.throwIfAborted();
      if (next.done) break;
      readBytes += next.value.byteLength;
      if (readBytes > MAX_CONTACT_JSON_BYTES) throw new InvalidContactBody(413);
      json += decoder.decode(next.value, { stream: true });
    }
    const input: unknown = JSON.parse(json + decoder.decode());
    return input;
  } catch (cause) {
    cancel();
    if (signal.aborted) signal.throwIfAborted();
    if (cause instanceof InvalidContactBody) throw cause;
    throw new InvalidContactBody(400, { cause });
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}
