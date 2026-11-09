import { contentLimits } from '../../document/limits.js';
import type { ContentSaveResult, ContentSink, SaveOptions } from '../contracts.js';
import { assertContentKey, prepareSave } from '../prepare-save.js';
import type { HttpSinkOptions } from './contracts.js';
import { createHttpRequester } from './request.js';
import { optionalResponseVersion, responseVersion } from './response.js';

export function createHttpContentSink(options: HttpSinkOptions): ContentSink {
  const requester = createHttpRequester(options);
  const limits = contentLimits(options.limits);
  if (options.endpoint && !['POST', 'PUT', 'PATCH'].includes(options.endpoint.method))
    throw new TypeError('Sink method must be POST, PUT or PATCH.');
  const preconditionHeaders = options.endpoint?.preconditionHeaders;
  const names = new Headers();
  for (const name of [preconditionHeaders?.revision, preconditionHeaders?.etag]) {
    if (name !== undefined) names.set(name, 'condition');
  }
  if (
    preconditionHeaders?.revision !== undefined &&
    preconditionHeaders.revision.toLowerCase() === preconditionHeaders.etag?.toLowerCase()
  )
    throw new TypeError('Revision and etag precondition headers must be distinct.');
  return {
    save(key: string, input: unknown, request: SaveOptions = {}): Promise<ContentSaveResult> {
      assertContentKey(key);
      if (request.signal?.aborted) return Promise.resolve({ status: 'cancelled' });
      if (!options.endpoint)
        return Promise.resolve({
          status: 'unavailable',
          reason: 'unconfigured',
          message: 'Content write endpoint is not configured.',
        });
      const prepared = prepareSave(input, options.registry, request, { limits });
      if (!prepared.ok) return Promise.resolve({ status: 'invalid', errors: prepared.errors });
      const headers: Record<string, string> = {};
      const preconditions = options.endpoint.preconditionHeaders;
      const conditions: readonly (readonly [number | string | undefined, string | undefined])[] = [
        [request.expectedRevision, preconditions?.revision],
        [request.expectedEtag, preconditions?.etag],
      ];
      for (const [value, name] of conditions) {
        if (value === undefined) continue;
        if (name === undefined)
          return Promise.resolve({
            status: 'unavailable',
            reason: 'unconfigured',
            message: 'Requested save precondition has no configured header mapping.',
          });
        Object.defineProperty(headers, name, { value: String(value), enumerable: true });
      }
      return requester.run(
        options.endpoint,
        key,
        request.signal,
        (response): Promise<ContentSaveResult> => {
          if (response.status === 409 || response.status === 412) {
            const currentVersion = optionalResponseVersion(response, options.versionHeaders);
            return Promise.resolve({
              status: 'conflict',
              ...(currentVersion === undefined ? {} : { currentVersion }),
            });
          }
          if (!response.ok)
            return Promise.resolve({
              status: 'unavailable',
              reason: 'http',
              httpStatus: response.status,
              message: 'Content write failed.',
            });
          return Promise.resolve({
            status: 'saved',
            version: responseVersion(response, options.versionHeaders),
          });
        },
        JSON.stringify(prepared.value),
        headers
      );
    },
  };
}
