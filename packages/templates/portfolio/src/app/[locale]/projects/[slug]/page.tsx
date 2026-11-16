import { getSqlProjectDetail } from '../../../../features/projects/sql/server';
import { notFound } from 'next/navigation';
import { projectSlugSchema } from '@frontend/portfolio/contracts';
import { localeHref } from '../../../../infra/resources/routing';
import { resourceRouteLocale } from '../../../../infra/resources/server';
import { portfolioData } from '../../../../integrations/portfolio/runtime';
import { projectMetadata } from '../../../../site/metadata';
import { ProjectDetailView } from '../../../../features/projects/client';
import { SITE_ROUTES } from '../../../../site/routes';
import { projectMediaPath, projectPath } from '../../../../features/projects/sql';

interface PageProps {
  readonly params: Promise<{ readonly locale: string; readonly slug: string }>;
}

async function projectRoute(params: PageProps['params']) {
  const locale = await resourceRouteLocale(params);
  const slug = projectSlugSchema.safeParse((await params).slug);
  if (!slug.success) notFound();
  return { locale, slug: slug.data };
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await projectRoute(params);
  const project = (await getSqlProjectDetail(portfolioData, slug, locale)).project;
  return projectMetadata(project, locale, {
    pathname: projectPath(project.slug),
    coverUrl: project.cover ? projectMediaPath(project.id, project.cover.objectKey) : undefined,
  });
}

export default async function ProjectPage({ params }: PageProps) {
  const { locale, slug } = await projectRoute(params);
  const detail = await getSqlProjectDetail(portfolioData, slug, locale);
  return (
    <ProjectDetailView
      project={detail.project}
      status={detail.status}
      page={detail.status === 'ready' ? detail.page : undefined}
      backHref={localeHref(SITE_ROUTES.projects, locale)}
    />
  );
}
