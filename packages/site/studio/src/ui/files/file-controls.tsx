import type { ReactNode } from 'react';
import type { ProjectSession } from '../session/use-project-session.js';
import type { ProjectFiles } from './use-project-files.js';
import { useStudioTextCatalog } from '../text/context.js';
import type { StudioExample } from '../workbench/studio-workbench.js';
import { StudioOpenActions, StudioSaveActions } from './file-actions.js';
import { StudioFileIdentity, StudioFileStatus } from './file-status.js';
import { StudioThemeControl, type StudioThemeControlProps } from './theme-control.js';
export interface StudioFileControlsProps extends StudioThemeControlProps {
  readonly session: ProjectSession;
  readonly files: ProjectFiles;
  readonly examples?: readonly StudioExample[];
  readonly additionalStatus?: ReactNode;
  readonly heading?: ReactNode;
}
/** Compatibility composition; resource hosts can place the same parts in compact toolbars/tabs. */
export function StudioFileControls({
  session,
  files,
  examples = [],
  themePolicy,
  theme,
  onThemeChange,
  additionalStatus,
  heading,
}: StudioFileControlsProps) {
  const componentText = useStudioTextCatalog();
  return (
    <header className="ui-studio-header">
      {heading ?? (
        <div>
          <h1>{componentText.title}</h1>
          <p>{componentText.subtitle}</p>
        </div>
      )}
      <div className="ui-studio-actions">
        <StudioThemeControl themePolicy={themePolicy} theme={theme} onThemeChange={onThemeChange} />
        <StudioOpenActions session={session} files={files} examples={examples} />
        <StudioSaveActions session={session} files={files} />
      </div>
      <StudioFileIdentity session={session} />
      <StudioFileStatus session={session} files={files} additionalStatus={additionalStatus} />
    </header>
  );
}
