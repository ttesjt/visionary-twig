import 'server-only';
import { cookies } from 'next/headers';
import { resolveThemePreference, type ThemePolicy, type ThemePreference } from '@frontend/ui/theme';
import { STUDIO_THEME_COOKIE_NAME } from './theme-preference';
/** Read once per layout render; fixed policies ignore any persisted preference. */
export async function getStudioTheme(policy: ThemePolicy): Promise<ThemePreference> {
  if (policy.mode === 'fixed') return resolveThemePreference(policy);
  return resolveThemePreference(policy, (await cookies()).get(STUDIO_THEME_COOKIE_NAME)?.value);
}
