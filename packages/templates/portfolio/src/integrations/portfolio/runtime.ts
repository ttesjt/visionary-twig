import 'server-only';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readProjectDatasets, projectMediaKeys } from '../../features/projects/import.node.ts';
import type { PortfolioData } from '../../features/projects/sql';
import { PROJECT_PUBLIC_DIRECTORY } from '../../site/project-data';

const datasets = () => readProjectDatasets(process.cwd());
export const portfolioData: PortfolioData = {
  sourceId: () => Promise.resolve('portfolio-template-demo'),
  projects({ locale, categoryId, offset, limit }) {
    const projects =
      datasets()
        .find((data) => data.locale === locale)
        ?.projects.filter(
          (project) => categoryId === undefined || project.categoryIds.includes(categoryId)
        ) ?? [];
    return Promise.resolve({
      projects: projects.slice(offset, offset + limit),
      hasMore: offset + limit < projects.length,
    });
  },
  categories(locale) {
    return Promise.resolve(datasets().find((data) => data.locale === locale)?.categories ?? []);
  },
  detail(slug, locale) {
    const dataset = datasets().find((data) => data.locale === locale);
    const project = dataset?.projects.find((project) => project.slug === slug);
    if (!project) return Promise.resolve({ status: 'not-found' });
    const page = dataset?.pages.find((page) => page.projectId === project.id);
    return Promise.resolve(
      page ? { status: 'ready', project, page } : { status: 'summary-only', project }
    );
  },
  async media(projectId, objectKey) {
    const project = datasets()[0]?.projects.find((project) => project.id === projectId);
    if (!project || !projectMediaKeys(project).includes(objectKey)) return null;
    return {
      bytes: await readFile(resolve(PROJECT_PUBLIC_DIRECTORY, objectKey)),
      contentType: 'image/jpeg',
    };
  },
};
