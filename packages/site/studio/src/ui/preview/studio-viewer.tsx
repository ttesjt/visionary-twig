import type { ReactNode } from 'react';
import { resolveDocument, hasRenderableContent } from '@frontend/ui-document';
import type { ProjectSession } from '../session/use-project-session.js';
import { useStudioTextCatalog } from '../text/context.js';
import type { StudioTheme } from './preview-options.js';
import type { StudioPreviewAdapter } from './preview-contract.js';
import { StudioProjectIssues } from '../issues/project-issues.js';
import { StudioIssues } from '../issues/studio-issues.js';
import { StudioPreview } from './studio-preview.js';
export interface StudioViewerProps {
  readonly session: ProjectSession;
  readonly adapter: StudioPreviewAdapter;
  /** Controls only the isolated rendered content; it never sets the tool UI's data-theme. */
  readonly theme: StudioTheme;
  readonly toolbarActions?: ReactNode;
}
/** Renders only the validated working copy. Unapplied source text never becomes preview input. */
export function StudioViewer({ session, adapter, theme, toolbarActions }: StudioViewerProps) {
  const componentText = useStudioTextCatalog();
  const document = { ...session.project.document, locale: session.state.locale };
  const resolved = resolveDocument(document, session.registry, { context: session.context });
  const presence = resolved.ok
    ? hasRenderableContent(resolved.value.data, session.registry)
    : resolved;
  const empty = presence.ok && !presence.value;
  return (
    <div className="ui-studio-viewer">
      {!session.flags.canSave && <p role="status">{componentText.inputNotApplied}</p>}
      <StudioIssues issues={session.state.issues} label={componentText.documentIssues} />
      <StudioProjectIssues issues={session.errors} announce />
      <StudioPreview
        adapter={adapter}
        document={document}
        empty={empty}
        context={session.context}
        sessionKey={session.state.generation + ':' + session.state.editorEpoch}
        enabled={session.errors.length === 0}
        theme={theme}
        automatic
        toolbarActions={toolbarActions}
      />
    </div>
  );
}
