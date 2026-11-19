import { readFileProjectCatalog, readFileProjectPage } from './files/data.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JsonResource } from '@frontend/prepared-data/resource';
import { TextResource, textContractSchema } from '@frontend/text-catalog/resource';
import { createContentReader } from '@frontend/text-catalog/resource/content';
import { TEXT_LOCALES, TEXT_NAMESPACES } from '../../site/text.ts';
import { PROJECT_FILE_INDEX, PROJECT_FILE_PAGES, projectFileSchemas } from './files/index.ts';
import type { ProjectDataset } from './dataset-types.ts';

function json(directory: string, relative: string): unknown {
  return JSON.parse(readFileSync(resolve(directory, relative), 'utf8')) as unknown;
}

/** Prepared inputs are validated once and shared by file rendering and SQL import. */
export function readProjectDatasets(directory: string): readonly ProjectDataset[] {
  const contracts = textContractSchema.parse(json(directory, '.generated/text/contracts.json'));
  const text = new TextResource(
    contracts.namespaces,
    TEXT_LOCALES.map((locale) => ({
      locale,
      dictionaries: TEXT_NAMESPACES.map((namespace) => ({
        namespace,
        version: 'prepared',
        dictionary: json(directory, '.generated/text/' + locale + '/' + namespace + '.json'),
      })),
    })),
    {
      onMissing(namespace, key, locale) {
        throw new Error('Missing project text: ' + namespace + '.' + key + ' (' + locale + ')');
      },
    }
  );
  const content = createContentReader(
    new JsonResource(
      projectFileSchemas,
      ([PROJECT_FILE_INDEX, ...PROJECT_FILE_PAGES.map(({ namespace }) => namespace)] as const).map(
        (namespace) => ({
          namespace,
          version: 'prepared',
          value: json(directory, '.generated/content/' + namespace + '.json'),
        })
      )
    ).createView()
  );
  return TEXT_LOCALES.map((locale) => {
    const reader = text.createView(locale);
    const catalog = readFileProjectCatalog(
      content.getResolved(PROJECT_FILE_INDEX, { text: reader }),
      locale
    );
    const pages = PROJECT_FILE_PAGES.map(({ slug, namespace }) => {
      const project = catalog.projects.find((project) => project.slug === slug);
      if (!project) throw new Error('Project page is missing its catalog entry: ' + slug);
      const detail = readFileProjectPage(project, () =>
        content.getResolved(namespace, { text: reader })
      );
      if (detail.status !== 'ready') throw detail.error;
      return detail.page;
    });
    return { locale, ...catalog, pages };
  });
}
