import { collectResolvedMedia, resolveDocument } from '@frontend/ui-document';
import type { ContentResult, ResolveOptions } from '@frontend/ui-document';
import type { NavigationPresentationCatalog } from '@frontend/content-blocks/schema';
import { contentRegistry, createContentRegistry } from './content-registry.js';

/** Resolve and inspect the same registered renderer contracts used by publication. */
export function collectContentMedia(
  input: unknown,
  options: ResolveOptions & {
    readonly navigationPresentations?: NavigationPresentationCatalog;
  } = {}
): ContentResult<readonly string[]> {
  const { navigationPresentations, ...resolveOptions } = options;
  const registry = navigationPresentations
    ? createContentRegistry({ navigationPresentations })
    : contentRegistry;
  const resolved = resolveDocument(input, registry, resolveOptions);
  return resolved.ok
    ? collectResolvedMedia(resolved.value.data, registry, resolveOptions)
    : resolved;
}
