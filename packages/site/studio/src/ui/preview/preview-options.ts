import { parseThemePreference } from '@frontend/ui/theme';
import type { StudioTextCatalog } from '../text-catalog.js';
import type { ThemePreference } from '@frontend/ui/theme';

// Keep the Studio API compatible while foundation owns the controlled values and defaults.
export {
  THEME_PREFERENCES as STUDIO_THEMES,
  DEFAULT_THEME_PREFERENCE as DEFAULT_STUDIO_THEME,
} from '@frontend/ui/theme';
export type { ThemePreference as StudioTheme } from '@frontend/ui/theme';

export const STUDIO_THEME_LABEL_KEYS = {
  light: 'themeLight',
  dark: 'themeDark',
  system: 'themeSystem',
} as const satisfies Record<ThemePreference, keyof StudioTextCatalog>;

export const PREVIEW_VIEWPORTS = [
  { labelKey: 'viewportPhone', width: 390 },
  { labelKey: 'viewportTablet', width: 768 },
  { labelKey: 'viewportDesktop', width: 1280 },
] as const;
export const DEFAULT_PREVIEW_VIEWPORT = PREVIEW_VIEWPORTS[2];
export const PREVIEW_FRAME_HEIGHT = 760;
export function studioTheme(input: unknown): ThemePreference {
  return parseThemePreference(typeof input === 'string' ? input : undefined);
}
