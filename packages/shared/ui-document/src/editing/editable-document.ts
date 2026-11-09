import { capture } from '../document/errors.js';
import type { ContentResult } from '../document/errors.js';
import { contentLimits } from '../document/limits.js';
import { parseDocument } from '../document/parse-document.js';
import type { ContentDocument, DocumentOptions } from '../document/types.js';
import { snapshotJson } from '../json/snapshot.js';
import type { ContentRegistry } from '../registry/contracts.js';
import { inspectData } from '../registry/inspect-data.js';
import type { IndexedNode } from '../registry/inspect-data.js';

export interface EditableDocument {
  readonly document: ContentDocument;
  readonly nodes: ReadonlyMap<string, IndexedNode>;
}

export function editableDocument(
  input: unknown,
  registry: ContentRegistry,
  options: DocumentOptions = {}
): ContentResult<EditableDocument> {
  const parsed = parseDocument(input, registry, options);
  if (!parsed.ok) return parsed;
  return capture(() => {
    const inspected = inspectData(
      snapshotJson(parsed.value.data, contentLimits(options.limits)),
      registry,
      contentLimits(options.limits)
    );
    return { document: { ...parsed.value, data: inspected.data }, nodes: inspected.nodes };
  }, parsed.value.documentId);
}
