import { ThemeSwitcher, type ThemeSwitcherLabels } from '@frontend/ui/theme-switcher';
import type { ReactElement } from 'react';
import { useStudioTheme } from './theme-context.js';

/** Uses the shell appearance owner even when rendered in a focused editor. */
export function StudioAppearanceSwitcher({
  text,
}: {
  readonly text: ThemeSwitcherLabels;
}): ReactElement {
  const { preference, setPreference, policy } = useStudioTheme();
  return (
    <ThemeSwitcher
      className="ui-studio-appearance-switcher"
      preference={preference}
      onPreferenceChange={setPreference}
      policy={policy}
      labels={text}
    />
  );
}
