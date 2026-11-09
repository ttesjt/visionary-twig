'use client';
import { useId } from 'react';
import {
  DEMO_RECORD_STATUSES,
  DEMO_TITLE_MAX_LENGTH,
  DEMO_SUMMARY_MAX_LENGTH,
  demoRecordSchema,
  type DemoRecord,
} from '../demo-record';
import { useStudioText } from '../../../text/use-studio-text';
export function RecordValuesFields({
  record,
  onChange,
}: {
  readonly record: Pick<DemoRecord, 'title' | 'summary' | 'status'>;
  readonly onChange: (record: Pick<DemoRecord, 'title' | 'summary' | 'status'>) => void;
}) {
  const componentText = useStudioText().workspace.demo;
  const fieldId = useId();
  return (
    <div className="ui-studio-flow">
      <div className="ui-studio-field">
        <label htmlFor={fieldId + '-title'}>{componentText.fields.title}</label>
        <input
          id={fieldId + '-title'}
          required
          maxLength={DEMO_TITLE_MAX_LENGTH}
          value={record.title}
          onChange={(event) => onChange({ ...record, title: event.target.value })}
        />
      </div>
      <div className="ui-studio-field">
        <label htmlFor={fieldId + '-summary'}>{componentText.fields.summary}</label>
        <textarea
          id={fieldId + '-summary'}
          className="ui-studio-field-summary"
          maxLength={DEMO_SUMMARY_MAX_LENGTH}
          value={record.summary}
          onChange={(event) => onChange({ ...record, summary: event.target.value })}
        />
      </div>
      <div className="ui-studio-field">
        <label htmlFor={fieldId + '-status'}>{componentText.fields.status}</label>
        <select
          id={fieldId + '-status'}
          value={record.status}
          onChange={(event) => {
            const result = demoRecordSchema.shape.status.safeParse(event.target.value);
            if (result.success) onChange({ ...record, status: result.data });
          }}
        >
          {DEMO_RECORD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {componentText.statuses[status]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
