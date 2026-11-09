'use client';
import { StudioLink } from '../../navigation/studio-link';
import { StudioRecordInspector, type StudioRecordSession } from '@frontend/studio/records';
import { StudioIssues } from '@frontend/studio/issues';
import { demoItemPageHref } from '../demo-routes';
import { useStudioText } from '../../../text/use-studio-text';
import type { DemoRecord } from '../demo-record';
import { RecordValuesFields } from '../forms/record-values-fields';
export function RecordInspector({
  record,
  session,
}: {
  readonly record: DemoRecord;
  readonly session: StudioRecordSession<DemoRecord>;
}) {
  const componentText = useStudioText().workspace.demo;
  const status =
    session.state.status === 'saved' && session.dirty
      ? componentText.recordEditing.newerDraft
      : componentText.recordEditing.status[session.state.status];
  return (
    <StudioRecordInspector title={componentText.details}>
      <form
        className="ui-studio-flow"
        onSubmit={(event) => {
          event.preventDefault();
          void session.save();
        }}
      >
        <label className="ui-studio-field">
          {componentText.fields.id}
          <input value={record.id} readOnly />
        </label>
        {record.imageUrl && (
          <label className="ui-studio-field">
            {componentText.fields.imageUrl}
            <input value={record.imageUrl} readOnly />
          </label>
        )}
        <RecordValuesFields
          record={session.draft}
          onChange={(fields) => session.setDraft({ ...session.draft, ...fields })}
        />
        <div>
          <button className="ui-studio-button" type="submit" disabled={session.busy}>
            {session.busy ? componentText.recordEditing.status.saving : componentText.apply}
          </button>
        </div>
        <StudioLink className="ui-studio-button" href={demoItemPageHref(record)}>
          {record.pageId ? componentText.pages.edit : componentText.pages.createForItem}
        </StudioLink>
        {record.pageId && (
          <p>
            {componentText.pages.pageId}: {record.pageId}
          </p>
        )}
        <p
          className="ui-studio-muted"
          role={
            ['invalid', 'unavailable', 'conflict', 'not-found'].includes(session.state.status)
              ? 'alert'
              : 'status'
          }
        >
          {session.state.status === 'idle' ? componentText.editNotice : status}
        </p>
        {session.state.status === 'invalid' && (
          <StudioIssues issues={session.state.errors} label={componentText.invalidFields} />
        )}
      </form>
    </StudioRecordInspector>
  );
}
