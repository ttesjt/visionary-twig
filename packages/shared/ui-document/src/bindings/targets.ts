import { ContentFailure, fail } from '../document/errors.js';
import type { ContentBinding } from '../document/types.js';
import type { IndexedNode } from '../registry/inspect-data.js';
import { isPrefix, isReservedTarget } from './paths.js';

interface TargetTrie {
  terminal: boolean;
  readonly children: Map<string, TargetTrie>;
}

function addTarget(trie: TargetTrie, path: readonly string[], location: readonly string[]): void {
  let current = trie;
  for (const key of path) {
    if (current.terminal) fail('overlapping-binding', location, 'Binding targets overlap.');
    let child = current.children.get(key);
    if (!child) {
      child = { terminal: false, children: new Map() };
      current.children.set(key, child);
    }
    current = child;
  }
  if (current.terminal || current.children.size > 0)
    fail('overlapping-binding', location, 'Binding targets overlap.');
  current.terminal = true;
}

function bindingNode(
  binding: ContentBinding,
  index: number,
  nodes: ReadonlyMap<string, IndexedNode>,
  targets: Map<string, TargetTrie>
): IndexedNode {
  const path = ['bindings', String(index), 'targetPath'];
  const node = nodes.get(binding.nodeId);
  if (!node)
    fail(
      'missing-binding-node',
      ['bindings', String(index), 'nodeId'],
      `Node ${binding.nodeId} does not exist.`
    );
  if (isReservedTarget(binding.targetPath))
    fail('reserved-binding-target', path, 'Cannot bind Puck reserved props.');
  for (const slot of node.contract.slots ?? []) {
    if (isPrefix(slot.path, binding.targetPath) || isPrefix(binding.targetPath, slot.path)) {
      fail('slot-binding-target', path, 'Cannot replace or descend into a slot subtree.');
    }
  }
  if (!node.contract.isBindingTarget(binding.targetPath))
    fail('invalid-binding-target', path, 'Target is not a schema-approved data property.');
  let trie = targets.get(binding.nodeId);
  if (!trie) {
    trie = { terminal: false, children: new Map() };
    targets.set(binding.nodeId, trie);
  }
  addTarget(trie, binding.targetPath, path);
  return node;
}

export function bindingDestinations(
  bindings: readonly ContentBinding[],
  nodes: ReadonlyMap<string, IndexedNode>
): readonly IndexedNode[] {
  const targets = new Map<string, TargetTrie>();
  return bindings.map((binding, index) => {
    try {
      return bindingNode(binding, index, nodes, targets);
    } catch (error) {
      if (!(error instanceof ContentFailure)) throw error;
      throw new ContentFailure({ ...error.issue, nodeId: binding.nodeId });
    }
  });
}
