import type { ThemePolicy } from '@frontend/ui/theme';
import { PREVIEW_THEME_PREFERENCES, type PreviewThemePreference } from './viewer-theme.js';
export interface StudioViewerThemeControlProps {
  readonly policy: ThemePolicy;
  readonly preference: PreviewThemePreference;
  readonly onPreferenceChange: (preference: PreviewThemePreference) => void;
  readonly label: string;
  readonly labels: Readonly<Record<PreviewThemePreference, string>>;
}
export function StudioViewerThemeControl({
  policy,
  preference,
  onPreferenceChange,
  label,
  labels,
}: StudioViewerThemeControlProps) {
  if (policy.mode === 'fixed') return null;
  return (
    <label>
      {label}
      <select
        value={preference}
        onChange={(event) => {
          const value = PREVIEW_THEME_PREFERENCES.find((value) => value === event.target.value);
          if (value) onPreferenceChange(value);
        }}
      >
        {PREVIEW_THEME_PREFERENCES.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
