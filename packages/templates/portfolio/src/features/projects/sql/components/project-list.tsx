import type { TextLocale } from '../../../../site/text';
import type { ProjectSearchParameters } from '../../project-location';
import { parseProjectLocation } from '../../project-location';
import { projectListQuery } from '../query';
import { readCollection } from '../read-collection';
import { ProjectBrowser } from '../browser/project-browser';
import type { PortfolioData } from '../contracts';
import { SITE_ROUTES } from '../../../../site/routes';
import { readSiteAppConfig } from '../../../../site/app-config.server';
import { portfolioPageSize } from '../../../../site/config-schema';

export async function SqlProjectList({
  locale,
  searchParams,
  data,
}: {
  readonly locale: TextLocale;
  readonly searchParams: Promise<ProjectSearchParameters>;
  readonly data: PortfolioData;
}) {
  const pageSize = portfolioPageSize(await readSiteAppConfig());
  const location = parseProjectLocation(await searchParams, pageSize);
  const source = await data.sourceId().catch(() => undefined);
  const projects = readCollection(
    data.sourceId,
    () => data.projects(projectListQuery(locale, location, pageSize)),
    source
  );
  const categories = readCollection(data.sourceId, () => data.categories(locale), source);
  return (
    <ProjectBrowser
      pathname={SITE_ROUTES.projects}
      initial={{ location, source, projects, categories }}
      locale={locale}
    />
  );
}
