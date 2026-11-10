'use client';
import { StudioLink } from '../../navigation/studio-link';
import { StudioFocusToolbar } from '@frontend/studio/workspace';
import { StudioAppearanceSwitcher } from '@frontend/studio/shell';
import { StudioPuckEditor } from '@frontend/studio/editor';
import { useStudioText } from '../../../text/use-studio-text';
import { demoEditorHref } from '../demo-routes';
import { useDemoPageSessionContext } from './page-session';
export function DemoPuckWorkspace() {
  const state = useDemoPageSessionContext();
  const catalog = useStudioText();
  const componentText = catalog.workspace.demo.pages.editing;
  return (
    <div className="ui-studio-focus-workspace">
      <StudioFocusToolbar
        title={componentText.experimental}
        back={
          <StudioLink
            className="ui-studio-button"
            href={demoEditorHref(state.base, 'viewer', state.search)}
          >
            {componentText.back}
          </StudioLink>
        }
        actions={
          <>
            <label className="ui-studio-field ui-studio-inline-field">
              {catalog.workbench.language}
              <select
                aria-label={catalog.workbench.language}
                value={state.session.state.locale}
                onChange={(event) =>
                  state.session.dispatch({ type: 'locale', locale: event.target.value })
                }
              >
                {Object.keys(state.session.project.catalogs).map((locale) => (
                  <option key={locale} value={locale}>
                    {locale}
                  </option>
                ))}
              </select>
            </label>
            <StudioLink href={demoEditorHref(state.base, 'json', state.search)}>
              {componentText.editJson}
            </StudioLink>
            <StudioAppearanceSwitcher text={catalog.workspace.chrome.theme} />
          </>
        }
      />
      <p className="ui-studio-notice" role="note">
        {componentText.limitation}
      </p>
      {state.drafts.pending && <p role="status">{componentText.pending}</p>}
      <div className="ui-studio-puck-engine">
        <StudioPuckEditor session={state.session} />
      </div>
    </div>
  );
}
