import { useCallback, useMemo } from 'react';
import type { PreparedResources, ResourcePlan, ResourceSnapshot } from '../core/contracts.js';
import { restoreResourceSnapshot, createResourceSnapshot } from '../core/snapshot.js';
import { RESOURCE_SNAPSHOT_VERSION } from '../core/constants.js';
import { useResourceRuntime } from './context.js';
/** Prepare before a host-controlled navigation; direct visits still use the boundary. */
export function usePrepareResources(): (plan: ResourcePlan) => Promise<ResourceSnapshot> {
  const {
    cache,
    fetchResource,
    swr: { mutate },
  } = useResourceRuntime();
  return useCallback(
    async (plan: ResourcePlan) => {
      const entries = await Promise.all(
        plan.resources.map(async (resource) => {
          const cached = cache.get(resource.key)?.data;
          if (cached) return cached;
          const entry = await fetchResource(resource);
          await mutate(resource.key, entry, { revalidate: false });
          return entry;
        })
      );
      return createResourceSnapshot(plan, entries);
    },
    [cache, fetchResource, mutate]
  );
}

/** Returns an already prepared plan synchronously during a host's coordinated render.
 * It does not subscribe or fetch; the host publishes load completions explicitly.
 */
export function useCachedResources(plan: ResourcePlan): PreparedResources | undefined {
  const { cache } = useResourceRuntime();
  return useMemo(() => {
    const entries = plan.resources.map((resource) => cache.get(resource.key)?.data);
    if (entries.some((entry) => entry === undefined)) return undefined;
    return restoreResourceSnapshot(plan, {
      version: RESOURCE_SNAPSHOT_VERSION,
      planKey: plan.key,
      resources: entries,
    });
  }, [cache, plan]);
}
