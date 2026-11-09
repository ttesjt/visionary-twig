import type { ReactNode } from 'react';
import { DemoProvider } from '../../../workspace/demo/data/demo-provider';
import { WorkspaceHost } from '../../../workspace/workspace-host';
import { getThemePolicy } from '../../../site/theme-policy';
import { getStudioTheme } from '../../../theme/server-theme';
import '@frontend/studio/shell.css';
import '@/styles/demo-upload.css';
import '@frontend/styles/studio-shell.css';
export default async function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  const policy = getThemePolicy();
  return (
    <DemoProvider>
      <WorkspaceHost themePolicy={policy} initialTheme={await getStudioTheme(policy)}>
        {children}
      </WorkspaceHost>
    </DemoProvider>
  );
}
