import { projectFileSchemas, PROJECT_FILE_RESOURCES } from './resources.ts';
import { PROJECT_FILE_PAGES } from './constants.ts';
import { projectFilePageSourceSchemaFor } from './source-schemas.ts';

/** Only preparation imports document inspectors; runtime schema registration stays independent. */
export const projectFilePreparation = Object.fromEntries(
  Object.entries(projectFileSchemas).map(([namespace, schema]) => {
    const page = PROJECT_FILE_PAGES.find((entry) => entry.namespace === namespace);
    const input = Object.entries(PROJECT_FILE_RESOURCES).find(([name]) => name === namespace)?.[1];
    if (!input) throw new Error('Missing project file inputs: ' + namespace);
    return [
      namespace,
      {
        ...input,
        schema,
        schemaVersion: '1',
        ...(page ? { sourceSchema: projectFilePageSourceSchemaFor(page.slug) } : {}),
      },
    ];
  })
);
