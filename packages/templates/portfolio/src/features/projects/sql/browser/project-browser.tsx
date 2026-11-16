'use client';

import { Suspense, useState } from 'react';
import type { ProjectCategory, ProjectList } from '@frontend/portfolio/contracts';
import { useAppConfig, useText } from '../../../../infra/resources/client';
import type { PortfolioRead } from '../http-contract';
import { portfolioPageSize } from '../../../../site/config-schema';
import type { ProjectLocation } from '../../project-location';
import { projectListUrl } from '../query';
import { PROJECT_ENDPOINTS } from '../routes';
import type { TextLocale } from '../../../../site/text';
import { ProjectCollection } from '../../components/project-views';
import { ProjectCategoryRegion } from './project-category-region';
import { ProjectListRegion, ProjectResultCount } from './project-list-region';
import { useProjectNavigation } from '../../components/project-navigation';
import { useProjectRequest } from './project-region-state';
import { readProjectCategories, readProjects } from './project-requests';
import { ProjectCategorySkeleton, ProjectSkeleton } from '../../components/project-skeleton';

interface InitialProjects {
  readonly location: ProjectLocation;
  readonly source: string | undefined;
  readonly projects: Promise<PortfolioRead<ProjectList>>;
  readonly categories: Promise<PortfolioRead<readonly ProjectCategory[]>>;
}

export function ProjectBrowser({
  pathname,
  initial,
  locale,
  titleAs = 'h2',
}: {
  readonly pathname: string;
  readonly initial?: InitialProjects;
  readonly locale: TextLocale;
  readonly titleAs?: 'h2' | 'h3';
}) {
  const text = useText();
  const { location, hrefFor } = useProjectNavigation(
    pathname,
    locale,
    portfolioPageSize(useAppConfig().get('app'))
  );
  const requestedUrl = projectListUrl(locale, location);
  const [observedSource, setObservedSource] = useState<string>();
  const expectedSource = initial?.source ?? observedSource;
  const rememberSource = (source: string) => {
    if (initial?.source === undefined) setObservedSource((current) => current ?? source);
  };
  const projects = useProjectRequest({
    url: requestedUrl,
    cacheSource: initial?.source,
    expectedSource,
    seed:
      initial && requestedUrl === projectListUrl(locale, initial.location)
        ? initial.projects
        : undefined,
    read: readProjects,
    onSource: rememberSource,
  });
  const categories = useProjectRequest({
    url: PROJECT_ENDPOINTS.categories + '?' + new URLSearchParams({ locale }).toString(),
    cacheSource: initial?.source,
    expectedSource,
    seed: initial?.categories,
    read: readProjectCategories,
    onSource: rememberSource,
  });
  const source = expectedSource ?? projects.response?.source ?? categories.response?.source;

  return (
    <ProjectCollection
      filters={
        <Suspense
          fallback={
            <ProjectCategorySkeleton label={text.getText('main', 'projects.categoriesLoading')} />
          }
        >
          <ProjectCategoryRegion
            request={categories}
            source={source}
            location={location}
            hrefFor={hrefFor}
          />
        </Suspense>
      }
      count={
        <Suspense fallback={null}>
          <ProjectResultCount request={projects} source={source} />
        </Suspense>
      }
    >
      <Suspense fallback={<ProjectSkeleton label={text.getText('main', 'projects.loading')} />}>
        <ProjectListRegion
          projects={projects}
          categories={categories}
          source={source}
          location={location}
          hrefFor={hrefFor}
          locale={locale}
          titleAs={titleAs}
        />
      </Suspense>
    </ProjectCollection>
  );
}
