import { Suspense } from 'react';
import { SqlProjectList } from '../../../features/projects/sql/server';
import type { ProjectSearchParameters } from '../../../features/projects';
import { resourceRouteLocale, serverText } from '../../../infra/resources/server';
import { portfolioData } from '../../../integrations/portfolio/runtime';
import { siteMetadata } from '../../../site/metadata';
import { RESOURCE_SCOPES } from '../../../site/resource-scopes';
import { SITE_ROUTES } from '../../../site/routes';
import { ProjectSkeleton } from '../../../features/projects/client';

interface PageProps {
  readonly params: Promise<{ readonly locale: string }>;
  readonly searchParams: Promise<ProjectSearchParameters>;
}

export async function generateMetadata({ params }: PageProps) {
  return siteMetadata(await resourceRouteLocale(params), SITE_ROUTES.projects);
}

export default async function Page({ params, searchParams }: PageProps) {
  const locale = await resourceRouteLocale(params);
  const text = await serverText(locale, RESOURCE_SCOPES.metadata);
  return (
    <div className="ui-portfolio-page">
      <header className="ui-portfolio-page-heading">
        <h1>{text.getText('main', 'projects.title')}</h1>
        <p className="ui-portfolio-lead">{text.getText('main', 'projects.description')}</p>
      </header>
      <Suspense
        fallback={<ProjectSkeleton label={text.getText('main', 'projects.loading')} showFilters />}
      >
        <SqlProjectList locale={locale} searchParams={searchParams} data={portfolioData} />
      </Suspense>
    </div>
  );
}
