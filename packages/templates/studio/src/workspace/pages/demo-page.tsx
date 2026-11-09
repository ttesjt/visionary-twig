'use client';
import { useStudioText } from '../../text/use-studio-text';
import { RecordWorkspace } from '../demo/records/record-workspace';
import { useDemoData, useDemoRecords } from '../demo/data/demo-provider';
export function DemoPage() {
  const componentText = useStudioText().workspace.demo;
  const records = useDemoRecords();
  const { selectedId, select } = useDemoData();
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  return (
    <div className="ui-studio-flow">
      {selected && <RecordWorkspace record={selected} records={records} onSelect={select} />}
      <section
        className="ui-studio-surface ui-studio-flow"
        aria-label={componentText.extensionTitle}
      >
        <div className="ui-studio-section-heading">
          <h2>{componentText.extensionTitle}</h2>
        </div>
        <p>{componentText.extensionBody}</p>
        <p className="ui-studio-muted">{componentText.editorBody}</p>
      </section>
    </div>
  );
}
