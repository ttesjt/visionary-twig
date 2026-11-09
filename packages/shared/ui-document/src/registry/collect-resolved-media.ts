import type { ContentResult } from '../document/errors.js';
import type { DocumentOptions } from '../document/types.js';
import type { ContentRegistry } from './contracts.js';
import { inspectResolvedData } from './validate-resolved-data.js';

/** Collect only resources declared by registered renderers, on the resolved tree's own budget. */
export function collectResolvedMedia(
  data: unknown,
  registry: ContentRegistry,
  options: DocumentOptions = {}
): ContentResult<readonly string[]> {
  const inspected = inspectResolvedData(data, registry, options);
  if (!inspected.ok) return inspected;
  const urls = new Set<string>();
  for (const { node, contract } of inspected.value.nodes.values())
    for (const url of contract.mediaSources?.(node.props) ?? []) urls.add(url);
  return { ok: true, value: [...urls] };
}
