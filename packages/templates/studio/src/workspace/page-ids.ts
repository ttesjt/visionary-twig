import { DEMO_ROUTES } from './demo/demo-routes.ts';
export const STUDIO_PAGES = { overview: 'overview', demo: 'demo', pages: 'pages' } as const;
export const STUDIO_PAGE_IDS = Object.values(STUDIO_PAGES);
export type StudioPageId = (typeof STUDIO_PAGES)[keyof typeof STUDIO_PAGES];
export const DEFAULT_STUDIO_PAGE = STUDIO_PAGES.overview;
export function studioPageId(value: string): StudioPageId | undefined {
  return STUDIO_PAGE_IDS.find((id) => id === value);
}
export function studioPageHref(id: string): string {
  const known = studioPageId(id);
  if (!known) throw new Error('Unknown workspace page: ' + id);
  if (known === STUDIO_PAGES.pages) return DEMO_ROUTES.pages;
  return known === DEFAULT_STUDIO_PAGE ? '/' : '/' + known;
}

/** Match a complete first URL segment, not a string prefix such as /demonstration. */
export function studioRoutePageId(pathname: string): StudioPageId | undefined {
  if (pathname === DEMO_ROUTES.pages || pathname.startsWith(DEMO_ROUTES.pages + '/'))
    return STUDIO_PAGES.pages;
  return pathname === '/' ? DEFAULT_STUDIO_PAGE : studioPageId(pathname.split('/')[1] ?? '');
}
