// Cap the actual stream too: chunked requests may omit Content-Length.
const MAX_BODY_BYTES = 2048;

export async function readJson(
  request: Pick<Request, 'body'>
): Promise<{ ok: true; value: unknown } | { ok: false; error: 'invalid-json' | 'body-too-large' }> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, error: 'invalid-json' };
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let json = '';
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, error: 'body-too-large' };
      }
      json += decoder.decode(chunk.value, { stream: true });
    }
    return { ok: true, value: JSON.parse(json + decoder.decode()) };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return { ok: false, error: 'invalid-json' };
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}
