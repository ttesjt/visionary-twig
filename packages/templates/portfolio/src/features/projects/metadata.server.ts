import 'server-only';
import type { Metadata } from 'next';
import type { ProjectSummary } from '@frontend/portfolio/contracts';
import { buildMetadata, metadataPathSchema } from '../../infra/metadata';
import { readServerEnvironment } from '../../infra/environment/server';
import { metadataEnvironmentSchema } from '../../site/environment';
import { OPEN_GRAPH_LOCALES } from '../../site/metadata';
import { TEXT_LOCALES, type TextLocale } from '../../site/text';

export function projectMetadata(
  project: ProjectSummary,
  routeLocale: TextLocale,
  links: { readonly pathname: string; readonly coverUrl?: string | undefined }
): Metadata {
  const { SITE_URL: origin } = readServerEnvironment(metadataEnvironmentSchema);
  const locale = TEXT_LOCALES.find((language) => language === project.locale) ?? routeLocale;
  const cover = project.cover;
  const display = cover?.sources?.display;
  return buildMetadata({
    title: project.title,
    description: project.summary,
    openGraphLocale: OPEN_GRAPH_LOCALES[locale],
    ...(origin && {
      origin,
      canonicalPath: '/' + locale + metadataPathSchema.parse(links.pathname),
    }),
    ...(origin &&
      cover &&
      links.coverUrl && {
        image: {
          src: new URL(links.coverUrl, origin).href,
          alt: cover.alt,
          ...(display && { width: display.width, height: display.height }),
        },
      }),
  });
}
