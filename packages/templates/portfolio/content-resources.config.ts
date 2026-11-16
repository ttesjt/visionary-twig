import type { JsonResourcesConfiguration } from '@frontend/prepared-data/resource/node';
import { baseContentSchemas } from './src/site/content-schemas.ts';
import { projectFilePreparation } from './src/features/projects/files/preparation.ts';

export default {
  version: 1,
  resources: {
    ...Object.fromEntries(
      Object.entries(baseContentSchemas).map(([name, schema]) => [
        name,
        {
          schema,
          schemaVersion: '1',
          defaults: 'content/default/data/' + name + '.json',
          custom: '.local/content/data/' + name + '.json',
        },
      ])
    ),
    ...projectFilePreparation,
  },
} satisfies Omit<JsonResourcesConfiguration, 'kind'>;
