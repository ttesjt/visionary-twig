import {
  JsonResource,
  type JsonResourceInput,
  type JsonSchemas,
} from '@frontend/prepared-data/resource';
import type { ResourcePlan, PreparedResources } from '@frontend/resource-runtime';
function known<R extends JsonSchemas>(schemas: R, name: string): name is keyof R & string {
  return Object.hasOwn(schemas, name);
}
export function createPreparedJsonResource<R extends JsonSchemas>(
  schemas: R,
  kind: string,
  prepared: PreparedResources,
  plan: ResourcePlan
): JsonResource<R> {
  if (prepared.planKey !== plan.key || prepared.resources.length !== plan.resources.length)
    throw new Error('JSON preparation plan mismatch.');
  const inputs: JsonResourceInput<R>[] = plan.resources.map((definition) => {
    const name = definition.id.slice(kind.length + 1);
    const entry = prepared.resources.find((value) => value.key === definition.key);
    if (!known(schemas, name) || !entry) throw new Error('Missing JSON namespace: ' + name);
    return { namespace: name, version: definition.version, value: entry.value };
  });
  return new JsonResource(schemas, inputs);
}
