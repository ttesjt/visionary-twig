'use client';
import { StudioLink } from '../../../navigation/studio-link';
import type { ProjectSession } from '@frontend/studio/session';
import { StudioResourceManager } from '@frontend/studio/workspace';
import { StudioCatalogPanel } from '@frontend/studio/catalog';
import { StudioPublishAction } from '@frontend/studio/publishing';
import {
  StudioSaveActions,
  StudioOpenActions,
  StudioFileIdentity,
  StudioFileStatus,
  CatalogFileInput,
  type ProjectFiles,
} from '@frontend/studio/files';
import { useStudioText } from '../../../../text/use-studio-text';
import { sampleDocument } from '../../../../samples/sample-document';
import { DEMO_ROUTES } from '../../demo-routes';
import { DEMO_TITLE_MAX_LENGTH } from '../../demo-record';
import { useDemoRecords } from '../../data/demo-provider';
import type { usePageOperation } from '../use-page-operation';
import { PageBinding } from './page-binding';
interface PageManagerProps {
  readonly pageId: string;
  readonly session: ProjectSession;
  readonly files: ProjectFiles;
  readonly operations: ReturnType<typeof usePageOperation>;
}
/** Only Demo resource operations and panel content are host-owned; shared workspace owns the chrome. */
export function PageManager({ pageId, session, files, operations }: PageManagerProps) {
  const componentText = useStudioText();
  const labels = componentText.workspace.demo.pages;
  const records = useDemoRecords();
  const chosen = records.find((record) => record.id === operations.itemId);
  return (
    <StudioResourceManager
      label={labels.controls.title}
      title={operations.title || labels.untitled}
      back={
        <StudioLink className="ui-studio-button" href={DEMO_ROUTES.pages}>
          {labels.back}
        </StudioLink>
      }
      name={
        <label className="ui-studio-field ui-studio-resource-name">
          <span className="ui-studio-sr-only">{labels.name}</span>
          <input
            value={operations.title}
            title={operations.title}
            maxLength={DEMO_TITLE_MAX_LENGTH}
            onChange={(event) => operations.setTitle(event.target.value)}
          />
        </label>
      }
      actions={
        <>
          <StudioSaveActions session={session} files={files} />
          <StudioPublishAction
            busy={operations.busy}
            disabled={!session.flags.canSave || !operations.title.trim()}
            onPublish={() => void operations.execute('publish')}
            summary={
              <p>
                {operations.title} · {chosen?.title ?? labels.independent}
              </p>
            }
          />
        </>
      }
      status={
        <>
          <StudioFileStatus session={session} files={files} />
          {(operations.busy || operations.status !== 'idle') && (
            <p role="status">
              {operations.busy
                ? componentText.workbench.publishBusy
                : labels.status[operations.status]}
            </p>
          )}
        </>
      }
      tabsLabel={labels.controls.tabs}
      tabs={[
        {
          id: 'overview',
          label: labels.controls.overview,
          content: (
            <section className="ui-studio-resource-overview" aria-label={labels.identity}>
              <p className="ui-studio-identity">
                {labels.pageId}: {pageId} · {labels.revision}: {operations.resource.revision}
              </p>
              <p>
                {chosen
                  ? chosen.title +
                    ' · ' +
                    (operations.resource.itemId ? labels.binding.bound : labels.binding.pending)
                  : labels.independent}
              </p>
              <p className="ui-studio-muted">{labels.publicationHelp}</p>
            </section>
          ),
        },
        {
          id: 'association',
          label: labels.controls.association,
          content: (
            <PageBinding
              records={records}
              boundItemId={operations.resource.itemId}
              itemId={operations.itemId}
              onSelect={operations.setItemId}
              onUnlink={() => void operations.execute('unlink')}
              busy={operations.busy}
            />
          ),
        },
        {
          id: 'files',
          label: labels.controls.files,
          content: (
            <section
              className="ui-studio-resource-files ui-studio-flow"
              aria-label={labels.controls.files}
            >
              <div className="ui-studio-actions">
                <StudioOpenActions
                  session={session}
                  files={files}
                  examples={[
                    {
                      label: componentText.host.example,
                      filename: 'sample-content.json',
                      document: sampleDocument,
                    },
                  ]}
                />
              </div>
              <StudioFileIdentity session={session} />
              <p className="ui-studio-muted">{labels.fileHelp}</p>
              <p className="ui-studio-muted">{labels.importHelp}</p>
            </section>
          ),
        },
        {
          id: 'catalogs',
          label: labels.controls.catalogs,
          content: (
            <StudioCatalogPanel
              key={'catalog:' + session.state.generation}
              session={session}
              actions={<CatalogFileInput session={session} />}
            />
          ),
        },
      ]}
    />
  );
}
