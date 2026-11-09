import { ResourceError, type ResourceDefinition, type ResourcePlan } from './contracts.js';
import { DEFAULT_MAX_PLAN_RESOURCES, positiveInteger } from './constants.js';
// Identity must agree across Node and browsers with different default locales.
function compareIdentity(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
export function resourceKey(resource: ResourceDefinition): string {
  for (const field of ['id', 'url', 'version', 'schemaVersion', 'source'] as const)
    if (typeof resource[field] !== 'string' || !resource[field].trim())
      throw new ResourceError('definition', field);
  if (!resource.url.startsWith('/') && !/^https?:\/\//.test(resource.url))
    throw new ResourceError('definition', resource.id);
  if (resource.url.startsWith('//') || resource.url.includes('#'))
    throw new ResourceError('definition', resource.id);
  if (typeof resource.validateArtifact !== 'function')
    throw new ResourceError('definition', resource.id);
  return JSON.stringify([
    resource.id,
    resource.url,
    resource.version,
    resource.schemaVersion,
    resource.source,
  ]);
}
export function createResourcePlan(
  definitions: readonly ResourceDefinition[],
  context: Readonly<Record<string, string>> = {},
  maxResources = DEFAULT_MAX_PLAN_RESOURCES
): ResourcePlan {
  positiveInteger(maxResources, 'maxResources');
  const found = new Map<string, ResourceDefinition & { readonly key: string }>();
  for (const resource of definitions) {
    const key = resourceKey(resource);
    const previous = found.get(resource.id);
    if (previous && previous.key !== key) throw new ResourceError('definition', resource.id);
    found.set(resource.id, Object.freeze({ ...resource, key }));
  }
  if (found.size > maxResources) throw new ResourceError('definition', 'plan capacity');
  const ordered = Object.entries(context).sort(([a], [b]) => compareIdentity(a, b));
  if (ordered.some(([, value]) => typeof value !== 'string'))
    throw new ResourceError('definition', 'context');
  const ownedContext = Object.freeze(Object.fromEntries(ordered));
  const resources = Object.freeze(
    [...found.values()].sort((a, b) => compareIdentity(a.key, b.key))
  );
  return Object.freeze({
    key: JSON.stringify([ordered, resources.map((resource) => resource.key)]),
    context: ownedContext,
    resources,
  });
}
export function planResources<C>(
  registry: Readonly<Record<string, (context: C) => ResourceDefinition>>,
  required: readonly string[],
  context: C,
  metadata: Readonly<Record<string, string>> = {}
): ResourcePlan {
  return createResourcePlan(
    required.map((id) => {
      const resolve = Object.hasOwn(registry, id) ? registry[id] : undefined;
      if (!resolve) throw new ResourceError('definition', id);
      return resolve(context);
    }),
    metadata
  );
}
