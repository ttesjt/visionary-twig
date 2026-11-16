import { projectCategorySchema, projectSummarySchema } from '@frontend/portfolio/contracts';
import type { ProjectCategory, ProjectList, ProjectSummary } from '@frontend/portfolio/contracts';
import type { ProjectLocation } from '../project-location.ts';
import { DEFAULT_TEXT_LOCALE, type TextLocale } from '../../../site/text.ts';
import { projectFileCatalogSchema } from './schemas.ts';

export interface FileProjectCatalog {
  readonly projects: readonly ProjectSummary[];
  readonly categories: readonly ProjectCategory[];
}

/** Inputs have passed through Content's Text-reference resolver for the current language. */
export function readFileProjectCatalog(input: unknown, locale: TextLocale): FileProjectCatalog {
  const catalog = projectFileCatalogSchema.parse(input);
  const projects = [...catalog.projects]
    .sort((left, right) => {
      const order = Number(right.pinned) - Number(left.pinned) || left.sortOrder - right.sortOrder;
      if (order) return order;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    })
    .map(({ sortOrder: _sortOrder, ...project }) =>
      projectSummarySchema.parse({
        ...project,
        locale,
        defaultLocale: DEFAULT_TEXT_LOCALE,
        ...(project.badge && { badge: { ...project.badge, locale } }),
      })
    );
  const categories = catalog.categories.map((category) =>
    projectCategorySchema.parse({
      ...category,
      count: projects.filter((project) => project.categoryIds.includes(category.id)).length,
    })
  );
  return { projects, categories };
}

export function queryFileProjects(
  catalog: FileProjectCatalog,
  { category, page }: ProjectLocation,
  pageSize: number
): ProjectList {
  const projects = catalog.projects.filter(
    (project) => category === null || project.categoryIds.includes(category)
  );
  const offset = (page - 1) * pageSize;
  return {
    projects: projects.slice(offset, offset + pageSize),
    hasMore: projects.length > offset + pageSize,
  };
}
