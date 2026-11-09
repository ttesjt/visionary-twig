import { createStudioRegistry, StudioIcon } from '@frontend/studio/shell';
import type { AppTextCatalog } from '../text/schema';
import { STUDIO_PAGES } from './page-ids';
import { OverviewPage } from './pages/overview-page';
export function createWorkspaceRegistry(text: AppTextCatalog) {
  const componentText = text.workspace;
  return createStudioRegistry({
    groups: [{ id: 'workspace', label: componentText.groupWorkspace }],
    pages: [
      {
        id: STUDIO_PAGES.overview,
        ...componentText.pages.overview,
        group: 'workspace',
        icon: <StudioIcon name="grid" />,
        component: OverviewPage,
      },
      {
        id: STUDIO_PAGES.pages,
        ...componentText.pages.pages,
        group: 'workspace',
        icon: <StudioIcon name="page" />,
        rendering: 'route',
      },
      {
        id: STUDIO_PAGES.demo,
        ...componentText.pages.demo,
        group: 'workspace',
        icon: <StudioIcon name="grid" />,
        rendering: 'route',
      },
    ],
  });
}
