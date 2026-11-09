'use client';
import { StudioLink } from '../../navigation/studio-link';
import { DemoPageViewer } from './preview/page-viewer';
import { useStudioText } from '../../../text/use-studio-text';
import { demoEditorHref } from '../demo-routes';
import { useDemoPageSessionContext } from './page-session';
/** Resource management and a read-only viewer. Editing engines live on nested routes. */
export function DemoPageEditor() {
  const state = useDemoPageSessionContext();
  const componentText = useStudioText().workspace.demo.pages.editing;
  return (
    <div className="ui-studio-flow">
      <div className="ui-studio-actions ui-studio-viewer-actions">
        <StudioLink
          className="ui-studio-button"
          href={demoEditorHref(state.base, 'json', state.search)}
        >
          {componentText.editJson}
        </StudioLink>
        <StudioLink href={demoEditorHref(state.base, 'puck', state.search)}>
          {componentText.experimental}
        </StudioLink>
      </div>
      <DemoPageViewer />
    </div>
  );
}
