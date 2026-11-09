import { ContentFailure, fail } from '../document/errors.js';
import type { ContentLimits } from '../document/limits.js';
import type { ContentBinding } from '../document/types.js';
import { snapshotWithSize } from '../json/snapshot.js';
import type { JsonObject } from '../json/snapshot.js';
import type { IndexedNode } from '../registry/inspect-data.js';
import { readPath, writePath } from './paths.js';

export function applyBindings(
  bindings: readonly ContentBinding[],
  destinations: readonly IndexedNode[],
  context: JsonObject,
  initialSize: { readonly bytes: number; readonly values: number },
  limits: ContentLimits
): void {
  let addedBytes = 0;
  let addedValues = 0;
  let removedBytes = 0;
  let removedValues = 0;
  const assignments = bindings.map((binding, index) => {
    const destination = destinations[index];
    if (!destination) throw new Error('Validated binding destination missing.');
    try {
      const value = readPath(context, binding.sourcePath);
      if (value === undefined)
        fail(
          'missing-variable',
          ['bindings', String(index), 'sourcePath'],
          'Variable path does not exist.'
        );
      const previous = readPath(destination.node.props, binding.targetPath);
      const removed = previous === undefined ? undefined : snapshotWithSize(previous, limits);
      const next = snapshotWithSize(value, limits);
      addedBytes += next.bytes;
      addedValues += next.values;
      removedBytes += removed?.bytes ?? 0;
      removedValues += removed?.values ?? 0;
      // Disjoint replacement values alone are a lower bound on final size. Stop
      // while preparing copies, before repeated variables can consume unbounded memory.
      if (addedBytes > limits.maxBytes)
        fail(
          'document-too-large',
          ['bindings', String(index)],
          'Replacement values exceed maxBytes.'
        );
      if (addedValues > limits.maxValues)
        fail(
          'too-many-values',
          ['bindings', String(index)],
          'Replacement values exceed maxValues.'
        );
      return { binding, destination, value: next.value, index };
    } catch (error) {
      if (!(error instanceof ContentFailure)) throw error;
      throw new ContentFailure({ ...error.issue, nodeId: binding.nodeId });
    }
  });
  // Check the final delta before assigning. Shrinking and expanding bindings must
  // behave identically in either order. Final snapshot checks added object-key overhead.
  if (initialSize.bytes + addedBytes - removedBytes > limits.maxBytes)
    fail('document-too-large', ['data'], 'Resolved data exceeds maxBytes.');
  if (initialSize.values + addedValues - removedValues > limits.maxValues)
    fail('too-many-values', ['data'], 'Resolved data exceeds maxValues.');
  for (const { binding, destination, value, index } of assignments) {
    try {
      writePath(destination.node.props, binding.targetPath, value);
    } catch (error) {
      if (!(error instanceof ContentFailure)) throw error;
      throw new ContentFailure({
        ...error.issue,
        nodeId: binding.nodeId,
        path: ['bindings', String(index), 'targetPath', ...error.issue.path],
      });
    }
  }
}
