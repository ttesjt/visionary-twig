import type { ReactNode } from 'react';
import type { ProjectCategory, ProjectList, ProjectSummary } from '@frontend/portfolio/contracts';
import { useText } from '../../../infra/resources/client';
import type { ProjectLocation } from '../project-location';
import { ProjectCards, type ProjectLinks } from './project-cards';
import { ProjectFilters } from './project-filters';
import { ProjectPagination } from './project-pagination';

export interface ProjectLocationProps {
  readonly location: ProjectLocation;
  readonly hrefFor: (location: ProjectLocation) => string;
}

export function ProjectCollection({
  filters,
  count,
  children,
}: {
  readonly filters: ReactNode;
  readonly count: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="ui-portfolio-projects">
      <div className="ui-portfolio-project-toolbar">
        {filters}
        {count}
      </div>
      {children}
    </div>
  );
}

export function ProjectFilterView({
  categories,
  location,
  hrefFor,
}: ProjectLocationProps & { readonly categories: readonly ProjectCategory[] }) {
  const text = useText();
  return (
    <ProjectFilters
      categories={categories}
      active={location.category}
      hrefForCategory={(category) =>
        hrefFor(category === location.category ? location : { category, page: 1 })
      }
      text={{
        label: text.getText('main', 'projects.category'),
        all: text.getText('main', 'projects.all'),
      }}
    />
  );
}

export function ProjectCount({ count }: { readonly count: number }) {
  const text = useText();
  return (
    <p className="ui-project-pagination-info" aria-live="polite">
      {text.getText('main', 'projects.shown', { count })}
    </p>
  );
}

export function ProjectCategoryLabels({
  categories,
  project,
}: {
  readonly categories: readonly ProjectCategory[];
  readonly project: ProjectSummary;
}) {
  const labels = categories
    .filter(({ id }) => project.categoryIds.includes(id))
    .map(({ label }) => label);
  return labels.length ? <p className="ui-project-category-labels">{labels.join(' / ')}</p> : null;
}

export function EmptyProjectState({
  location,
  hrefFor,
  categories,
}: ProjectLocationProps & { readonly categories?: readonly ProjectCategory[] | undefined }) {
  const text = useText();
  const removedCategory =
    location.category !== null &&
    categories !== undefined &&
    !categories.some(({ id }) => id === location.category);
  const outOfRange = !removedCategory && location.page > 1;
  const recovery = removedCategory
    ? { category: null, page: 1 }
    : outOfRange
      ? { category: location.category, page: 1 }
      : null;
  const emptyKey = outOfRange
    ? 'projects.emptyPage'
    : location.category === null && categories?.length === 0
      ? 'projects.emptyCollection'
      : 'projects.empty';
  return (
    <>
      <p className="ui-project-grid-empty">{text.getText('main', emptyKey)}</p>
      <ProjectPagination
        location={location}
        hrefFor={hrefFor}
        hasMore={false}
        recovery={recovery}
      />
    </>
  );
}

export function ProjectResults({
  data,
  links,
  categoryLabels,
  empty,
  location,
  hrefFor,
  titleAs,
}: ProjectLocationProps & {
  readonly data: ProjectList;
  readonly links: ProjectLinks;
  readonly categoryLabels: (project: ProjectSummary) => ReactNode;
  readonly empty: ReactNode;
  readonly titleAs: 'h2' | 'h3';
}) {
  const text = useText();
  if (!data.projects.length) return empty;
  return (
    <>
      <ProjectCards
        projects={data.projects}
        links={links}
        titleAs={titleAs}
        pinnedLabel={text.getText('main', 'projects.pinned')}
        categoryLabels={categoryLabels}
      />
      <ProjectPagination
        location={location}
        hrefFor={hrefFor}
        hasMore={data.hasMore}
        recovery={null}
      />
    </>
  );
}
