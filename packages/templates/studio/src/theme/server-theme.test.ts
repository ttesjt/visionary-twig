import { beforeEach, expect, it, vi } from 'vitest';
import { THEME_PREFERENCES, DEFAULT_THEME_POLICY } from '@frontend/ui/theme';
import { getStudioTheme } from './server-theme';
import { STUDIO_THEME_COOKIE_NAME } from './theme-preference';
const readCookies = vi.hoisted(() =>
  vi.fn<() => Promise<ReadonlyMap<string, { value: string }>>>()
);
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: readCookies }));
beforeEach(() => {
  readCookies.mockReset();
});
it('restores each valid stored preference for the server render', async () => {
  for (const preference of THEME_PREFERENCES) {
    readCookies.mockResolvedValue(new Map([[STUDIO_THEME_COOKIE_NAME, { value: preference }]]));
    await expect(getStudioTheme(DEFAULT_THEME_POLICY)).resolves.toBe(preference);
  }
});
it('uses the configured default for missing or invalid cookies', async () => {
  for (const stored of [
    new Map<string, { value: string }>(),
    new Map([[STUDIO_THEME_COOKIE_NAME, { value: 'invalid' }]]),
  ]) {
    readCookies.mockResolvedValue(stored);
    await expect(getStudioTheme({ mode: 'selectable', defaultPreference: 'dark' })).resolves.toBe(
      'dark'
    );
  }
});
it('fixed policies ignore cookie storage entirely', async () => {
  readCookies.mockRejectedValue(new Error('Cookie access should be unnecessary.'));
  for (const scheme of ['light', 'dark'] as const)
    await expect(getStudioTheme({ mode: 'fixed', scheme })).resolves.toBe(scheme);
  expect(readCookies).not.toHaveBeenCalled();
});
