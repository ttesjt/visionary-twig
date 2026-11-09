import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_THEME_POLICY } from '@frontend/ui/theme';
import { useStudioAppearance } from './use-studio-appearance';
import { STUDIO_THEME_COOKIE_NAME } from './theme-preference';
afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = `${STUDIO_THEME_COOKIE_NAME}=; Path=/; Max-Age=0`;
  delete document.documentElement.dataset.theme;
});
it('starts from the server value and records the preference rather than the resolved OS color', () => {
  const { result } = renderHook(() => useStudioAppearance('light', DEFAULT_THEME_POLICY));
  expect(document.documentElement.dataset.theme).toBe('light');
  act(() => result.current.setPreference('dark'));
  expect(result.current.preference).toBe('dark');
  expect(document.cookie).toContain(`${STUDIO_THEME_COOKIE_NAME}=dark`);
  expect(document.documentElement.dataset.theme).toBe('dark');
  act(() => result.current.setPreference('system'));
  expect(document.cookie).toContain(`${STUDIO_THEME_COOKIE_NAME}=system`);
  expect(document.documentElement.dataset.theme).toBe('system');
});
it('a fixed policy applies without overwriting a previously saved selectable preference', () => {
  document.cookie = `${STUDIO_THEME_COOKIE_NAME}=dark; Path=/`;
  const { result } = renderHook(() =>
    useStudioAppearance('dark', { mode: 'fixed', scheme: 'light' })
  );
  act(() => result.current.setPreference('system'));
  expect(result.current.preference).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.cookie).toContain(`${STUDIO_THEME_COOKIE_NAME}=dark`);
});
it('denied cookie writes still allow changing this session without throwing', () => {
  vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  const { result } = renderHook(() => useStudioAppearance('light', DEFAULT_THEME_POLICY));
  act(() => result.current.setPreference('dark'));
  expect(result.current.preference).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});
