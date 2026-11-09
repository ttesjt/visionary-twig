import { StudioViewer } from '@frontend/studio/viewer';
import { useStudioRouteLocale } from '../../../navigation/studio-link';
import { useMemo } from 'react';
import { useTrackingPermission } from '../../../../site/tracking-permission';
import { createLocalPreviewAdapter } from '../../../../preview/preview-adapter';
import { useDemoPageSessionContext } from '../page-session';
import { PreviewThemeControl } from './theme-control';
/** Host-owned preview choices never set appearance on the surrounding resource tools. */
export function DemoPageViewer() {
  const state = useDemoPageSessionContext();
  const locale = useStudioRouteLocale();
  const permitted = useTrackingPermission();
  const adapter = useMemo(() => createLocalPreviewAdapter(permitted, locale), [permitted, locale]);
  return (
    <StudioViewer
      session={state.session}
      adapter={adapter}
      theme={state.previewTheme}
      toolbarActions={
        <PreviewThemeControl
          policy={state.themePolicy}
          preference={state.previewPreference}
          onPreferenceChange={state.setPreviewPreference}
        />
      }
    />
  );
}
