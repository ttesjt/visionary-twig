import { Suspense } from 'react';
import type { ProjectCategory, ProjectList, ProjectSummary } from '@frontend/portfolio/contracts';
import { useText } from '../../../../infra/resources/client';
import type { ProjectLocation } from '../../project-location';
import type { TextLocale } from '../../../../site/text';
import { sqlProjectLinks } from '../links';
import {
  EmptyProjectState,
  ProjectCategoryLabels,
  ProjectCount,
  ProjectResults,
} from '../../components/project-views';
import { ProjectRegionError } from './project-region-error';
import { useProjectRegion, type ProjectRequest } from './project-region-state';
import { ProjectSkeleton } from '../../components/project-skeleton';

type CategoryRequest = ProjectRequest<readonly ProjectCategory[]>;

function CardCategories({
  request,
  source,
  project,
}: {
  readonly request: CategoryRequest;
  readonly source: string | undefined;
  readonly project: ProjectSummary;
}) {
  const region = useProjectRegion(request, source);
  if (region.status !== 'ready') return null;
  return <ProjectCategoryLabels categories={region.data} project={project} />;
}

function EmptyProjects({
  request,
  source,
  location,
  hrefFor,
}: {
  readonly request: CategoryRequest;
  readonly source: string | undefined;
  readonly location: ProjectLocation;
  readonly hrefFor: (location: ProjectLocation) => string;
}) {
  const categories = useProjectRegion(request, source);
  return (
    <EmptyProjectState
      location={location}
      hrefFor={hrefFor}
      categories={categories.status === 'ready' ? categories.data : undefined}
    />
  );
}

export function ProjectListRegion({
  projects,
  categories,
  source,
  location,
  hrefFor,
  locale,
  titleAs,
}: {
  readonly projects: ProjectRequest<ProjectList>;
  readonly categories: CategoryRequest;
  readonly source: string | undefined;
  readonly location: ProjectLocation;
  readonly hrefFor: (location: ProjectLocation) => string;
  readonly locale: TextLocale;
  readonly titleAs: 'h2' | 'h3';
}) {
  const text = useText();
  const region = useProjectRegion(projects, source);
  if (region.status === 'loading')
    return <ProjectSkeleton label={text.getText('main', 'projects.loading')} />;
  if (region.status === 'failed')
    return <ProjectRegionError region="list" code={region.code} retry={projects.retry} />;
  const { data } = region;
  return (
    <ProjectResults
      data={data}
      links={sqlProjectLinks(locale)}
      location={location}
      hrefFor={hrefFor}
      titleAs={titleAs}
      empty={
        <Suspense fallback={<EmptyProjectState location={location} hrefFor={hrefFor} />}>
          <EmptyProjects
            request={categories}
            source={source}
            location={location}
            hrefFor={hrefFor}
          />
        </Suspense>
      }
      categoryLabels={(project) => (
        <Suspense fallback={null}>
          <CardCategories request={categories} source={source} project={project} />
        </Suspense>
      )}
    />
  );
}

export function ProjectResultCount({
  request,
  source,
}: {
  readonly request: ProjectRequest<ProjectList>;
  readonly source: string | undefined;
}) {
  const region = useProjectRegion(request, source);
  if (region.status !== 'ready') return null;
  return <ProjectCount count={region.data.projects.length} />;
}
