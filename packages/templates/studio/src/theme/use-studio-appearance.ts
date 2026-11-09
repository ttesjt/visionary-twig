import { useEffect, useState } from 'react';
import { resolveThemePreference, type ThemePolicy, type ThemePreference } from '@frontend/ui/theme';
import type { StudioAppearance } from '@frontend/studio/shell';
import { STUDIO_THEME_COOKIE_NAME, STUDIO_THEME_COOKIE_MAX_AGE_SECONDS } from './theme-preference';
/** Server-seeded UI preference. Preview overrides never call this persistence boundary. */
export function useStudioAppearance(
  initial: ThemePreference,
  policy: ThemePolicy
): StudioAppearance {
  const [requested, setRequested] = useState(initial);
  const preference = resolveThemePreference(policy, requested);
  useEffect(() => {
    document.documentElement.dataset.theme = preference;
  }, [preference]);
  return {
    preference,
    setPreference(requested) {
      if (policy.mode === 'fixed') return;
      const next = resolveThemePreference(policy, requested);
      setRequested(next);
      try {
        document.cookie = `${STUDIO_THEME_COOKIE_NAME}=${next}; Path=/; Max-Age=${STUDIO_THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
      } catch {
        // Denied browser storage must not prevent changing the current session's appearance.
      }
    },
  };
}
