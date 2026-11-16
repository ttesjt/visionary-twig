import type { StorageConnection } from '@frontend/storage';
import type { ContentRegistry } from '@frontend/ui-document';
import type { ProjectSummary } from '../catalog/contracts.js';
import { findProjectBySlug } from '../catalog/server.js';
import { PortfolioDataError } from '../data-error.js';
import type { PublishedProjectPage } from '../pages/contracts.js';
import { readPublishedProjectPage } from '../pages/server.js';

export type ProjectDetail =
  | { readonly status: 'not-found' }
  | { readonly status: 'summary-only'; readonly project: ProjectSummary }
  | {
      readonly status: 'invalid-document';
      readonly project: ProjectSummary;
      readonly error: PortfolioDataError;
    }
  | {
      readonly status: 'ready';
      readonly project: ProjectSummary;
      readonly page: PublishedProjectPage;
    };

export function readProjectDetail(
  storage: Pick<StorageConnection, 'read'>,
  registry: ContentRegistry,
  slug: string,
  locale: string
): Promise<ProjectDetail> {
  return storage.read(async (database) => {
    const project = await findProjectBySlug(database, slug, locale);
    if (!project) return { status: 'not-found' };
    try {
      const page = await readPublishedProjectPage(database, registry, project.id, project.locale);
      if (page) return { status: 'ready', project, page };
      if (project.locale !== project.defaultLocale) {
        const fallback = await readPublishedProjectPage(
          database,
          registry,
          project.id,
          project.defaultLocale
        );
        if (fallback) {
          const summary = await findProjectBySlug(database, slug, fallback.locale);
          if (summary?.id === fallback.projectId && summary.locale === fallback.locale) {
            return {
              status: 'ready',
              project: { ...summary, ...(project.badge && { badge: project.badge }) },
              page: fallback,
            };
          }
        }
      }
      return { status: 'summary-only', project };
    } catch (error) {
      if (error instanceof PortfolioDataError && error.code === 'invalid-published-page')
        return { status: 'invalid-document', project, error };
      throw error;
    }
  });
}
