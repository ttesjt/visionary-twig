import type { ContentReadResult, ContentSource, ReadOptions } from '../contracts.js';
import type { HttpSourceOptions } from './contracts.js';
import { createHttpRequester } from './request.js';
import { readJsonResponse, responseVersion } from './response.js';

/** Reads raw JSON; document/registry validation remains an explicit pipeline step. */
export function createHttpContentSource(options: HttpSourceOptions): ContentSource {
  const requester = createHttpRequester(options);
  if (options.endpoint && options.endpoint.method !== 'GET')
    throw new TypeError('Source method must be GET.');
  return {
    read(key: string, request: ReadOptions = {}): Promise<ContentReadResult> {
      return requester.run(
        options.endpoint,
        key,
        request.signal,
        async (response): Promise<ContentReadResult> => {
          if (response.status === 404) return { status: 'not-found' };
          if (!response.ok)
            return {
              status: 'unavailable',
              reason: 'http',
              httpStatus: response.status,
              message: 'Content read failed.',
            };
          const version = responseVersion(response, options.versionHeaders);
          const rawJson = await readJsonResponse(
            response,
            requester.maxResponseBytes,
            version.revision
          );
          return { status: 'found', rawJson, version };
        }
      );
    },
  };
}
