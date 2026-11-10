import { Button } from '@frontend/ui';
import { useEffect, useState } from 'react';
import { parseDocument } from '@frontend/ui-document';
import { parseProject, encodeProject } from '../../data/index.js';
import type { ProjectSession } from '../session/use-project-session.js';
import { useStudioTextCatalog } from '../text/context.js';
function JsonPanel({
  id,
  label,
  current,
  applyLabel,
  session,
  apply,
}: {
  readonly id: string;
  readonly label: string;
  readonly current: string;
  readonly applyLabel: string;
  readonly session: ProjectSession;
  readonly apply: (text: string) => boolean;
}) {
  const [source, setSource] = useState(current);
  const [draft, setDraft] = useState(current);
  if (source !== current && draft === source) {
    setSource(current);
    setDraft(current);
  }
  const pending = draft !== source;
  useEffect(() => {
    session.dispatch({ type: 'draft', id, pending });
    return () => session.dispatch({ type: 'draft', id, pending: false });
  }, [id, pending, session.dispatch]);
  return (
    <section className="ui-studio-json-panel">
      <label>
        {label}
        <textarea
          aria-label={label}
          rows={10}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <Button
        type="button"
        disabled={!pending}
        onClick={() => {
          if (apply(draft)) {
            setSource(draft);
          }
        }}
      >
        {applyLabel}
      </Button>
    </section>
  );
}
export function ProjectJsonPanels({ session }: { readonly session: ProjectSession }) {
  const componentText = useStudioTextCatalog();
  return (
    <details className="ui-studio-json">
      <summary>{componentText.completeProject}</summary>
      <JsonPanel
        id="document-json"
        label={componentText.rawDocument}
        current={JSON.stringify(session.project.document, null, 2)}
        applyLabel={componentText.applyDocument}
        session={session}
        apply={(text) => {
          const result = parseDocument(text, session.registry);
          if (!result.ok) {
            session.setIssues(result.errors);
            return false;
          }
          return session.run(
            parseProject({ ...session.project, document: result.value }, session.registry)
          );
        }}
      />
      <JsonPanel
        id="context-json"
        label={componentText.contextJson}
        current={JSON.stringify(session.project.context, null, 2)}
        applyLabel={componentText.applyContext}
        session={session}
        apply={(text) => {
          try {
            const context: unknown = JSON.parse(text);
            return session.run(parseProject({ ...session.project, context }, session.registry));
          } catch {
            session.setIssues([
              { code: 'invalid-json', path: ['context'], message: 'Enter valid JSON.' },
            ]);
            return false;
          }
        }}
      />
      <JsonPanel
        id="project-json"
        label={componentText.projectJson}
        current={encodeProject(session.project)}
        applyLabel={componentText.applyProject}
        session={session}
        apply={(text) => session.run(parseProject(text, session.registry))}
      />
    </details>
  );
}
