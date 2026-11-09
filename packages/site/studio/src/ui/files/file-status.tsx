import type { ReactNode } from 'react';
import { formatText } from '@frontend/text-catalog';
import { useStudioTextCatalog } from '../text/context.js';
import type { StudioFileActionsProps } from './file-actions.js';
import type { ProjectSession } from '../session/use-project-session.js';

export function StudioFileIdentity({ session }: { readonly session: ProjectSession }) {
  const componentText = useStudioTextCatalog();
  return (
    <p className="ui-studio-identity">
      {formatText(componentText.identity, {
        filename: session.state.filename,
        id: session.project.document.documentId,
        revision: session.project.document.revision,
      })}
    </p>
  );
}
export function StudioFileStatus({
  session,
  files,
  additionalStatus,
}: StudioFileActionsProps & { readonly additionalStatus?: ReactNode }) {
  const componentText = useStudioTextCatalog();
  const canPreview = session.flags.canSave && session.errors.length === 0;
  return (
    <div className="ui-studio-status" role="status">
      <p>
        {session.flags.needsSave ? componentText.localUnsaved : componentText.localSaved}
        {additionalStatus && <> · {additionalStatus}</>}
      </p>
      <p>{canPreview ? componentText.valid : componentText.invalid}</p>
      {files.status !== 'idle' && (
        <p>
          {files.status === 'saved'
            ? componentText.fileSaved
            : files.status === 'downloaded'
              ? componentText.fileDownloaded
              : componentText.fileFailed}
        </p>
      )}
      {!session.flags.canSave && <p>{componentText.pendingDrafts}</p>}
    </div>
  );
}
