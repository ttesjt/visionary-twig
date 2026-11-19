import Link from 'next/link';
import { Suspense } from 'react';
import { resourceRouteLocale, serverText } from '../../../../infra/resources/server';
import { readSiteAppConfig } from '../../../../site/app-config.server.ts';
import { portfolioPageSize } from '../../../../site/config-schema';
import { siteMetadata } from '../../../../site/metadata';
import { PROJECT_FILES_PATH } from '../../../../features/projects/files';
import { parseProjectLocation, projectLocationHref } from '../../../../features/projects';
import { RESOURCE_SCOPES } from '../../../../site/resource-scopes';
import { SITE_ROUTES } from '../../../../site/routes';
import { ProjectSkeleton } from '../../../../features/projects/client';
import { ContentProjects } from '../../../../features/projects/files/client';

interface PageProps {
  readonly params: Promise<{ readonly locale: string }>;
  readonly searchParams: Promise<{
    readonly category?: string | readonly string[];
    readonly page?: string | readonly string[];
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  return siteMetadata(await resourceRouteLocale(params), PROJECT_FILES_PATH);
}

export default async function Page({ params, searchParams }: PageProps) {
  const locale = await resourceRouteLocale(params);
  const [text, config, query] = await Promise.all([
    serverText(locale, RESOURCE_SCOPES.metadata),
    readSiteAppConfig(),
    searchParams,
  ]);
  const location = parseProjectLocation(query, portfolioPageSize(config));
  return (
    <div className="ui-portfolio-page">
      <Link href={projectLocationHref(SITE_ROUTES.projects, '', '', locale, location)}>
        {text.getText('main', 'projects.back')}
      </Link>
      <header className="ui-portfolio-page-heading">
        <h1>{text.getText('main', 'fileProjects.title')}</h1>
        <p className="ui-portfolio-lead">{text.getText('main', 'fileProjects.description')}</p>
      </header>
      <Suspense
        fallback={<ProjectSkeleton label={text.getText('main', 'projects.loading')} showFilters />}
      >
        <ContentProjects />
      </Suspense>
    </div>
  );
}
