import type { StudioProject } from '../../data/index.js';
import {
  useProjectSession,
  type ProjectSession,
  type ProjectSessionOptions,
} from '../session/use-project-session.js';
import { useBrowserProjectFiles } from '../files/use-browser-project-files.js';
import { useStudioJsonDrafts } from '../json-editor/use-json-drafts.js';
import type { ProjectFiles } from '../files/use-project-files.js';
import type { StudioJsonDrafts } from '../json-editor/use-json-drafts.js';
export interface StudioPageWorkspace {
  readonly session: ProjectSession;
  readonly files: ProjectFiles;
  readonly drafts: StudioJsonDrafts;
}
/** Own above mode-specific routes so source buffers, file handles and history share one lifetime.
 * This browser composition never selects a remote data source or publication transport. */
export function useStudioPageWorkspace(
  initial?: StudioProject,
  options: ProjectSessionOptions = {},
  filesOptions: Parameters<typeof useBrowserProjectFiles>[1] = {}
): StudioPageWorkspace {
  const session = useProjectSession(initial, options);
  const files = useBrowserProjectFiles(session, filesOptions);
  const drafts = useStudioJsonDrafts(session);
  return { session, files, drafts };
}
