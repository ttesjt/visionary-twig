import { DEFAULT_TEXT_LOCALE, TEXT_LOCALES, type TextLocale } from '../../site/text';

/** Accept an internal, unprefixed Studio path including any search and hash. */
export function studioHref(path: string, locale: TextLocale): string {
  const prefix = '/' + locale;
  return locale === DEFAULT_TEXT_LOCALE ? path : prefix + (path === '/' ? '' : path);
}
/** Resource and editor route matchers operate on the path below [locale]. */
export function studioPathname(path: string): string {
  const prefix = TEXT_LOCALES.find(
    (locale) => path === '/' + locale || path.startsWith('/' + locale + '/')
  );
  return prefix ? path.slice(prefix.length + 1) || '/' : path;
}
