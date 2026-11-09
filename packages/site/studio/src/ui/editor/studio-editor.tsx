import type { ReactNode } from 'react';
import { applyHistoryShortcut } from '@frontend/puck-adapter/fields';
import type { ThemePreference } from '@frontend/ui/theme';
import type { ProjectSession } from '../session/use-project-session.js';
import type { StudioPreviewAdapter } from '../preview/preview-contract.js';
import { useStudioTextCatalog } from '../text/context.js';
import { CatalogPanel } from '../catalog/catalog-panel.js';
import { ProjectJsonPanels } from './project-json-panels.js';
import { StudioPuckEditor } from './studio-puck-editor.js';
import { StudioProjectIssues } from '../issues/project-issues.js';
import { StudioIssues } from '../issues/studio-issues.js';
import { StudioPreview } from '../preview/studio-preview.js';
import { projectHistoryControls } from '../session/history-controls.js';
export interface StudioEditorProps {
  readonly session: ProjectSession;
  readonly previewAdapter?: StudioPreviewAdapter;
  readonly theme?: ThemePreference;
  readonly catalogActions?: ReactNode;
  /** Undefined keeps the built-in catalog. Null lets the host place StudioCatalogPanel elsewhere. */
  readonly catalogPanel?: ReactNode;
}
/** Edits a caller-owned session; no file, list, load, save or publication transport is created. */
export function StudioEditor({
  session,
  previewAdapter,
  theme = 'system',
  catalogActions,
  catalogPanel,
}: StudioEditorProps) {
  const componentText = useStudioTextCatalog();
  const { state, project, flags } = session;
  const canPreview = flags.canSave && session.errors.length === 0;
  const historyControls = projectHistoryControls(session, componentText);
  return (
    <div
      className="ui-studio-editor-session"
      onKeyDownCapture={(event) => applyHistoryShortcut(event, historyControls)}
    >
      {catalogPanel === undefined ? (
        <CatalogPanel
          key={'catalog:' + state.generation}
          session={session}
          actions={catalogActions}
        />
      ) : (
        catalogPanel
      )}
      <ProjectJsonPanels key={'json:' + state.generation} session={session} />
      <StudioIssues issues={state.issues} label={componentText.documentIssues} />
      <StudioProjectIssues issues={session.errors} />
      <StudioPuckEditor session={session} />
      <StudioPreview
        adapter={previewAdapter}
        document={{ ...project.document, locale: state.locale }}
        context={session.context}
        sessionKey={state.generation + ':' + state.editorEpoch}
        enabled={canPreview}
        theme={theme}
      />
    </div>
  );
}
