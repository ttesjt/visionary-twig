import { useStudioTextCatalog } from '../text/context.js';
import { useState } from 'react';
import type { StudioWorkbenchProps } from './studio-workbench.js';
import { useProjectSession } from '../session/use-project-session.js';
import { StudioReplacementDialog } from '../session/replacement-dialog.js';
import { useBrowserProjectFiles } from '../files/use-browser-project-files.js';
import { StudioFileControls } from '../files/file-controls.js';
import { CatalogFileInput } from '../files/catalog-file-input.js';
import { ProjectPublishingControls } from '../persistence/project-publishing.js';
import { StudioEditor } from '../editor/studio-editor.js';
import { DEFAULT_THEME_POLICY, resolveThemePreference } from '@frontend/ui/theme';
/** Compatibility composition. New resource pages can compose session/editor and their own operations. */
export function ProjectWorkbench({
  fileAdapter,
  exportFile,
  publishing,
  previewAdapter,
  examples = [],
  themePolicy = DEFAULT_THEME_POLICY,
}: StudioWorkbenchProps) {
  const componentText = useStudioTextCatalog();
  const session = useProjectSession();
  const files = useBrowserProjectFiles(session, {
    ...(fileAdapter ? { adapter: fileAdapter } : {}),
    ...(exportFile ? { exportFile } : {}),
  });
  const [requestedTheme, setRequestedTheme] = useState(() => resolveThemePreference(themePolicy));
  const theme = resolveThemePreference(themePolicy, requestedTheme);
  return (
    <main className="ui-studio-workbench" data-theme={theme}>
      <StudioFileControls
        session={session}
        additionalStatus={
          publishing
            ? session.flags.unpublished
              ? componentText.publicationDirty
              : componentText.publicationCurrent
            : null
        }
        files={files}
        themePolicy={themePolicy}
        theme={theme}
        onThemeChange={setRequestedTheme}
        examples={examples}
      />
      {publishing && (
        <ProjectPublishingControls
          key={'publishing:' + session.state.generation}
          session={session}
          publishing={publishing}
        />
      )}
      <StudioEditor
        session={session}
        {...(previewAdapter ? { previewAdapter } : {})}
        theme={theme}
        catalogActions={<CatalogFileInput session={session} />}
      />
      <StudioReplacementDialog session={session} />
    </main>
  );
}
