import type { DemoRecord } from './demo-record';
export const DEMO_ROUTES = {
  list: '/demo',
  upload: '/demo/upload',
  pages: '/demo/pages',
  newPage: '/demo/pages/new',
} as const;
export const demoPageHref = (id: string): string =>
  DEMO_ROUTES.pages + '/' + encodeURIComponent(id) + '/edit';
export const demoItemPageHref = (item: Pick<DemoRecord, 'id' | 'pageId'>): string =>
  item.pageId
    ? demoPageHref(item.pageId)
    : DEMO_ROUTES.newPage + '?item=' + encodeURIComponent(item.id);

export type DemoEditorMode = 'viewer' | 'json' | 'puck';
const DEMO_EDIT_PATH = /^(\/demo\/pages\/[^/]+\/edit)(?:\/(json|puck))?$/u;
const DEMO_NEW_PATH = /^(\/demo\/pages\/new)(?:\/(json|puck))?$/u;
export function demoEditingRoute(path: string) {
  const match = DEMO_NEW_PATH.exec(path) ?? DEMO_EDIT_PATH.exec(path);
  if (!match?.[1]) return null;
  const mode: DemoEditorMode =
    match[2] === 'json' ? 'json' : match[2] === 'puck' ? 'puck' : 'viewer';
  return { base: match[1], mode };
}
export function demoEditorHref(base: string, mode: DemoEditorMode, search = ''): string {
  return base + (mode === 'viewer' ? '' : '/' + mode) + search;
}
export function isDemoPageEditingPath(path: string): boolean {
  return demoEditingRoute(path) !== null;
}
export function isDemoFocusedPath(path: string): boolean {
  const route = demoEditingRoute(path);
  return route !== null && route.mode !== 'viewer';
}
