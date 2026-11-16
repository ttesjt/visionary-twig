'use client';

import { useEffect, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { THEME_PREFERENCES, type ThemePreference } from '@frontend/ui/theme';
import { findThemePreference } from './preference';
import { readStoredPreference } from './stored-preference';
import { THEME_STORAGE_KEY } from '../../site/theme';

/** Repair the owning library state, including invalid values arriving through storage events. */
export function ThemePreferenceNormalization({
  fallback,
  children,
}: {
  readonly fallback: ThemePreference;
  readonly children: ReactNode;
}) {
  const { theme, forcedTheme, setTheme } = useTheme();
  useEffect(() => {
    if (forcedTheme !== undefined || theme === undefined) return;
    if (findThemePreference(theme, THEME_PREFERENCES) !== undefined) return;
    // A newer valid choice may have arrived before this effect runs. Preserve it.
    setTheme(
      findThemePreference(readStoredPreference(THEME_STORAGE_KEY), THEME_PREFERENCES) ?? fallback
    );
  }, [theme, forcedTheme, setTheme, fallback]);
  return children;
}
