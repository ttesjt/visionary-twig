import type { PreparedResource, PreparedResources, ResourcePlan } from '@frontend/resource-runtime';
/** Internal handoff of validated resources. External props use snapshot restoration. */
export interface ResourcePublisher {
  readonly plan: ResourcePlan;
  readonly prepared: PreparedResources | undefined;
  readonly preparePublication: (prepared: PreparedResources, request: ResourcePlan) => () => void;
}
export function selectPreparedResources(
  plan: ResourcePlan,
  resources: readonly PreparedResource[]
): PreparedResources {
  const byKey = new Map(resources.map((entry) => [entry.key, entry]));
  const selected = plan.resources.map((resource) => {
    const entry = byKey.get(resource.key);
    if (!entry) throw new Error('Incomplete prepared scope: ' + resource.id);
    return entry;
  });
  return Object.freeze({
    planKey: plan.key,
    context: plan.context,
    resources: Object.freeze(selected),
  });
}
