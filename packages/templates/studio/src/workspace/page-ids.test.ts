import { expect, it } from 'vitest';
import { studioPageHref, studioRoutePageId } from './page-ids';
it('keeps nested content under the resource entry without accepting path-prefix collisions', () => {
  expect(studioRoutePageId('/')).toBe('overview');
  expect(studioRoutePageId('/demo')).toBe('demo');
  expect(studioRoutePageId('/demo/upload')).toBe('demo');
  expect(studioRoutePageId('/demonstration')).toBeUndefined();
});

it('promotes the existing page resource without duplicating its store or editor routes', () => {
  expect(studioPageHref('pages')).toBe('/demo/pages');
  for (const path of ['/demo/pages', '/demo/pages/new', '/demo/pages/id/edit/json'])
    expect(studioRoutePageId(path)).toBe('pages');
  expect(studioRoutePageId('/demo/pages-extra')).toBe('demo');
});
