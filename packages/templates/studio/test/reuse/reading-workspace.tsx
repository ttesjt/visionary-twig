import { useState, useSyncExternalStore } from 'react';
import { createProject } from '@frontend/studio/data';
import {
  StudioRecordWorkspace,
  StudioRecordTable,
  StudioRecordInspector,
  StudioRecordPreview,
  useStudioRecordSession,
} from '@frontend/studio/records';
import { StudioDiscardDialog, useStudioNavigationGuard } from '@frontend/studio/navigation';
import { StudioResourceManager, StudioSourceWorkspace } from '@frontend/studio/workspace';
import {
  StudioJsonEditor,
  StudioSessionHistory,
  useStudioJsonDrafts,
} from '@frontend/studio/json-editor';
import { StudioViewer } from '@frontend/studio/viewer';
import { StudioTextCatalogProvider, useProjectSession } from '@frontend/studio/session';
import { DEFAULT_STUDIO_TEXT } from '@frontend/studio/text-catalog';
import type { StudioPreviewAdapter } from '@frontend/studio/viewer';
import {
  readingSeeds,
  validateReading,
  type Reading,
  type createReadingAdapter,
} from './reading-adapter';
/** A second code-owned resource consumes public APIs only; no Demo component, schema, routes or state. */
export function ReadingWorkspace({
  adapter,
  preview,
}: {
  readonly adapter: ReturnType<typeof createReadingAdapter>;
  readonly preview: StudioPreviewAdapter;
}) {
  const records = useSyncExternalStore(adapter.subscribe, adapter.getSnapshot, adapter.getSnapshot);
  const [selectedId, select] = useState(readingSeeds[0]?.slug);
  const selected = records.find((row) => row.slug === selectedId);
  return (
    selected && (
      <ReadingEditor
        key={selected.slug}
        record={selected}
        records={records}
        adapter={adapter}
        preview={preview}
        select={select}
      />
    )
  );
}
function ReadingEditor({
  record,
  records,
  adapter,
  preview,
  select,
}: {
  readonly record: Reading;
  readonly records: readonly Reading[];
  readonly adapter: ReturnType<typeof createReadingAdapter>;
  readonly preview: StudioPreviewAdapter;
  readonly select: (slug: string) => void;
}) {
  const session = useStudioRecordSession({
    initial: record,
    adapter,
    validate: validateReading,
    identity: (row) => row.slug,
    fingerprint: JSON.stringify,
  });
  const project = useProjectSession(createProject('reading-layout'));
  const drafts = useStudioJsonDrafts(project);
  const [source, showSource] = useState(false);
  const guard = useStudioNavigationGuard({ when: session.dirty || session.busy });
  return (
    <StudioTextCatalogProvider text={DEFAULT_STUDIO_TEXT}>
      <div hidden={source}>
        <StudioResourceManager
          title={session.draft.details.heading}
          label="Reading controls"
          back={
            <button type="button" onClick={() => select(record.slug)}>
              Readings
            </button>
          }
          name={<span>{record.slug}</span>}
          tabsLabel="Reading sections"
          actions={
            <>
              <button disabled={session.busy} onClick={() => void session.save()}>
                Save reading
              </button>
              <button onClick={() => showSource(true)}>Open source</button>
            </>
          }
          status={<output aria-label="Reading operation">{session.state.status}</output>}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <StudioRecordWorkspace
                  list={
                    <StudioRecordTable
                      title="Reading list"
                      tableLabel="Reading rows"
                      records={records}
                      identity={(row) => row.slug}
                      selectedId={record.slug}
                      onSelect={(id) => guard.request(() => select(id))}
                      primary={{
                        id: 'heading',
                        label: 'Headline',
                        render: (row) => row.details.heading,
                      }}
                      columns={[{ id: 'minutes', label: 'Minutes', render: (row) => row.minutes }]}
                    />
                  }
                  inspector={
                    <StudioRecordInspector title="Reading fields">
                      <label>
                        Reading headline
                        <input
                          value={session.draft.details.heading}
                          onChange={(event) =>
                            session.setDraft({
                              ...session.draft,
                              details: { heading: event.target.value },
                            })
                          }
                        />
                      </label>
                      <label>
                        Reading minutes
                        <input
                          type="number"
                          value={session.draft.minutes}
                          onChange={(event) =>
                            session.setDraft({
                              ...session.draft,
                              minutes: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </StudioRecordInspector>
                  }
                  preview={
                    <StudioRecordPreview title="Reading card">
                      <article>
                        <h3>{session.draft.details.heading}</h3>
                        <p>{session.draft.minutes} min</p>
                      </article>
                    </StudioRecordPreview>
                  }
                />
              ),
            },
          ]}
        />
      </div>
      <div hidden={!source}>
        <StudioSourceWorkspace
          title={session.draft.details.heading}
          back={<button onClick={() => showSource(false)}>Back to reading</button>}
          actions={<StudioSessionHistory session={project} />}
          labels={{ tabs: 'Reading engines', json: 'JSON', preview: 'Preview' }}
          json={<StudioJsonEditor drafts={drafts} />}
          preview={<StudioViewer session={project} adapter={preview} theme="light" />}
        />
      </div>
      <StudioDiscardDialog guard={guard} />
    </StudioTextCatalogProvider>
  );
}
