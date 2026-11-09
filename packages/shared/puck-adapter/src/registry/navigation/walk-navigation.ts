import type { ContentData, ContentNode, JsonValue } from '@frontend/ui-document';
import { isJsonArray, isJsonObject } from '@frontend/ui-document/inspection';
import { hasDocumentContentSlot, SLOT_PROP } from '../catalog.js';

export interface NavigationNode {
  readonly node: ContentNode;
  readonly path: readonly string[];
  readonly insideTabPanel: boolean;
}
/** Props have already passed their schemas; traverse declared slots only. */
export function navigationNodes(data: ContentData): readonly NavigationNode[] {
  const nodes: NavigationNode[] = [];
  function visit(value: JsonValue | undefined, path: readonly string[], insideTabPanel: boolean) {
    if (!isJsonArray(value)) return;
    for (const [index, candidate] of value.entries()) {
      if (
        !isJsonObject(candidate) ||
        typeof candidate.type !== 'string' ||
        !isJsonObject(candidate.props) ||
        typeof candidate.props.id !== 'string'
      )
        continue;
      const node: ContentNode = {
        type: candidate.type,
        props: { ...candidate.props, id: candidate.props.id },
      };
      const nodePath = [...path, String(index)];
      nodes.push({ node, path: nodePath, insideTabPanel });
      if (hasDocumentContentSlot(node.type))
        visit(
          node.props[SLOT_PROP],
          [...nodePath, 'props', SLOT_PROP],
          insideTabPanel || node.type === 'TabPanel'
        );
    }
  }
  // ContentData is an owned validated JSON tree, including its node arrays.
  data.content.forEach((node, index) => {
    const path = ['content', String(index)];
    nodes.push({ node, path, insideTabPanel: false });
    if (hasDocumentContentSlot(node.type))
      visit(node.props[SLOT_PROP], [...path, 'props', SLOT_PROP], node.type === 'TabPanel');
  });
  return nodes;
}

/** Find fragment links in props. Slot children are visited separately. */
export function fragmentLinks(
  value: JsonValue | undefined,
  path: readonly string[] = [],
  skipContentSlot = false
): readonly { readonly target: string; readonly path: readonly string[] }[] {
  if (!value || typeof value !== 'object') return [];
  const links: { target: string; path: readonly string[] }[] = [];
  for (const [key, child] of Object.entries(value)) {
    if (skipContentSlot && key === SLOT_PROP) continue;
    const childPath = [...path, key];
    if (key === 'href' && typeof child === 'string' && child.startsWith('#')) {
      links.push({ target: child.slice(1), path: childPath });
    } else links.push(...fragmentLinks(child, childPath));
  }
  return links;
}
