import { notFound } from 'next/navigation';
import { resourceRouteLocale } from '../../../../../infra/resources/server';
import { projectMetadata } from '../../../../../site/metadata';
import { projectFilePath, projectFileMedia } from '../../../../../features/projects/files';
import {
  fileProjectCatalog,
  fileProjectDetail,
} from '../../../../../features/projects/files/server.ts';
import { DEFAULT_TEXT_LOCALE } from '../../../../../site/text';
import { ContentProjectDetail } from '../../../../../features/projects/files/client';

interface PageProps {
  readonly params: Promise<{ readonly locale: string; readonly slug: string }>;
}

export async function generateStaticParams() {
  return (await fileProjectCatalog(DEFAULT_TEXT_LOCALE)).projects.map(({ slug }) => ({ slug }));
}

async function forRoute(params: PageProps['params']) {
  const locale = await resourceRouteLocale(params);
  const { slug } = await params;
  const detail = await fileProjectDetail(slug, locale);
  if (!detail) notFound();
  return { locale, ...detail };
}

export async function generateMetadata({ params }: PageProps) {
  const { project, locale } = await forRoute(params);
  return projectMetadata(project, locale, {
    pathname: projectFilePath(project.slug),
    coverUrl: project.cover ? projectFileMedia(project.cover.objectKey) : undefined,
  });
}

export default async function Page({ params }: PageProps) {
  const { project, snapshot } = await forRoute(params);
  return <ContentProjectDetail slug={project.slug} initialSnapshot={snapshot} />;
}
