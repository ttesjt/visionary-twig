import { THEME_PREFERENCES, type ThemePreference } from '@frontend/ui/theme';
import { findThemePreference } from './preference';
import { readStoredPreference } from './stored-preference';

/** Runs immediately after the library script and before visible children. No module captures. */
function repairStoredPreference(
  key: string,
  supported: readonly string[],
  fallback: string,
  find: typeof findThemePreference,
  read: typeof readStoredPreference
): void {
  const saved = read(key);
  if (saved === undefined || saved === null || find(saved, supported) !== undefined) return;
  try {
    localStorage.setItem(key, fallback);
  } catch {
    // Repair this document even when storage is readable but cannot be written.
  }
  const scheme =
    fallback === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : fallback;
  document.documentElement.setAttribute('data-theme', scheme);
}

export function themeRepairScript(key: string, fallback: ThemePreference): string {
  // Prevent a customizable storage key from terminating its containing script element.
  const args = JSON.stringify([key, THEME_PREFERENCES, fallback]).replace(/</g, '\\u003c');
  return `(${repairStoredPreference.toString()})(...${args}, ${findThemePreference.toString()}, ${readStoredPreference.toString()})`;
}
