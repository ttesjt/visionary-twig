import { TEXT_LOCALES, DEFAULT_TEXT_LOCALE, type TextLocale } from '../text/configuration';
type LocaleRoute =
  | { readonly kind: 'invalid' }
  | { readonly kind: 'pass'; readonly locale: TextLocale }
  | { readonly kind: 'rewrite'; readonly locale: TextLocale; readonly pathname: string };
/** URL selection runs once before either Layout or Page renders. */
export function resolveLocaleRoute(pathname: string, languages: readonly string[]): LocaleRoute {
  if (languages.length > 1) return { kind: 'invalid' };
  const requested = languages[0];
  const queryLocale = TEXT_LOCALES.find((locale) => locale === requested);
  if (requested !== undefined && !queryLocale) return { kind: 'invalid' };
  const prefix = TEXT_LOCALES.find(
    (locale) => pathname === '/' + locale || pathname.startsWith('/' + locale + '/')
  );
  if (prefix && queryLocale && prefix !== queryLocale) return { kind: 'invalid' };
  const locale = prefix ?? queryLocale ?? DEFAULT_TEXT_LOCALE;
  return prefix
    ? { kind: 'pass', locale }
    : { kind: 'rewrite', locale, pathname: '/' + locale + (pathname === '/' ? '' : pathname) };
}
/** Keep existing public paths while carrying the shared locale through navigation. */
export function localeHref(pathname: string, locale: string): string {
  if (!TEXT_LOCALES.some((value) => value === locale)) throw new Error('Unknown route locale.');
  return locale === DEFAULT_TEXT_LOCALE
    ? pathname
    : pathname + '?' + new URLSearchParams({ lang: locale }).toString();
}
