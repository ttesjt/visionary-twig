import 'server-only';
import type { Metadata } from 'next';
import type { ProjectSummary } from '@frontend/portfolio/contracts';
import { prepareMetadata, type MetadataDefinition } from '../infra/metadata/server';
import { buildMetadata, metadataPathSchema, type MetadataInput } from '../infra/metadata';
import { readServerEnvironment } from '../infra/environment/server';
import { serverText } from '../infra/resources/server';
import { readSiteAppConfig } from './app-config.server';
import { metadataEnvironmentSchema } from './environment';
import { RESOURCE_SCOPES } from './resource-scopes';
import { DEFAULT_TEXT_LOCALE, TEXT_LOCALES, type TextLocale } from './text';

export interface SiteMetadataContext {
  readonly locale: TextLocale;
  /** Supply only on a page, never guess a child route in Root Layout. */
  readonly pathname?: string;
}
const OPEN_GRAPH_LOCALES = { en: 'en_US', zh: 'zh_CN' } satisfies Record<TextLocale, string>;

/** This source owns namespace/key mappings. Rename or replace resources here. */
async function loadSiteMetadata({ locale, pathname }: SiteMetadataContext): Promise<MetadataInput> {
  if (pathname !== undefined) metadataPathSchema.parse(pathname);
  const { SITE_URL: origin } = readServerEnvironment(metadataEnvironmentSchema);
  const [text, config] = await Promise.all([
    serverText(locale, RESOURCE_SCOPES.metadata, {
      onMissing(namespace, key, language) {
        throw new Error(`Missing metadata text: ${namespace}.${key} (${language}).`);
      },
    }),
    readSiteAppConfig(),
  ]);
  const localizedPath = (language: TextLocale) =>
    '/' + language + (pathname === '/' ? '' : pathname);
  return {
    title: text.getText('main', 'metadata.title'),
    description: text.getText('main', 'metadata.description'),
    openGraphLocale: OPEN_GRAPH_LOCALES[locale],
    alternateOpenGraphLocales: TEXT_LOCALES.filter((language) => language !== locale).map(
      (language) => OPEN_GRAPH_LOCALES[language]
    ),
    ...(origin ? { origin } : {}),
    ...(pathname
      ? {
          canonicalPath: localizedPath(locale),
          languagePaths: Object.fromEntries(
            TEXT_LOCALES.map((language) => [language, localizedPath(language)])
          ),
        }
      : {}),
    ...(config.metadata?.image
      ? {
          image: {
            ...config.metadata.image,
            alt: text.getText('main', 'metadata.imageAlt'),
          },
        }
      : {}),
  };
}

/** Controls this source only; Next file-based icons and independent page metadata still apply. */
export const metadataDefinition: MetadataDefinition<SiteMetadataContext> = {
  enabled: true,
  load: loadSiteMetadata,
};

export function siteMetadata(
  locale: TextLocale = DEFAULT_TEXT_LOCALE,
  pathname?: string
): Promise<Metadata> {
  return prepareMetadata(metadataDefinition, {
    locale,
    ...(pathname === undefined ? {} : { pathname }),
  });
}

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
