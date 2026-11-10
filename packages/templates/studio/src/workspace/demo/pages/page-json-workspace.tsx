'use client';
import { StudioLink } from '../../navigation/studio-link';
import { StudioSourceWorkspace } from '@frontend/studio/workspace';
import { StudioAppearanceSwitcher } from '@frontend/studio/shell';
import { StudioJsonEditor, StudioSessionHistory } from '@frontend/studio/json-editor';
import { DemoPageViewer } from './preview/page-viewer';
import { useStudioText } from '../../../text/use-studio-text';
import { demoEditorHref } from '../demo-routes';
import { useDemoPageSessionContext } from './page-session';
export function DemoJsonWorkspace() {
  const state = useDemoPageSessionContext();
  const componentText = useStudioText();
  const labels = componentText.workspace.demo.pages.editing;
  return (
    <StudioSourceWorkspace
      title={state.operations.title}
      back={
        <StudioLink
          className="ui-studio-button"
          href={demoEditorHref(state.base, 'viewer', state.search)}
        >
          {labels.back}
        </StudioLink>
      }
      actions={
        <>
          <StudioSessionHistory session={state.session} />
          <StudioAppearanceSwitcher text={componentText.workspace.chrome.theme} />
        </>
      }
      labels={labels}
      json={<StudioJsonEditor drafts={state.drafts} text={componentText.jsonEditor} />}
      preview={<DemoPageViewer />}
    />
  );
}
