import { expect, it } from 'vitest';
import { DEFAULT_THEME_POLICY, THEME_PREFERENCES } from '@frontend/ui/theme';
import {
  DEFAULT_PREVIEW_THEME,
  PREVIEW_THEME_PREFERENCES,
  resolvePreviewTheme,
} from './viewer-theme.js';
it('follows each shell preference by default while allowing an explicit OS preference', () => {
  for (const global of THEME_PREFERENCES) {
    expect(resolvePreviewTheme(DEFAULT_THEME_POLICY, global, DEFAULT_PREVIEW_THEME)).toBe(global);
    for (const preview of THEME_PREFERENCES)
      expect(resolvePreviewTheme(DEFAULT_THEME_POLICY, global, preview)).toBe(preview);
  }
});
it('fixed policy governs inherited and explicitly requested preview themes', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const global of THEME_PREFERENCES)
      for (const preview of PREVIEW_THEME_PREFERENCES)
        expect(resolvePreviewTheme({ mode: 'fixed', scheme }, global, preview)).toBe(scheme);
});
