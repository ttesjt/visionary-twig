import type { ThemePolicy } from '@frontend/ui/theme';
import type { StudioPublishing } from '../../data/index.js';
import type { StudioFileAdapter } from '../files/file-adapter.js';
import type { StudioExportAdapter } from '../files/local-files.js';
import type { StudioPreviewAdapter } from '../preview/preview-contract.js';
import { StudioTextCatalogContext } from '../text/context.js';
import { DEFAULT_STUDIO_TEXT, type StudioTextCatalog } from '../text-catalog.js';
import { ProjectWorkbench } from './project-workbench.js';
export interface StudioExample {
  readonly label: string;
  readonly filename: string;
  readonly document: unknown;
}
export interface StudioWorkbenchProps {
  readonly text?: StudioTextCatalog;
  readonly themePolicy?: ThemePolicy;
  readonly fileAdapter?: StudioFileAdapter;
  readonly exportFile?: StudioExportAdapter;
  readonly previewAdapter?: StudioPreviewAdapter;
  readonly examples?: readonly StudioExample[];
  readonly publishing?: StudioPublishing;
}
export function StudioWorkbench({
  text: componentText = DEFAULT_STUDIO_TEXT,
  ...props
}: StudioWorkbenchProps) {
  return (
    <StudioTextCatalogContext value={componentText}>
      <ProjectWorkbench {...props} />
    </StudioTextCatalogContext>
  );
}
