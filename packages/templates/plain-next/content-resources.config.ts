import type { JsonResourcesConfiguration } from '@frontend/prepared-data/resource/node';
import { contentSchemas } from './src/site/content-schemas.ts';
export default {
  version: 1,
  resources: Object.fromEntries(
    Object.entries(contentSchemas).map(([name, schema]) => [
      name,
      {
        schema,
        schemaVersion: name === 'catalog' ? '2' : '1',
        defaults: 'content/default/data/' + name + '.json',
        custom: '.local/content/data/' + name + '.json',
      },
    ])
  ),
} satisfies Omit<JsonResourcesConfiguration, 'kind'>;
