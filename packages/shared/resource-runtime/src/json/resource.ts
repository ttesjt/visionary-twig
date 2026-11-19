import {
  JsonResource,
  type JsonResourceInput,
  type JsonSchemas,
} from '@frontend/prepared-data/resource';
import { ResourceError, type PreparedResources, type ResourcePlan } from '../core/contracts.js';

function known<R extends JsonSchemas>(schemas: R, name: string): name is keyof R & string {
  return Object.hasOwn(schemas, name);
}

/** Restore prepared artifacts whose plan IDs are `<kind>:<namespace>`. Never converts source inputs. */
export function createPreparedJsonResource<R extends JsonSchemas>(
  schemas: R,
  kind: string,
  prepared: PreparedResources,
  plan: ResourcePlan
): JsonResource<R> {
  if (prepared.planKey !== plan.key || prepared.resources.length !== plan.resources.length)
    throw new ResourceError('snapshot', kind, {
      cause: new Error('JSON preparation plan mismatch.'),
    });
  const entries = new Map(prepared.resources.map((entry) => [entry.key, entry.value]));
  if (entries.size !== prepared.resources.length)
    throw new ResourceError('snapshot', kind, {
      cause: new Error('Duplicate JSON preparation entry.'),
    });
  const inputs: JsonResourceInput<R>[] = plan.resources.map((definition) => {
    const prefix = kind + ':';
    const name = definition.id.slice(prefix.length);
    if (!definition.id.startsWith(prefix) || !known(schemas, name))
      throw new ResourceError('definition', definition.id);
    if (!entries.has(definition.key)) throw new ResourceError('snapshot', definition.id);
    return { namespace: name, version: definition.version, value: entries.get(definition.key) };
  });
  return new JsonResource(schemas, inputs);
}
