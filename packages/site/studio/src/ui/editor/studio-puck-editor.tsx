import { ContentEditor } from '@frontend/puck-adapter/editor';
import type { ProjectSession } from '../session/use-project-session.js';
import { useStudioTextCatalog } from '../text/context.js';
import { projectHistoryControls } from '../session/history-controls.js';
import { BindingField } from './binding-field.js';
/** Experimental interactive canvas. Hosts should expose its limitations and provide a source editor. */
export function StudioPuckEditor({ session }: { readonly session: ProjectSession }) {
  const componentText = useStudioTextCatalog();
  const { state, project } = session;
  const historyControls = projectHistoryControls(session, componentText);
  return (
    <section className="ui-studio-editor" aria-label={componentText.editor} lang={state.locale}>
      <ContentEditor
        document={project.document}
        registry={session.registry}
        selectionScope={state.generation}
        fieldScope={state.locale}
        sessionKey={state.generation + ':' + state.editorEpoch}
        context={session.context}
        onSnapshotChange={session.onSnapshot}
        headerActions={() => null}
        historyControls={historyControls}
        fieldEditor={(props) => <BindingField {...props} session={session} />}
      />
    </section>
  );
}
