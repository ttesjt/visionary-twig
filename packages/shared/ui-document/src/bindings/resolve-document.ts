import { capture, fail } from '../document/errors.js';
import type { ContentResult } from '../document/errors.js';
import { contentLimits } from '../document/limits.js';
import { parseDocument } from '../document/parse-document.js';
import type { ContentDocument, ResolveOptions, ResolvedDocument } from '../document/types.js';
import { objectAt } from '../json/shape.js';
import { snapshotJson, snapshotWithSize } from '../json/snapshot.js';
import type { JsonObject, JsonValue } from '../json/snapshot.js';
import type { ContentRegistry } from '../registry/contracts.js';
import { inspectData } from '../registry/inspect-data.js';
import { propsIssues } from '../registry/validate-resolved-data.js';
import { bindingDestinations } from './targets.js';
import { applyBindings } from './apply-bindings.js';

function mergeContext(embedded: JsonObject, external: JsonObject): JsonObject {
  const merged: Record<string, JsonValue> = {};
  for (const object of [embedded, external]) {
    for (const [key, value] of Object.entries(object)) {
      if (Object.hasOwn(merged, key))
        fail('context-conflict', ['context', key], 'Variable namespaces must not overlap.');
      Object.defineProperty(merged, key, { value, enumerable: true });
    }
  }
  return merged;
}

/** Resolves into a separate owned tree. Neither input, variables nor saved placeholders are changed. */
export function resolveDocument(
  input: unknown,
  registry: ContentRegistry,
  options: ResolveOptions = {}
): ContentResult<ResolvedDocument> {
  const parsed = parseDocument(input, registry, options);
  if (!parsed.ok) return parsed;
  return resolveParsed(parsed.value, registry, options);
}

function resolveParsed(
  document: ContentDocument,
  registry: ContentRegistry,
  options: ResolveOptions
): ContentResult<ResolvedDocument> {
  const limits = contentLimits(options.limits);
  const resolved = capture(() => {
    const external = objectAt(
      snapshotJson(options.context === undefined ? {} : options.context, limits),
      ['context']
    );
    const context = mergeContext(document.variables ?? {}, external);
    const initial = snapshotWithSize(document.data, limits);
    const inspected = inspectData(initial.value, registry, limits);
    const bindings = document.bindings ?? [];
    const destinations = bindingDestinations(bindings, inspected.nodes);
    applyBindings(bindings, destinations, context, initial, limits);
    // A small variable can be bound many times. Bound the complete expanded result too.
    snapshotJson(inspected.data, limits);
    return inspected;
  }, document.documentId);
  if (!resolved.ok) return resolved;
  const errors = propsIssues(resolved.value, registry).map((issue) => ({
    ...issue,
    documentId: document.documentId,
  }));
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      document,
      data: resolved.value.data,
      metadata: {
        documentId: document.documentId,
        revision: document.revision,
        nodeCount: resolved.value.nodes.size,
        bindingCount: document.bindings?.length ?? 0,
        ...(document.locale === undefined ? {} : { locale: document.locale }),
      },
    },
  };
}
