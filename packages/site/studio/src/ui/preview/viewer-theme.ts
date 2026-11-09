import { useState } from 'react';
import {
  THEME_PREFERENCES,
  resolveThemePreference,
  type ThemePolicy,
  type ThemePreference,
} from '@frontend/ui/theme';
export const PREVIEW_THEME_PREFERENCES = ['inherit', ...THEME_PREFERENCES] as const;
export type PreviewThemePreference = (typeof PREVIEW_THEME_PREFERENCES)[number];
export const DEFAULT_PREVIEW_THEME: PreviewThemePreference = 'inherit';
/** Viewer preference never changes the containing tools or their persisted appearance. */
export function resolvePreviewTheme(
  policy: ThemePolicy,
  global: ThemePreference,
  preview: PreviewThemePreference
): ThemePreference {
  return resolveThemePreference(policy, preview === 'inherit' ? global : preview);
}
export function useStudioViewerTheme(policy: ThemePolicy, global: ThemePreference) {
  const [preference, setPreference] = useState<PreviewThemePreference>(DEFAULT_PREVIEW_THEME);
  return { preference, setPreference, theme: resolvePreviewTheme(policy, global, preference) };
}
