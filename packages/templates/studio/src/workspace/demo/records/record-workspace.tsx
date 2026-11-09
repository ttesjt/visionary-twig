'use client';
import { StudioRecordWorkspace, useStudioRecordSession } from '@frontend/studio/records';
import { StudioDiscardDialog } from '@frontend/studio/navigation';
import { useStudioText } from '../../../text/use-studio-text';
import { useStudioRouteGuard } from '../../navigation/use-route-guard';
import { useDemoData } from '../data/demo-provider';
import { parseDemoRecord, demoRecordFingerprint, type DemoRecord } from '../demo-record';
import { RecordList } from './record-list';
import { RecordInspector } from './record-inspector';
import { RecordPreview } from './record-preview';
export function RecordWorkspace({
  record,
  records,
  onSelect,
}: {
  readonly record: DemoRecord;
  readonly records: readonly DemoRecord[];
  readonly onSelect: (id: string) => void;
}) {
  const { scope } = useDemoData();
  const session = useStudioRecordSession({
    initial: record,
    adapter: scope.records,
    validate: parseDemoRecord,
    identity: (value) => value.id,
    fingerprint: demoRecordFingerprint,
  });
  const guard = useStudioRouteGuard(session.dirty || session.busy);
  return (
    <>
      <StudioRecordWorkspace
        list={
          <RecordList
            records={records}
            selectedId={record.id}
            onSelect={(id) => {
              const next = records.find((row) => row.id === id);
              if (next && id !== record.id)
                guard.request(() => {
                  session.open(next);
                  onSelect(id);
                });
            }}
          />
        }
        inspector={<RecordInspector record={record} session={session} />}
        preview={<RecordPreview record={session.draft} />}
      />
      <StudioDiscardDialog
        guard={guard}
        text={useStudioText().workspace.demo.recordEditing.leave}
      />
    </>
  );
}
