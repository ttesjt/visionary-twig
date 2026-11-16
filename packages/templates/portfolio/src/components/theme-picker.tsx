'use client';

import { useText } from '../infra/resources/client';
import { useThemePreference } from '../infra/theme/client';
import { THEME_PREFERENCES, parseThemePreference } from '@frontend/ui/theme';

export function ThemePicker() {
  const text = useText();
  const { preference, isFixed, setPreference } = useThemePreference();
  if (isFixed) return null;
  return (
    <label className="example-theme-picker">
      <span>{text.getText('main', 'theme.label')}</span>
      <select
        value={preference ?? ''}
        disabled={preference === undefined}
        onChange={(event) => setPreference(parseThemePreference(event.target.value))}
      >
        <option value="" disabled hidden>
          {text.getText('main', 'theme.pending')}
        </option>
        {THEME_PREFERENCES.map((value) => (
          <option key={value} value={value}>
            {text.getText('main', `theme.${value}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
