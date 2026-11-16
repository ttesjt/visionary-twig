'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import {
  COLOR_SCHEMES,
  DEFAULT_THEME_POLICY,
  THEME_PREFERENCES,
  resolveThemePreference,
  type ThemePolicy,
  type ThemePreference,
} from '@frontend/ui/theme';
import { THEME_STORAGE_KEY } from '../../site/theme';
import { findThemePreference } from './preference';
import { themeRepairScript } from './bootstrap';
import { ThemePreferenceNormalization } from './normalization';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Browser preferences stay outside resource preparation and do not make routes dynamic. */
export function ThemeProvider({
  children,
  policy = DEFAULT_THEME_POLICY,
  nonce,
}: {
  readonly children: ReactNode;
  readonly policy?: ThemePolicy;
  readonly nonce?: string;
}) {
  const fallback = resolveThemePreference(policy);
  return (
    <NextThemeProvider
      attribute="data-theme"
      storageKey={THEME_STORAGE_KEY}
      themes={[...COLOR_SCHEMES]}
      defaultTheme={fallback}
      forcedTheme={policy.mode === 'fixed' ? policy.scheme : undefined}
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      {...(nonce === undefined ? {} : { nonce })}
    >
      {policy.mode === 'selectable' && (
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeRepairScript(THEME_STORAGE_KEY, fallback) }}
        />
      )}
      <ThemePreferenceNormalization fallback={fallback}>{children}</ThemePreferenceNormalization>
    </NextThemeProvider>
  );
}

/** Preference-dependent UI uses the same neutral value in SSR and first hydration. */
export function useThemePreference(): {
  readonly preference: ThemePreference | undefined;
  readonly isFixed: boolean;
  readonly setPreference: (preference: ThemePreference) => void;
} {
  const theme = useTheme();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (theme.themes.length === 0) throw new Error('ThemeProvider must wrap useThemePreference.');
  const isFixed = theme.forcedTheme !== undefined;
  return {
    preference: hydrated
      ? findThemePreference(theme.forcedTheme ?? theme.theme, THEME_PREFERENCES)
      : undefined,
    isFixed,
    setPreference(preference) {
      if (!isFixed) theme.setTheme(preference);
    },
  };
}
