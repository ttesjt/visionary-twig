import {
  createResourceSnapshot,
  restoreResourceSnapshot,
  type ResourceSnapshot,
} from '@frontend/resource-runtime';
import type { ScopePlan } from './scope-plan';
import type { ResourceKind } from '../constants/kinds';

export type ScopeSnapshots = Readonly<Partial<Record<ResourceKind, ResourceSnapshot>>>;
/** Only the server/props boundary serializes complete validated per-owner snapshots. */
export function splitScopeSnapshot(scope: ScopePlan, input: unknown): ScopeSnapshots {
  const prepared = restoreResourceSnapshot(scope.plan, input);
  return Object.freeze(
    Object.fromEntries(
      scope.parts.map((part) => {
        const keys = new Set(part.plan.resources.map((resource) => resource.key));
        return [
          part.kind,
          createResourceSnapshot(
            part.plan,
            prepared.resources.filter((entry) => keys.has(entry.key))
          ),
        ];
      })
    )
  );
}
