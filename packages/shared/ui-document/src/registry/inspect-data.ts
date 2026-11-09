import { ContentFailure, fail } from '../document/errors.js';
import type { ContentLimits } from '../document/limits.js';
import type { ContentData, ContentNode } from '../document/types.js';
import { assertSafePath, isPrefix, isReservedTarget, readPath } from '../bindings/paths.js';
import { objectAt, onlyKeys, readOnlyAt, stringAt } from '../json/shape.js';
import { isJsonArray } from '../json/snapshot.js';
import type { JsonObject, JsonValue } from '../json/snapshot.js';
import type { ContentRegistry, NodeContract } from './contracts.js';

export interface IndexedNode {
  readonly node: ContentNode;
  readonly contract: NodeContract;
  readonly path: readonly string[];
}

export interface InspectedData {
  readonly data: ContentData;
  readonly nodes: ReadonlyMap<string, IndexedNode>;
}

function hasId(props: JsonObject): props is JsonObject & { readonly id: string } {
  return typeof props.id === 'string' && props.id.trim().length > 0;
}

function checkSlotContracts(contract: NodeContract): void {
  const slots = contract.slots ?? [];
  for (const [index, slot] of slots.entries()) {
    assertSafePath(slot.path, ['registry', 'slots', String(index)]);
    if (isReservedTarget(slot.path))
      throw new TypeError('Slot paths must not target reserved props.');
    if (
      slots
        .slice(0, index)
        .some((other) => isPrefix(other.path, slot.path) || isPrefix(slot.path, other.path))
    ) {
      throw new TypeError('Slot contract paths must not overlap.');
    }
  }
}

/** Traverses only registered slots. The props retain references to our owned JSON snapshot. */
export function inspectData(
  input: JsonValue | undefined,
  registry: ContentRegistry,
  limits: ContentLimits
): InspectedData {
  const object = objectAt(input, ['data']);
  onlyKeys(object, ['root', 'content'], ['data']);
  const root = objectAt(object.root, ['data', 'root']);
  onlyKeys(root, ['props', 'readOnly'], ['data', 'root']);
  const rootProps =
    root.props === undefined ? undefined : objectAt(root.props, ['data', 'root', 'props']);
  const rootReadOnly = readOnlyAt(root.readOnly, ['data', 'root', 'readOnly']);
  const nodes = new Map<string, IndexedNode>();

  function visitList(
    value: JsonValue | undefined,
    path: readonly string[],
    depth: number,
    allowedTypes?: readonly string[]
  ): ContentNode[] {
    if (!isJsonArray(value)) fail('invalid-slot', path, 'Expected a node array.');
    return value.map((item, index) =>
      visitNode(item, [...path, String(index)], depth, allowedTypes)
    );
  }

  function visitNode(
    value: JsonValue,
    path: readonly string[],
    depth: number,
    allowedTypes?: readonly string[]
  ): ContentNode {
    if (depth > limits.maxNodeDepth) fail('nodes-too-deep', path, 'Nodes exceed maxNodeDepth.');
    const raw = objectAt(value, path);
    onlyKeys(raw, ['type', 'props', 'readOnly'], path);
    const type = stringAt(raw.type, [...path, 'type']);
    const props = objectAt(raw.props, [...path, 'props']);
    if (!hasId(props))
      fail('invalid-node-id', [...path, 'props', 'id'], 'Every node needs a non-empty ID.');
    try {
      if (props.id === 'root')
        fail('reserved-node-id', [...path, 'props', 'id'], 'root is reserved by Puck.');
      if (!Object.hasOwn(registry.nodes, type))
        fail('unknown-node', [...path, 'type'], `Unknown node type: ${type}.`);
      const contract = registry.nodes[type];
      if (!contract) fail('unknown-node', [...path, 'type'], `Unknown node type: ${type}.`);
      if (allowedTypes !== undefined && !allowedTypes.includes(type)) {
        fail(
          'disallowed-slot-node',
          [...path, 'type'],
          `Node ${type} is not allowed in this slot.`
        );
      }
      if (nodes.has(props.id))
        fail('duplicate-node-id', [...path, 'props', 'id'], `Duplicate node ID: ${props.id}.`);
      if (nodes.size >= limits.maxNodes) fail('too-many-nodes', path, 'Nodes exceed maxNodes.');
      const readOnly = readOnlyAt(raw.readOnly, [...path, 'readOnly']);
      const node: ContentNode = { type, props, ...(readOnly === undefined ? {} : { readOnly }) };
      nodes.set(props.id, { node, contract, path });
      checkSlotContracts(contract);
      for (const slot of contract.slots ?? []) {
        visitList(
          readPath(props, slot.path),
          [...path, 'props', ...slot.path],
          depth + 1,
          slot.allowedTypes
        );
      }
      return node;
    } catch (error) {
      if (!(error instanceof ContentFailure)) throw error;
      throw new ContentFailure({ ...error.issue, nodeId: error.issue.nodeId ?? props.id });
    }
  }

  const content = visitList(object.content, ['data', 'content'], 1);
  return {
    data: {
      root: {
        ...(rootProps === undefined ? {} : { props: rootProps }),
        ...(rootReadOnly === undefined ? {} : { readOnly: rootReadOnly }),
      },
      content,
    },
    nodes,
  };
}
