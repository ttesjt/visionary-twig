'use client';

import { useAppConfig, useText } from '../../../../infra/resources/client';
import { textLocale } from '../../../../infra/resources';
import { localeHref } from '../../../../infra/resources/routing';
import { portfolioPageSize } from '../../../../site/config-schema';
import { queryFileProjects } from '../catalog';
import { PROJECT_FILES_PATH, projectFilePath, projectFileMedia } from '../constants';
import { useFileProjects } from './use-file-projects';
import { useProjectNavigation } from '../../components/project-navigation';
import {
  ProjectCollection,
  ProjectFilterView,
  ProjectCount,
  ProjectResults,
  ProjectCategoryLabels,
  EmptyProjectState,
} from '../../components/project-views';

export function ContentProjects({
  pathname = PROJECT_FILES_PATH,
  titleAs = 'h2',
}: {
  readonly pathname?: string;
  readonly titleAs?: 'h2' | 'h3';
}) {
  const text = useText();
  const locale = textLocale(text.locale);
  const pageSize = portfolioPageSize(useAppConfig().get('app'));
  const { location, hrefFor } = useProjectNavigation(pathname, locale, pageSize);
  const catalog = useFileProjects();
  const data = queryFileProjects(catalog, location, pageSize);
  return (
    <ProjectCollection
      filters={
        <ProjectFilterView categories={catalog.categories} location={location} hrefFor={hrefFor} />
      }
      count={<ProjectCount count={data.projects.length} />}
    >
      <ProjectResults
        data={data}
        location={location}
        hrefFor={hrefFor}
        titleAs={titleAs}
        links={{
          detail: (project) => localeHref(projectFilePath(project.slug), text.locale),
          media: (_project, key) => projectFileMedia(key),
        }}
        empty={
          <EmptyProjectState
            location={location}
            hrefFor={hrefFor}
            categories={catalog.categories}
          />
        }
        categoryLabels={(project) => (
          <ProjectCategoryLabels categories={catalog.categories} project={project} />
        )}
      />
    </ProjectCollection>
  );
}
