import { useEffect, useLayoutEffect, useMemo } from 'react';
import type { ResourcePlan } from '../core/contracts.js';
import { restoreResourceSnapshot } from '../core/snapshot.js';
import { useResourceRuntime } from './context.js';

/** Keep a mounted host scope in the private cache; seed validated props without render-time writes.
 * The caller still owns synchronous rendering and missing-resource preparation.
 */
export function useRetainResources(plan: ResourcePlan, snapshot?: unknown): void {
  const {
    cache,
    swr: { mutate },
  } = useResourceRuntime();
  const prepared = useMemo(
    () => (snapshot === undefined ? undefined : restoreResourceSnapshot(plan, snapshot)),
    [plan, snapshot]
  );
  useLayoutEffect(() => {
    const releases = plan.resources.map((resource) => cache.retain(resource.key));
    return () => {
      for (const release of releases) release();
    };
  }, [cache, plan]);
  useEffect(() => {
    if (prepared)
      for (const entry of prepared.resources) void mutate(entry.key, entry, { revalidate: false });
  }, [prepared, mutate]);
}
