import { isPrefix, readPath } from '../bindings/paths.js';
import { parseDocument } from '../document/parse-document.js';
import { capture, ContentFailure, fail } from '../document/errors.js';
import type { ContentResult } from '../document/errors.js';
import type { ContentBinding, ContentDocument, DocumentOptions } from '../document/types.js';
import type { ContentRegistry } from '../registry/contracts.js';
import { editableDocument } from './editable-document.js';
import type { EditableDocument } from './editable-document.js';

export interface DocumentEditOptions extends DocumentOptions {
  /** IDs assigned by the editor's native duplicate operation, including fresh subtree IDs. */
  readonly duplicate?: { readonly sourceNodeId: string; readonly targetNodeId: string };
}

interface CopiedBinding {
  readonly binding: ContentBinding;
  readonly sourceNodeId: string;
}

function copiedBindings(
  previous: EditableDocument,
  next: EditableDocument,
  duplicate: NonNullable<DocumentEditOptions['duplicate']>
): readonly CopiedBinding[] {
  const source = previous.nodes.get(duplicate.sourceNodeId);
  const target = next.nodes.get(duplicate.targetNodeId);
  if (!source || !target || source.node.type !== target.node.type)
    fail('invalid-duplicate', [], 'Duplicate roots must exist and have the same type.');
  const targets = new Map(
    [...next.nodes.values()].map((node) => [JSON.stringify(node.path), node])
  );
  const ids = new Map<string, string>();
  for (const node of previous.nodes.values()) {
    if (!isPrefix(source.path, node.path)) continue;
    const copy = targets.get(
      JSON.stringify([...target.path, ...node.path.slice(source.path.length)])
    );
    if (!copy || copy.node.type !== node.node.type || previous.nodes.has(copy.node.props.id))
      fail(
        'invalid-duplicate',
        [],
        'Every duplicated descendant needs a fresh ID and matching structure.'
      );
    ids.set(node.node.props.id, copy.node.props.id);
  }
  if (
    [...next.nodes.values()].filter((node) => isPrefix(target.path, node.path)).length !== ids.size
  )
    fail('invalid-duplicate', [], 'Duplicated subtree structure does not match the source.');
  return (previous.document.bindings ?? []).flatMap((binding) => {
    const nodeId = ids.get(binding.nodeId);
    return nodeId === undefined
      ? []
      : [{ binding: { ...binding, nodeId }, sourceNodeId: binding.nodeId }];
  });
}

/** Reconciles native editor operations with raw bindings. Moves retain IDs; deletion
 * clears all removed descendants; explicit duplication maps an entire subtree.
 * Transient invalid static props are allowed, but bound raw values cannot be edited.
 */
export function reconcileDocumentEdit(
  input: unknown,
  data: unknown,
  registry: ContentRegistry,
  options: DocumentEditOptions = {}
): ContentResult<ContentDocument> {
  const previous = editableDocument(input, registry, options);
  if (!previous.ok) return previous;
  const next = editableDocument({ ...previous.value.document, data }, registry, options);
  if (!next.ok) return next;
  const result = capture(() => {
    const retained = (previous.value.document.bindings ?? []).filter((binding) =>
      next.value.nodes.has(binding.nodeId)
    );
    const copies =
      options.duplicate === undefined
        ? []
        : copiedBindings(previous.value, next.value, options.duplicate);
    for (const { binding, sourceNodeId } of [
      ...retained.map((binding) => ({ binding, sourceNodeId: binding.nodeId })),
      ...copies,
    ]) {
      const original = previous.value.nodes.get(sourceNodeId);
      const edited = next.value.nodes.get(binding.nodeId);
      if (!original || !edited) fail('invalid-duplicate', [], 'Binding origin is missing.');
      if (
        JSON.stringify(readPath(original.node.props, binding.targetPath)) !==
        JSON.stringify(readPath(edited.node.props, binding.targetPath))
      ) {
        throw new ContentFailure({
          code: 'bound-field-edit',
          documentId: previous.value.document.documentId,
          nodeId: binding.nodeId,
          path: binding.targetPath,
          message: 'Unbind this field before editing its raw value.',
        });
      }
    }
    return {
      ...next.value.document,
      bindings: [...retained, ...copies.map((copy) => copy.binding)],
    };
  }, previous.value.document.documentId);
  return result.ok ? parseDocument(result.value, registry, options) : result;
}
