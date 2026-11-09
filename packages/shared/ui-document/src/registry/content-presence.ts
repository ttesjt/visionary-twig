import type { ContentResult } from '../document/errors.js';
import type { DocumentOptions } from '../document/types.js';
import type { ContentRegistry } from './contracts.js';
import { inspectResolvedData } from './validate-resolved-data.js';

/** Inspects resolved data, never raw bindings. False means every node explicitly declares
 * no content of its own. Unknown semantics and nonempty root props are kept conservatively.
 * Validation failures remain failures, never an empty-page result.
 */
export function hasRenderableContent(
  data: unknown,
  registry: ContentRegistry,
  options: DocumentOptions = {}
): ContentResult<boolean> {
  const inspected = inspectResolvedData(data, registry, options);
  if (!inspected.ok) return inspected;
  if (Object.keys(inspected.value.data.root.props ?? {}).length) return { ok: true, value: true };
  for (const { node, contract } of inspected.value.nodes.values())
    if (contract.hasOwnContent?.(node.props) ?? true) return { ok: true, value: true };
  return { ok: true, value: false };
}
