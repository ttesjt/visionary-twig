import type { ContentUnavailable, ContentVersion } from '../contracts.js';
import type { HttpTransportOptions } from './contracts.js';

export class HttpFailure extends Error {
  constructor(readonly result: ContentUnavailable) {
    super(result.message);
  }
}

export function invalidResponse(message: string): never {
  throw new HttpFailure({ status: 'unavailable', reason: 'invalid-response', message });
}

export function responseVersion(
  response: Response,
  headers: HttpTransportOptions['versionHeaders']
): ContentVersion {
  const rawRevision = response.headers.get(headers.revision);
  if (rawRevision === null || !/^[1-9]\d*$/.test(rawRevision))
    invalidResponse('Response must provide a positive revision header.');
  const revision = Number(rawRevision);
  if (!Number.isSafeInteger(revision)) invalidResponse('Response revision is not a safe integer.');
  const etag = headers.etag === undefined ? undefined : response.headers.get(headers.etag);
  if (etag !== undefined && etag !== null && etag.trim().length === 0)
    invalidResponse('Response etag must not be empty.');
  return { revision, ...(etag === null || etag === undefined ? {} : { etag }) };
}

export function optionalResponseVersion(
  response: Response,
  headers: HttpTransportOptions['versionHeaders']
): ContentVersion | undefined {
  if (!response.headers.has(headers.revision)) return undefined;
  return responseVersion(response, headers);
}

export async function readJsonResponse(
  response: Response,
  maxBytes: number,
  expectedRevision: number
): Promise<string> {
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (
    contentType !== 'application/json' &&
    !(contentType?.startsWith('application/') && contentType.endsWith('+json'))
  )
    invalidResponse('Response must have a JSON content type.');
  function tooLarge(): never {
    throw new HttpFailure({
      status: 'unavailable',
      reason: 'response-too-large',
      message: 'Response exceeds maxResponseBytes.',
    });
  }
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null && Number(contentLength) > maxBytes) tooLarge();
  if (!response.body) invalidResponse('Response has no JSON body.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const value: unknown = chunk.value;
      if (!(value instanceof Uint8Array)) invalidResponse('Response stream must contain bytes.');
      bytes += value.byteLength;
      if (bytes > maxBytes) tooLarge();
      try {
        text += decoder.decode(value, { stream: true });
      } catch {
        invalidResponse('Response body must be valid UTF-8.');
      }
    }
    try {
      text += decoder.decode();
    } catch {
      invalidResponse('Response body must be valid UTF-8.');
    }
  } finally {
    reader.releaseLock();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    invalidResponse('Response body is not valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
    invalidResponse('Response must contain a document envelope.');
  const revision: unknown = Object.getOwnPropertyDescriptor(parsed, 'revision')?.value;
  if (revision !== expectedRevision)
    invalidResponse('Document revision does not match response version.');
  return text;
}
