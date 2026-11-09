'use client';
import { StudioRecordTable } from '@frontend/studio/records';
import type { DemoRecord } from '../demo-record';
import { useStudioText } from '../../../text/use-studio-text';
export function RecordList({
  records,
  selectedId,
  onSelect,
}: {
  readonly records: readonly DemoRecord[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
}) {
  const componentText = useStudioText().workspace.demo;
  return (
    <StudioRecordTable
      records={records}
      identity={(record) => record.id}
      selectedId={selectedId}
      onSelect={onSelect}
      title={componentText.list}
      tableLabel={componentText.table}
      source={<span>{componentText.source}</span>}
      primary={{
        id: 'title',
        label: componentText.fields.title,
        render: (record) => record.title || componentText.emptyTitle,
      }}
      columns={[
        { id: 'id', label: componentText.fields.id, render: (record) => <code>{record.id}</code> },
        {
          id: 'status',
          label: componentText.fields.status,
          render: (record) => componentText.statuses[record.status],
        },
        {
          id: 'image',
          label: componentText.fields.imageUrl,
          render: (record) =>
            record.imageUrl ? (
              <a href={record.imageUrl} target="_blank" rel="noreferrer">
                {componentText.openImage}
              </a>
            ) : (
              componentText.noImage
            ),
        },
      ]}
    />
  );
}
