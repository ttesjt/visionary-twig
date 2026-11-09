import { DEFAULT_MAX_RESOURCE_BYTES, positiveInteger } from './core/constants.js';
import { ResourceError, type ResourceReader } from './core/contracts.js';
export function createHttpResourceReader(
  options: { readonly fetch?: typeof fetch; readonly maxBytes?: number } = {}
): ResourceReader {
  const transport = options.fetch ?? globalThis.fetch;
  const maxBytes = positiveInteger(options.maxBytes ?? DEFAULT_MAX_RESOURCE_BYTES, 'maxBytes');
  return async (resource, signal) => {
    const response = await transport(resource.url, { signal, credentials: 'same-origin' });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new ResourceError('http', resource.id, { cause: new Error(`HTTP ${response.status}`) });
    }
    if (!response.body) throw new ResourceError('invalid-json', resource.id);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let text = '';
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > maxBytes) {
          void reader.cancel().catch(() => {});
          throw new ResourceError('too-large', resource.id);
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    try {
      return JSON.parse(text) as unknown;
    } catch (cause) {
      throw new ResourceError('invalid-json', resource.id, { cause });
    }
  };
}
