'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { StudioTextCatalogProvider, StudioReplacementDialog } from '@frontend/studio/session';
import { useStudioPageWorkspace } from '@frontend/studio/workspace';
import { useStudioViewerTheme } from '@frontend/studio/viewer';
import { useStudioTheme } from '@frontend/studio/shell';
import dynamic from 'next/dynamic';
import { useStudioPathname } from '../../navigation/use-studio-pathname';
import { demoEditingRoute, isDemoFocusedPath } from '../demo-routes';
import { PageManager } from './management/page-manager';
import { useStudioText } from '../../../text/use-studio-text';
import { useDemoData } from '../data/demo-provider';
import { DEMO_PAGE_TARGET, type DemoPage } from './contracts';
import { usePageOperation } from './use-page-operation';
import { usePageNavigation } from './use-page-navigation';
const ExperimentalPuck = dynamic(
  () => import('./page-puck-workspace').then((module) => module.DemoPuckWorkspace),
  { ssr: false }
);
interface PageSessionProps {
  readonly initial: DemoPage;
  readonly base: string;
  readonly search: string;
}
function useDemoPageSession({ initial, base, search }: PageSessionProps) {
  const appearance = useStudioTheme();
  const { scope } = useDemoData();
  const { session, files, drafts } = useStudioPageWorkspace(
    {
      ...initial.project,
      publishing: {
        target: {
          targetId: DEMO_PAGE_TARGET,
          key: initial.id,
          version: { revision: initial.revision },
        },
      },
    },
    { associations: 'host', published: initial.revision > 0 }
  );
  const operations = usePageOperation(
    session,
    scope.pages,
    { ...initial, itemId: initial.revision > 0 ? initial.itemId : null },
    initial.itemId
  );
  const viewer = useStudioViewerTheme(appearance.policy, appearance.preference);
  return {
    pageId: initial.id,
    session,
    files,
    drafts,
    operations,
    themePolicy: appearance.policy,
    previewTheme: viewer.theme,
    previewPreference: viewer.preference,
    setPreviewPreference: viewer.setPreference,
    base,
    search,
  };
}
const PageSessionContext = createContext<ReturnType<typeof useDemoPageSession> | null>(null);
/** This provider is mounted by the editing layout, never by a mode-specific Next page. */
export function DemoPageSession({
  children,
  ...props
}: PageSessionProps & { readonly children: ReactNode }) {
  const path = useStudioPathname();
  const focused = isDemoFocusedPath(path);
  const usingPuck = demoEditingRoute(path)?.mode === 'puck';
  const [puckVisited, setPuckVisited] = useState(usingPuck);
  if (usingPuck && !puckVisited) setPuckVisited(true);
  const value = useDemoPageSession(props);
  const { session, operations, drafts } = value;
  const changed =
    drafts.pending ||
    !session.flags.canSave ||
    (session.flags.unpublished && session.flags.hasChanges) ||
    operations.title !== operations.resource.title ||
    operations.itemId !== operations.resource.itemId;
  const navigation = usePageNavigation(changed, props.base, props.search);
  return (
    <PageSessionContext value={value}>
      <StudioTextCatalogProvider text={useStudioText().workbench}>
        <div className="ui-studio-workbench ui-studio-page-session">
          <div hidden={focused}>
            <PageManager
              pageId={value.pageId}
              session={session}
              files={value.files}
              operations={operations}
            />
          </div>
          {children}
          <div className="ui-studio-puck-host" hidden={!usingPuck}>
            {puckVisited && <ExperimentalPuck />}
          </div>
          <StudioReplacementDialog session={session} />
          {navigation}
        </div>
      </StudioTextCatalogProvider>
    </PageSessionContext>
  );
}
export function useDemoPageSessionContext() {
  const value = useContext(PageSessionContext);
  if (!value) throw new Error('Demo page modes require the persistent page session layout.');
  return value;
}
