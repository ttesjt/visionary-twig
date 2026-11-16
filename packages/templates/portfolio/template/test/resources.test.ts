// @vitest-environment node
const PROJECT_FILE_PAGE = {
  slug: 'field-notes',
  namespace: 'project-field-notes',
  filename: 'field-notes.json',
} as const;
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { JsonResource } from '@frontend/prepared-data/resource';
import { jsonResourcesDefinition } from '@frontend/prepared-data/resource/node';
import configuration from '../../content-resources.config.ts';
import { contentSchemas } from '../../src/site/content-schemas';
import { RESOURCE_SCOPES } from '../../src/site/resource-scopes';
import { PROJECT_FILE_INDEX } from '../../src/features/projects/files/constants';
import { PROJECT_FILE_RESOURCES } from '../../src/features/projects/files/resources';
import {
  projectFileCatalogSchema,
  projectFilePageSchema,
} from '../../src/features/projects/files/schemas';
import { projectFilePageSourceSchemaFor } from '../../src/features/projects/files/source-schemas';

const root = resolve(import.meta.dirname, '../..');
async function readInput(file: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(root, file), 'utf8')) as unknown;
}

it('registers the index globally and the page independently with valid raw Puck bindings', async () => {
  expect(RESOURCE_SCOPES.layout.content).toContain(PROJECT_FILE_INDEX);
  expect(RESOURCE_SCOPES.layout.content).not.toContain(PROJECT_FILE_PAGE.namespace);
  expect(RESOURCE_SCOPES[PROJECT_FILE_PAGE.namespace].content).toEqual([
    PROJECT_FILE_PAGE.namespace,
  ]);
  const page = await readInput(PROJECT_FILE_RESOURCES[PROJECT_FILE_PAGE.namespace].defaults);
  expect(
    projectFilePageSourceSchemaFor(PROJECT_FILE_PAGE.slug).parse(page).document
  ).toHaveProperty('bindings');
  expect(() =>
    projectFilePageSourceSchemaFor(PROJECT_FILE_PAGE.slug).parse({ document: {}, context: {} })
  ).toThrow();
});

it('rejects duplicate projects, duplicate slugs and unknown categories during preparation', async () => {
  const original = projectFileCatalogSchema.parse(
    await readInput(PROJECT_FILE_RESOURCES[PROJECT_FILE_INDEX].defaults)
  );
  const first = original.projects[0];
  if (!first) throw new Error('Expected a sample project.');
  for (const project of [
    { ...first, slug: 'another-slug' },
    { ...first, id: 'another-id' },
    { ...first, id: 'another-id', slug: 'another-slug', categoryIds: ['unknown'] },
  ]) {
    expect(() =>
      projectFileCatalogSchema.parse({
        ...original,
        projects: [...original.projects, project],
      })
    ).toThrow();
  }
});

it.each([
  { name: 'empty key', reference: { $text: { namespace: 'main', key: '' } }, field: 'key' },
  { name: 'missing namespace', reference: { $text: { key: 'title' } }, field: 'namespace' },
  { name: 'invalid marker', reference: { $text: 'title' }, field: undefined },
])(
  'rejects a nested $name Text reference in custom page preparation',
  async ({ reference, field }) => {
    const input = PROJECT_FILE_RESOURCES[PROJECT_FILE_PAGE.namespace];
    const page = projectFilePageSchema.parse(await readInput(input.defaults));
    const custom = {
      ...page,
      context: { ...page.context, nested: [{ reference }] },
    };
    const definition = jsonResourcesDefinition({ ...configuration, kind: 'content' });
    await expect(
      definition.resolve(async (file, options) => {
        if (file === input.custom) return custom;
        return options?.optional ? undefined : readInput(file);
      }, 'auto')
    ).rejects.toMatchObject({
      issues: [
        {
          path: ['context', 'nested', 0, 'reference', '$text', ...(field ? [field] : [])],
        },
      ],
    });
    expect(page.context).not.toHaveProperty('nested');
  }
);

it('prepares a custom index and default page together and restores unchanged raw resources', async () => {
  const definition = jsonResourcesDefinition({ ...configuration, kind: 'content' });
  const input = PROJECT_FILE_RESOURCES[PROJECT_FILE_INDEX];
  const original = projectFileCatalogSchema.parse(await readInput(input.defaults));
  const custom = {
    ...original,
    projects: original.projects.map((project) => ({
      ...project,
      title: 'Custom ' + project.slug,
    })),
  };
  const prepared = await definition.resolve(async (file, options) => {
    if (file === input.custom) return custom;
    return options?.optional ? undefined : readInput(file);
  }, 'auto');
  if (!prepared || typeof prepared !== 'object' || !('values' in prepared))
    throw new Error('Expected prepared content values.');
  const catalog = new JsonResource(contentSchemas, [
    { namespace: PROJECT_FILE_INDEX, version: 'test', value: custom },
  ]).createView();
  expect(catalog.get(PROJECT_FILE_INDEX).projects[0]?.title).toBe('Custom field-notes');
  expect(prepared.values).toMatchObject({
    [PROJECT_FILE_INDEX]: custom,
    [PROJECT_FILE_PAGE.namespace]: await readInput(
      PROJECT_FILE_RESOURCES[PROJECT_FILE_PAGE.namespace].defaults
    ),
  });
  const defaults = await definition.resolve(async (file) => readInput(file), 'default');
  expect(defaults).toHaveProperty('values.' + PROJECT_FILE_INDEX, original);
});
