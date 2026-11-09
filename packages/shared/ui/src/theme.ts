export const THEME_SWITCHER_DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
export type ThemeSwitcherDirection = (typeof THEME_SWITCHER_DIRECTIONS)[number];
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ColorScheme = Exclude<ThemePreference, 'system'>;
export const COLOR_SCHEMES: readonly ColorScheme[] = THEME_PREFERENCES.filter(
  (preference) => preference !== 'system'
);
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => value === preference);
}
export function parseThemePreference(value: string | undefined): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export type ThemePolicy =
  | { readonly mode: 'fixed'; readonly scheme: ColorScheme }
  | { readonly mode: 'selectable'; readonly defaultPreference: ThemePreference };
export const DEFAULT_THEME_POLICY: ThemePolicy = Object.freeze({
  mode: 'selectable',
  defaultPreference: DEFAULT_THEME_PREFERENCE,
});
export const THEME_POLICY_PRESETS = ['selectable', ...COLOR_SCHEMES] as const;

/** Strict host configuration. Undefined preserves the existing selectable/system default. */
export function themePolicyFromPreset(value: string | undefined): ThemePolicy {
  if (value === undefined || value === 'selectable') return DEFAULT_THEME_POLICY;
  const scheme = COLOR_SCHEMES.find((candidate) => candidate === value);
  if (scheme) return { mode: 'fixed', scheme };
  throw new RangeError(`Theme policy must be one of: ${THEME_POLICY_PRESETS.join(', ')}.`);
}

/** Fixed policies ignore preferences; selectable policies validate them before applying a default. */
export function resolveThemePreference(
  policy: ThemePolicy,
  requested: unknown = undefined
): ThemePreference {
  if (policy.mode === 'fixed') return policy.scheme;
  return isThemePreference(requested) ? requested : policy.defaultPreference;
}
