import { themePolicyFromPreset, type ThemePolicy } from '@frontend/ui/theme';

/** Host-owned configuration; the shared package performs no environment I/O. */
export function getThemePolicy(): ThemePolicy {
  return themePolicyFromPreset(process.env.UI_THEME_POLICY);
}
