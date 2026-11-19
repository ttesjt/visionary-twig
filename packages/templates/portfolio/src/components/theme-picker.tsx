'use client';

import { useText } from '../infra/resources/client';
import { useThemePreference } from '../infra/theme/client';
import { THEME_PREFERENCES } from '@frontend/ui/theme';
import { PreferenceSelect } from './preference-select';

export function ThemePicker() {
  const text = useText();
  const { preference, isFixed, setPreference } = useThemePreference();
  if (isFixed) return null;
  return (
    <PreferenceSelect
      compact
      label={text.getText('main', 'theme.label')}
      value={preference}
      options={THEME_PREFERENCES.map((value) => ({
        value,
        label: text.getText('main', `theme.${value}`),
      }))}
      onChange={setPreference}
      pendingLabel={text.getText('main', 'theme.pending')}
    />
  );
}
