import { describe, expect, it } from 'vitest';
import { demoEditingRoute, demoEditorHref, isDemoFocusedPath } from './demo-routes';
describe('Demo editing route identities', () => {
  it('retains resource identity and pending item search across editing modes', () => {
    for (const base of ['/demo/pages/new', '/demo/pages/neutral-page/edit']) {
      for (const mode of ['viewer', 'json', 'puck'] as const) {
        const href = demoEditorHref(base, mode, '?item=field-guide');
        const url = new URL(href, 'https://studio.example.invalid');
        expect(demoEditingRoute(url.pathname)).toEqual({ base, mode });
        expect(url.search).toBe('?item=field-guide');
        expect(isDemoFocusedPath(url.pathname)).toBe(mode !== 'viewer');
      }
    }
  });
  it('does not classify unrelated pages or unknown descendants as an editor', () => {
    for (const path of [
      '/demo',
      '/demo/pages',
      '/demo/pages/new/unknown',
      '/demo/pages/id/edit/json/extra',
      '/demo/upload',
    ])
      expect(demoEditingRoute(path)).toBeNull();
  });
});
