import type { JsonResourcesConfiguration } from '@frontend/prepared-data/resource/node';
import { configSchemas } from './src/site/config-schema.ts';
export default {
  version: 1,
  resources: Object.fromEntries(
    Object.entries(configSchemas).map(([name, schema]) => [
      name,
      {
        schema,
        schemaVersion: '1',
        defaults: 'config/default/' + name + '.json',
        custom: '.local/config/' + name + '.json',
      },
    ])
  ),
} satisfies Omit<JsonResourcesConfiguration, 'kind'>;
