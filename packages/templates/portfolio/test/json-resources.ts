import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  prepareResourcePlan,
  type ResourceReader,
  type ResourcePlan,
} from '@frontend/resource-runtime';
/** Reads only prepared artifacts, just like the server loader; never defaults or custom sources. */
export const jsonReader: ResourceReader = (resource) => {
  const namespace = resource.id.slice(resource.source.length + 1);
  return Promise.resolve(
    JSON.parse(
      readFileSync(
        path.resolve(import.meta.dirname, '../.generated', resource.source, namespace + '.json'),
        'utf8'
      )
    ) as unknown
  );
};
export async function jsonSnapshots(configPlan: ResourcePlan, contentPlan: ResourcePlan) {
  const [config, content] = await Promise.all([
    prepareResourcePlan(configPlan, jsonReader),
    prepareResourcePlan(contentPlan, jsonReader),
  ]);
  return { config, content };
}
