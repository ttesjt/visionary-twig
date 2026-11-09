import { resolveDocument } from '../bindings/resolve-document.js';
import type { ContentResult } from '../document/errors.js';
import type { ContentDocument, DocumentOptions } from '../document/types.js';
import type { ContentRegistry } from '../registry/contracts.js';
import type { SaveOptions } from './contracts.js';

export function assertContentKey(key: string): void {
  if (typeof key !== 'string' || key.trim().length === 0)
    throw new TypeError('Content key must be a non-empty string.');
}

export function assertPreconditions(options: SaveOptions): void {
  if (
    options.expectedRevision !== undefined &&
    (!Number.isSafeInteger(options.expectedRevision) || options.expectedRevision < 0)
  )
    throw new RangeError('expectedRevision must be a non-negative safe integer.');
  if (options.expectedEtag !== undefined && options.expectedEtag.trim().length === 0)
    throw new TypeError('expectedEtag must not be empty.');
}

/** Validation and persistence share the same resolver, but only the raw envelope is saved. */
export function prepareSave(
  input: unknown,
  registry: ContentRegistry,
  options: SaveOptions,
  documentOptions: DocumentOptions
): ContentResult<ContentDocument> {
  assertPreconditions(options);
  const resolved = resolveDocument(input, registry, {
    ...documentOptions,
    ...(options.context === undefined ? {} : { context: options.context }),
  });
  return resolved.ok ? { ok: true, value: resolved.value.document } : resolved;
}
