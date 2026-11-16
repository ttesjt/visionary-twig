// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JsonResource } from '@frontend/prepared-data/resource';
import { expect, it } from 'vitest';
import { createContentReader } from '../../src/infra/resources';
import {
  readFileProjectCatalog,
  queryFileProjects,
} from '../../src/features/projects/files/catalog';
import { PROJECT_FILE_INDEX } from '../../src/features/projects/files/constants';
import {
  projectFileSchemas,
  PROJECT_FILE_RESOURCES,
} from '../../src/features/projects/files/resources';

const raw: unknown = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../..', PROJECT_FILE_RESOURCES[PROJECT_FILE_INDEX].defaults),
    'utf8'
  )
);
const reader = createContentReader(
  new JsonResource(projectFileSchemas, [
    { namespace: PROJECT_FILE_INDEX, version: 'test', value: raw },
  ]).createView()
);

it.each(['en', 'zh'] as const)(
  'resolves immutable file content for %s and applies catalog and pagination rules',
  (locale) => {
    const dictionary: unknown = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '../demo/content/default/text', locale, 'projects-demo.json'),
        'utf8'
      )
    );
    if (!dictionary || typeof dictionary !== 'object') throw new Error('Expected a dictionary.');
    const text = {
      getText(_namespace: string, key: string) {
        const value: unknown = Reflect.get(dictionary, key);
        if (typeof value !== 'string') throw new Error('Missing sample text: ' + key);
        return value;
      },
    };
    const catalog = readFileProjectCatalog(
      reader.getResolved(PROJECT_FILE_INDEX, { text }),
      locale
    );
    expect(catalog.projects.map(({ slug }) => slug)).toEqual([
      'field-notes',
      'color-index',
      'reading-room',
      'pocket-atlas',
      'type-studio',
      'quiet-hours',
      'paper-trail',
      'pattern-lab',
    ]);
    expect(catalog.projects[0]).toMatchObject({
      title: locale === 'en' ? 'Field Notes' : '野外笔记',
      locale,
      pinned: true,
    });
    expect(catalog.categories.map(({ count }) => count)).toEqual([5, 3]);
    expect(queryFileProjects(catalog, { category: 'web', page: 1 }, 1)).toMatchObject({
      projects: [{ slug: 'field-notes' }],
      hasMore: true,
    });
    expect(queryFileProjects(catalog, { category: 'web', page: 2 }, 1)).toMatchObject({
      projects: [{ slug: 'reading-room' }],
      hasMore: true,
    });
    expect(queryFileProjects(catalog, { category: 'web', page: 25 }, 1)).toEqual({
      projects: [],
      hasMore: false,
    });
    expect(queryFileProjects(catalog, { category: 'removed', page: 1 }, 1)).toEqual({
      projects: [],
      hasMore: false,
    });
    expect(reader.get(PROJECT_FILE_INDEX)).toEqual(raw);
  }
);
