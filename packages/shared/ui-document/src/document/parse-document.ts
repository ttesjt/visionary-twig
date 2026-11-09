import { assertSafePath } from '../bindings/paths.js';
import { objectAt, onlyKeys, stringAt } from '../json/shape.js';
import { isJsonArray, snapshotJson } from '../json/snapshot.js';
import type { JsonValue } from '../json/snapshot.js';
import type { ContentRegistry } from '../registry/contracts.js';
import { inspectData } from '../registry/inspect-data.js';
import { capture, fail } from './errors.js';
import type { ContentResult } from './errors.js';
import { contentLimits } from './limits.js';
import type { ContentLimits } from './limits.js';
import { CONTENT_SCHEMA_VERSION } from './types.js';
import type { ContentBinding, ContentDocument, DocumentOptions } from './types.js';

function bindingPath(
  value: JsonValue | undefined,
  path: readonly string[],
  limits: ContentLimits
): readonly string[] {
  if (!isJsonArray(value)) fail('invalid-path', path, 'Expected a string array.');
  if (value.length > limits.maxPathSegments)
    fail('path-too-long', path, 'Path exceeds maxPathSegments.');
  const segments = value.map((part, index) => stringAt(part, [...path, String(index)]));
  assertSafePath(segments, path);
  return segments;
}

function parseBindings(
  value: JsonValue | undefined,
  limits: ContentLimits
): readonly ContentBinding[] | undefined {
  if (value === undefined) return undefined;
  if (!isJsonArray(value)) fail('invalid-bindings', ['bindings'], 'Expected a binding array.');
  if (value.length > limits.maxBindings)
    fail('too-many-bindings', ['bindings'], 'Bindings exceed maxBindings.');
  return value.map((item, index) => {
    const path = ['bindings', String(index)];
    const binding = objectAt(item, path);
    onlyKeys(binding, ['nodeId', 'targetPath', 'sourcePath'], path);
    return {
      nodeId: stringAt(binding.nodeId, [...path, 'nodeId']),
      targetPath: bindingPath(binding.targetPath, [...path, 'targetPath'], limits),
      sourcePath: bindingPath(binding.sourcePath, [...path, 'sourcePath'], limits),
    };
  });
}

/** Checks version/envelope/tree shape, allowing bound props to contain placeholders. */
export function parseDocument(
  input: unknown,
  registry: ContentRegistry,
  options: DocumentOptions = {}
): ContentResult<ContentDocument> {
  const limits = contentLimits(options.limits);
  let documentId: string | undefined;
  const result = capture(() => {
    let value: unknown = input;
    if (typeof input === 'string') {
      if (
        input.length > limits.maxBytes ||
        new TextEncoder().encode(input).byteLength > limits.maxBytes
      )
        fail('document-too-large', [], 'JSON text exceeds maxBytes.');
      try {
        value = JSON.parse(input);
      } catch {
        fail('invalid-json', [], 'Unable to parse JSON.');
      }
    }
    const raw = objectAt(snapshotJson(value, limits), []);
    documentId = stringAt(raw.documentId, ['documentId']);
    onlyKeys(
      raw,
      ['documentId', 'schemaVersion', 'revision', 'locale', 'data', 'variables', 'bindings'],
      []
    );
    if (raw.schemaVersion !== CONTENT_SCHEMA_VERSION) {
      fail(
        'unsupported-version',
        ['schemaVersion'],
        `Only schemaVersion ${CONTENT_SCHEMA_VERSION} is supported.`
      );
    }
    if (
      typeof raw.revision !== 'number' ||
      !Number.isSafeInteger(raw.revision) ||
      raw.revision < 1
    ) {
      fail('invalid-revision', ['revision'], 'revision must be a positive safe integer.');
    }
    const locale = raw.locale === undefined ? undefined : stringAt(raw.locale, ['locale']);
    const variables =
      raw.variables === undefined ? undefined : objectAt(raw.variables, ['variables']);
    const bindings = parseBindings(raw.bindings, limits);
    const { data } = inspectData(raw.data, registry, limits);
    return {
      documentId,
      schemaVersion: CONTENT_SCHEMA_VERSION,
      revision: raw.revision,
      data,
      ...(locale === undefined ? {} : { locale }),
      ...(variables === undefined ? {} : { variables }),
      ...(bindings === undefined ? {} : { bindings }),
    } satisfies ContentDocument;
  });
  if (!result.ok && documentId !== undefined) {
    const knownDocumentId = documentId;
    return {
      ok: false,
      errors: result.errors.map((issue) => ({ ...issue, documentId: knownDocumentId })),
    };
  }
  return result;
}
