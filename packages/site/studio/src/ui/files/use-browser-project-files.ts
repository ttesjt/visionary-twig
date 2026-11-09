import { useEffect, useMemo, useState } from 'react';
import type { ProjectSession } from '../session/use-project-session.js';
import type { StudioFileAdapter } from './file-adapter.js';
import type { StudioExportAdapter } from './local-files.js';
import { createBrowserFileAdapter } from './browser-files.js';
import { useProjectFiles } from './use-project-files.js';
export function useBrowserProjectFiles(
  session: ProjectSession,
  options: {
    readonly adapter?: StudioFileAdapter;
    readonly exportFile?: StudioExportAdapter;
  } = {}
) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const adapter = useMemo(() => {
    if (options.adapter) return options.adapter;
    const browser = createBrowserFileAdapter(options.exportFile);
    return ready ? browser : { saveAs: browser.saveAs };
  }, [options.adapter, options.exportFile, ready]);
  return useProjectFiles(session, adapter);
}
