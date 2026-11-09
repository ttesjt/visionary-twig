import type { Metadata } from 'next';
import { metadataInputSchema, type MetadataInput } from './schemas';

/** Maps resolved data only. Resource selection and deployment policy belong to site. */
export function buildMetadata(input: MetadataInput): Metadata {
  const data = metadataInputSchema.parse(input);
  const origin = data.origin ? new URL(data.origin) : undefined;
  const absolute = (path: string) => new URL(path, origin).href;
  const image =
    data.image && (origin || URL.canParse(data.image.src))
      ? {
          url: absolute(data.image.src),
          alt: data.image.alt,
          ...(data.image.width === undefined ? {} : { width: data.image.width }),
          ...(data.image.height === undefined ? {} : { height: data.image.height }),
        }
      : undefined;
  const canonical = origin && data.canonicalPath ? absolute(data.canonicalPath) : undefined;
  const languages =
    origin && data.languagePaths
      ? Object.fromEntries(
          Object.entries(data.languagePaths).map(([locale, path]) => [locale, absolute(path)])
        )
      : undefined;
  return {
    title: data.title,
    description: data.description,
    ...(origin ? { metadataBase: origin } : {}),
    ...(canonical || languages
      ? {
          alternates: {
            ...(canonical ? { canonical } : {}),
            ...(languages ? { languages } : {}),
          },
        }
      : {}),
    openGraph: {
      type: 'website',
      title: data.title,
      description: data.description,
      ...(data.siteName ? { siteName: data.siteName } : {}),
      ...(data.openGraphLocale ? { locale: data.openGraphLocale } : {}),
      ...(data.alternateOpenGraphLocales
        ? { alternateLocale: data.alternateOpenGraphLocales }
        : {}),
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: data.title,
      description: data.description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
