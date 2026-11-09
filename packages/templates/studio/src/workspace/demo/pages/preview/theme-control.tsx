'use client';
import type { ThemePolicy } from '@frontend/ui/theme';
import { StudioViewerThemeControl, type PreviewThemePreference } from '@frontend/studio/viewer';
import { useStudioText } from '../../../../text/use-studio-text';
export function PreviewThemeControl(props: {
  readonly policy: ThemePolicy;
  readonly preference: PreviewThemePreference;
  readonly onPreferenceChange: (preference: PreviewThemePreference) => void;
}) {
  const componentText = useStudioText();
  const labels = componentText.workspace.demo.pages.previewTheme;
  return (
    <StudioViewerThemeControl
      {...props}
      label={labels.label}
      labels={{
        inherit: labels.followStudio,
        light: componentText.workbench.themeLight,
        dark: componentText.workbench.themeDark,
        system: componentText.workbench.themeSystem,
      }}
    />
  );
}
