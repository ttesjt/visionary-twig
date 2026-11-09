import type { Data } from '@puckeditor/core';
import type { ContentData } from '@frontend/ui-document';

/** Puck's generic Data is mutable; this boundary creates its own top-level containers.
 * Props are already an owned, completely validated JSON snapshot from ui-document.
 */
export function toPuckData(data: ContentData): Data {
  return {
    root: { ...data.root, props: {} },
    content: data.content.map((node) => ({ ...node, props: { ...node.props } })),
  };
}
