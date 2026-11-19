'use client';

import { useAppearance } from './state';
import { useText } from '../../infra/resources/client';
import { APPEARANCE_PRESETS, APPEARANCE_POLICY } from './policy';
import { PreferenceSelect } from '../../components/preference-select';

export function AppearanceDemoPicker() {
  const text = useText();
  const { appearance, setAppearance } = useAppearance(APPEARANCE_POLICY);
  return (
    <PreferenceSelect
      label={text.getText('main', 'appearance.label')}
      value={appearance}
      options={APPEARANCE_PRESETS.map((value) => ({
        value,
        label: text.getText('main', `appearance.${value}`),
      }))}
      onChange={setAppearance}
      pendingLabel={text.getText('main', 'theme.pending')}
    />
  );
}
