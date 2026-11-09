import { assertSafeData, freezePreparedData } from '@frontend/prepared-data';
import { RESOURCE_SNAPSHOT_VERSION } from './constants.js';
import { createResourcePlan } from './plan.js';
import {
  ResourceError,
  type PreparedResource,
  type PreparedResources,
  type ResourcePlan,
  type ResourceSnapshot,
} from './contracts.js';
export function validateResource(
  resource: ResourcePlan['resources'][number],
  input: unknown
): PreparedResource {
  try {
    assertSafeData(input);
    const value: unknown = structuredClone(input);
    freezePreparedData(value);
    if (resource.validateArtifact(value) !== undefined)
      throw new Error('Artifact validators must return no value. Convert raw input at its source.');
    return Object.freeze({ key: resource.key, value });
  } catch (cause) {
    throw new ResourceError('invalid-data', resource.id, { cause });
  }
}
function object(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
export function restoreResourceSnapshot(plan: ResourcePlan, input: unknown): PreparedResources {
  try {
    assertSafeData(input);
    if (
      !object(input) ||
      input.version !== RESOURCE_SNAPSHOT_VERSION ||
      input.planKey !== plan.key ||
      !Array.isArray(input.resources) ||
      Object.keys(input).some((key) => !['version', 'planKey', 'resources'].includes(key))
    )
      throw new Error('Snapshot header mismatch.');
    const entries = new Map<string, unknown>();
    for (const item of input.resources) {
      if (
        !object(item) ||
        typeof item.key !== 'string' ||
        !Object.hasOwn(item, 'value') ||
        Object.keys(item).some((key) => !['key', 'value'].includes(key)) ||
        entries.has(item.key)
      )
        throw new Error('Invalid snapshot entry.');
      entries.set(item.key, item.value);
    }
    if (entries.size !== plan.resources.length)
      throw new Error('Snapshot resource count mismatch.');
    const resources = plan.resources.map((resource) => {
      if (!entries.has(resource.key)) throw new Error('Missing snapshot entry.');
      return validateResource(resource, entries.get(resource.key));
    });
    return Object.freeze({
      planKey: plan.key,
      context: plan.context,
      resources: Object.freeze(resources),
    });
  } catch (cause) {
    throw new ResourceError('snapshot', 'snapshot', { cause });
  }
}
export function createResourceSnapshot(
  plan: ResourcePlan,
  resources: readonly PreparedResource[]
): ResourceSnapshot {
  const snapshot = { version: RESOURCE_SNAPSHOT_VERSION, planKey: plan.key, resources };
  const validated = restoreResourceSnapshot(plan, snapshot);
  return Object.freeze({
    version: RESOURCE_SNAPSHOT_VERSION,
    planKey: plan.key,
    resources: validated.resources,
  });
}

/** Validate a partial seed against this plan without relaxing complete snapshot restoration. */
export function restoreResourceEntries(
  plan: ResourcePlan,
  input: unknown
): readonly PreparedResource[] {
  if (!Array.isArray(input)) throw new ResourceError('snapshot', 'initial resources');
  const keys = new Set(
    input.flatMap((entry: unknown) =>
      object(entry) && typeof entry.key === 'string' ? [entry.key] : []
    )
  );
  const subset = createResourcePlan(
    plan.resources.filter((resource) => keys.has(resource.key)),
    plan.context,
    Math.max(1, plan.resources.length)
  );
  return restoreResourceSnapshot(subset, {
    version: RESOURCE_SNAPSHOT_VERSION,
    planKey: subset.key,
    resources: input,
  }).resources;
}
