import { resolveThemePreference, type ThemePolicy, type ThemePreference } from '@frontend/ui/theme';
import { STUDIO_THEMES, STUDIO_THEME_LABEL_KEYS } from '../preview/preview-options.js';
import { useStudioTextCatalog } from '../text/context.js';
export interface StudioThemeControlProps {
  readonly themePolicy: ThemePolicy;
  readonly theme: ThemePreference;
  readonly onThemeChange: (theme: ThemePreference) => void;
}
export function StudioThemeControl({ themePolicy, theme, onThemeChange }: StudioThemeControlProps) {
  const componentText = useStudioTextCatalog();
  if (themePolicy.mode !== 'selectable') return null;
  return (
    <label className="ui-studio-field">
      {componentText.theme}
      <select
        aria-label={componentText.themeLabel}
        value={theme}
        onChange={(event) => onThemeChange(resolveThemePreference(themePolicy, event.target.value))}
      >
        {STUDIO_THEMES.map((value) => (
          <option key={value} value={value}>
            {componentText[STUDIO_THEME_LABEL_KEYS[value]]}
          </option>
        ))}
      </select>
    </label>
  );
}
