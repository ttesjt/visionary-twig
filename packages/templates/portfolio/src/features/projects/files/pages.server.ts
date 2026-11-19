import { projectFileScope } from './resources';
import 'server-only';
import { cache } from 'react';
import type { ResourceSnapshot } from '@frontend/resource-runtime';
import type { ProjectSummary } from '@frontend/portfolio/contracts';
import { prepareScopeResources, serverContent, serverText } from '../../../infra/resources/server';
import { RESOURCE_SCOPES } from '../../../site/resource-scopes';
import type { TextLocale } from '../../../site/text';
import { readFileProjectCatalog, type FileProjectCatalog } from './catalog';
import { PROJECT_FILE_INDEX, findProjectFilePage } from './constants';
import { readFileProjectPage } from './pages';

export const fileProjectCatalog = cache(async (locale: TextLocale): Promise<FileProjectCatalog> => {
  const [content, text] = await Promise.all([
    serverContent(RESOURCE_SCOPES.layout, locale),
    serverText(locale, RESOURCE_SCOPES.metadata),
  ]);
  return readFileProjectCatalog(content.getResolved(PROJECT_FILE_INDEX, { text }), locale);
});

interface PreparedFileProjectDetail {
  readonly project: ProjectSummary;
  readonly snapshot: ResourceSnapshot | undefined;
}

export const fileProjectDetail = cache(
  async (slug: string, locale: TextLocale): Promise<PreparedFileProjectDetail | undefined> => {
    const project = (await fileProjectCatalog(locale)).projects.find(
      (value) => value.slug === slug
    );
    if (!project) return undefined;
    const page = findProjectFilePage(slug);
    if (!page) return { project, snapshot: undefined };
    const scope = projectFileScope(page.namespace);
    const [snapshots, content, text] = await Promise.all([
      prepareScopeResources(scope),
      serverContent(scope),
      serverText(locale, RESOURCE_SCOPES.metadata),
    ]);
    const snapshot = snapshots.content;
    if (!snapshot) throw new Error('The file project page needs a Content snapshot.');
    const detail = readFileProjectPage(project, () =>
      content.getResolved(page.namespace, { text })
    );
    if (detail.status === 'invalid-document')
      console.error('File project detail could not be rendered', detail.error);
    return { project, snapshot };
  }
);
