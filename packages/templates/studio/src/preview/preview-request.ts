import { resolveDocument } from '@frontend/ui-document';
import type { ContentIssue, ContentResult } from '@frontend/ui-document';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import type { PreviewSnapshot } from './preview-store';
import { MAX_PREVIEW_REQUEST_BYTES, PREVIEW_BODY_TIMEOUT_MS } from './preview-policy';

function failure(
  code: string,
  message: string
): { readonly ok: false; readonly errors: readonly ContentIssue[] } {
  return { ok: false, errors: [{ code, path: [], message }] };
}
export function sameLocalOrigin(request: Request): boolean {
  const host = request.headers.get('host');
  const origin = request.headers.get('origin');
  if (!host || !origin || origin !== `${new URL(request.url).protocol}//${host}`) return false;
  try {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}
export async function readPreviewBody(
  request: Pick<Request, 'body'>
): Promise<ContentResult<unknown>> {
  if (!request.body) return failure('invalid-json', 'Expected a JSON preview request.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error('Preview body deadline exceeded.')),
      PREVIEW_BODY_TIMEOUT_MS
    );
  });
  try {
    for (;;) {
      const chunk = await Promise.race([reader.read(), deadline]);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_PREVIEW_REQUEST_BYTES)
        return failure('preview-too-large', 'Preview request exceeds its byte limit.');
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const input: unknown = JSON.parse(text);
    return { ok: true, value: input };
  } catch {
    return failure(
      'invalid-preview-body',
      'Expected bounded UTF-8 JSON within the request deadline.'
    );
  } finally {
    clearTimeout(timeout);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function validatePreviewInput(input: unknown): ContentResult<PreviewSnapshot> {
  if (typeof input !== 'object' || input === null || Array.isArray(input) || !('document' in input))
    return failure('invalid-preview-input', 'Expected a document and optional context.');
  if (Object.keys(input).some((key) => key !== 'document' && key !== 'context'))
    return failure('invalid-preview-input', 'Unknown preview request field.');
  const context: unknown = 'context' in input ? input.context : {};
  const result = resolveDocument(input.document, contentRegistry, { context });
  return result.ok ? { ok: true, value: { document: result.value.document, context } } : result;
}
