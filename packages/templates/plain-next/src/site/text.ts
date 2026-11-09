export const TEXT_LOCALES = ['en', 'zh'] as const;
export type TextLocale = (typeof TEXT_LOCALES)[number];
export const DEFAULT_TEXT_LOCALE = TEXT_LOCALES[0];
export const TEXT_CONTENT_VERSION = 'v1';
export const TEXT_PREPARATION_VERSION = 3;
export const TEXT_SOURCE = 'plain-next-public';
export const TEXT_NAMESPACES = ['main', 'demo'] as const;
