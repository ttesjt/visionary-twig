import {
  createResourcePlan,
  type ResourcePlan,
  type PreparedResources,
} from '@frontend/resource-runtime';
import { sameJson } from '@frontend/prepared-data/resource';
import { selectPreparedResources } from './prepared';

export interface NamespaceBatch {
  readonly plan: ResourcePlan;
  readonly prepared: PreparedResources;
}

/** Only missing entries become new local data; retries cannot replace installed artifacts. */
export function appendBatch(
  base: ResourcePlan,
  current: NamespaceBatch | undefined,
  request: ResourcePlan,
  data: PreparedResources
): NamespaceBatch | undefined {
  if (data.planKey !== request.key || data.resources.length !== request.resources.length)
    throw new Error('Namespace publication plan mismatch.');
  const previous = new Map(current?.prepared.resources.map((entry) => [entry.key, entry]));
  const incoming = selectPreparedResources(request, data.resources);
  let changed = !current;
  for (const entry of incoming.resources) {
    const installed = previous.get(entry.key);
    if (installed && !sameJson(installed.value, entry.value))
      throw new Error('Cannot replace an installed namespace.');
    if (!installed) {
      previous.set(entry.key, entry);
      changed = true;
    }
  }
  if (!changed) return undefined;
  const plan = createResourcePlan(
    [...(current?.plan ?? base).resources, ...request.resources],
    base.context
  );
  return { plan, prepared: selectPreparedResources(plan, [...previous.values()]) };
}
