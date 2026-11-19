import { PROJECT_TEXT_NAMESPACES, PROJECT_FILE_PAGES } from './project-data.ts';
export const TEXT_LOCALES = ['en', 'zh'] as const;
export type TextLocale = (typeof TEXT_LOCALES)[number];
export const DEFAULT_TEXT_LOCALE = TEXT_LOCALES[0];
export const TEXT_CONTENT_VERSION = 'v1';
export const TEXT_PREPARATION_VERSION = 3;
export const TEXT_SOURCE = 'portfolio-public';
// Registration prepares every available dictionary; each scope chooses what to load.
const pageNamespaces = PROJECT_FILE_PAGES.flatMap(
  (page) => ('textNamespaces' in page ? page.textNamespaces : []) ?? []
);
export const TEXT_NAMESPACES = [
  ...new Set(['main', ...PROJECT_TEXT_NAMESPACES, ...pageNamespaces] as const),
] as const;
