import { readPath, writePath } from '../bindings/paths.js';
import { resolveDocument } from '../bindings/resolve-document.js';
import { parseDocument } from '../document/parse-document.js';
import { capture, fail } from '../document/errors.js';
import type { ContentResult } from '../document/errors.js';
import { contentLimits } from '../document/limits.js';
import type { ContentDocument, ResolveOptions } from '../document/types.js';
import { snapshotJson } from '../json/snapshot.js';
import type { ContentRegistry } from '../registry/contracts.js';
import { editableDocument } from './editable-document.js';

/** Explicitly freezes exactly one binding's current value into the raw document. */
export function unbindDocumentField(
  input: unknown,
  nodeId: string,
  targetPath: readonly string[],
  registry: ContentRegistry,
  options: ResolveOptions = {}
): ContentResult<ContentDocument> {
  const resolved = resolveDocument(input, registry, options);
  if (!resolved.ok) return resolved;
  const raw = editableDocument(resolved.value.document, registry, options);
  if (!raw.ok) return raw;
  const preview = editableDocument(
    { ...resolved.value.document, data: resolved.value.data },
    registry,
    options
  );
  if (!preview.ok) return preview;
  const result = capture(() => {
    const binding = (raw.value.document.bindings ?? []).find(
      (item) =>
        item.nodeId === nodeId && JSON.stringify(item.targetPath) === JSON.stringify(targetPath)
    );
    if (!binding) fail('missing-binding', ['bindings'], 'Binding does not exist.');
    const target = raw.value.nodes.get(nodeId);
    const source = preview.value.nodes.get(nodeId);
    if (!target || !source)
      fail('missing-binding-node', ['bindings'], 'Binding node does not exist.');
    const value = readPath(source.node.props, targetPath);
    if (value === undefined)
      fail('missing-variable', targetPath, 'Resolved bound value is missing.');
    writePath(target.node.props, targetPath, snapshotJson(value, contentLimits(options.limits)));
    return {
      ...raw.value.document,
      bindings: (raw.value.document.bindings ?? []).filter((item) => item !== binding),
    };
  }, resolved.value.document.documentId);
  return result.ok ? parseDocument(result.value, registry, options) : result;
}
