import { describe, expect, it } from 'vitest';
import {
  COLOR_SCHEMES,
  DEFAULT_THEME_POLICY,
  THEME_PREFERENCES,
  parseThemePreference,
  resolveThemePreference,
  themePolicyFromPreset,
} from './theme.js';

describe('host theme policies', () => {
  it('preserves selectable/system defaults and legacy preference parsing', () => {
    expect(themePolicyFromPreset(undefined)).toBe(DEFAULT_THEME_POLICY);
    expect(themePolicyFromPreset('selectable')).toBe(DEFAULT_THEME_POLICY);
    expect(resolveThemePreference(DEFAULT_THEME_POLICY)).toBe('system');
    expect(parseThemePreference('invalid')).toBe('system');
    for (const preference of THEME_PREFERENCES)
      expect(resolveThemePreference(DEFAULT_THEME_POLICY, preference)).toBe(preference);
  });
  for (const scheme of COLOR_SCHEMES) {
    it(`fixes ${scheme} regardless of stored, URL or unknown preference`, () => {
      const policy = themePolicyFromPreset(scheme);
      expect(policy).toEqual({ mode: 'fixed', scheme });
      for (const requested of [...THEME_PREFERENCES, undefined, null, 'invalid', ['dark']])
        expect(resolveThemePreference(policy, requested)).toBe(scheme);
    });
  }
  it('uses the host default only for missing/invalid selectable preferences', () => {
    const policy = { mode: 'selectable', defaultPreference: 'light' } as const;
    for (const value of [undefined, null, '', 'invalid', ['dark']])
      expect(resolveThemePreference(policy, value)).toBe('light');
    expect(resolveThemePreference(policy, 'system')).toBe('system');
    expect(resolveThemePreference(policy, 'dark')).toBe('dark');
  });
  it('rejects invalid configuration instead of silently enabling theme selection', () => {
    for (const value of ['', 'system', 'Dark', 'fixed', 'invalid'])
      expect(() => themePolicyFromPreset(value)).toThrow(RangeError);
  });
});
