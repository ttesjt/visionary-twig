import { Button } from '@frontend/ui';
import type { ProjectSession } from '../session/use-project-session.js';
import { useStudioTextCatalog } from '../text/context.js';
import type { StudioExample } from '../workbench/studio-workbench.js';
import type { ProjectFiles } from './use-project-files.js';

export interface StudioFileActionsProps {
  readonly session: ProjectSession;
  readonly files: ProjectFiles;
}
/** Local saves only. Hosts choose where these actions sit alongside publication controls. */
export function StudioSaveActions({ session, files }: StudioFileActionsProps) {
  const componentText = useStudioTextCatalog();
  return (
    <>
      <Button disabled={files.busy || !session.flags.canSave} onClick={() => void files.save()}>
        {componentText.save}
      </Button>
      <Button disabled={files.busy || !session.flags.canSave} onClick={() => void files.save(true)}>
        {componentText.saveAs}
      </Button>
    </>
  );
}
/** Import/new actions replace working content through the existing session confirmation flow. */
export function StudioOpenActions({
  session,
  files,
  examples = [],
}: StudioFileActionsProps & { readonly examples?: readonly StudioExample[] }) {
  const componentText = useStudioTextCatalog();
  return (
    <>
      {examples.map((example) => (
        <Button
          key={example.filename}
          onClick={() => session.open(example.document, { filename: example.filename })}
        >
          {example.label}
        </Button>
      ))}
      <Button onClick={session.newProject}>{componentText.newDocument}</Button>
      {files.canOpen ? (
        <Button onClick={() => void files.open()}>{componentText.openFile}</Button>
      ) : (
        <label className="ui-studio-file">
          {componentText.openFile}
          <input
            type="file"
            aria-label={componentText.openFile}
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void files.importFile(file);
            }}
          />
        </label>
      )}
    </>
  );
}
