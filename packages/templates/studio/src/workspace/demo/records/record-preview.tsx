'use client';
import Image from 'next/image';
import { StudioRecordPreview } from '@frontend/studio/records';
import type { DemoRecord } from '../demo-record';
import { useStudioText } from '../../../text/use-studio-text';
export function RecordPreview({ record }: { readonly record: DemoRecord }) {
  const componentText = useStudioText().workspace.demo;
  return (
    <StudioRecordPreview
      title={componentText.preview}
      notice={<span>{componentText.previewNotice}</span>}
    >
      <article className="ui-studio-record-card" data-has-image={Boolean(record.imageUrl)}>
        {record.imageUrl && (
          <Image
            className="ui-studio-record-image"
            src={record.imageUrl}
            alt=""
            width={720}
            height={480}
            unoptimized
          />
        )}
        <div className="ui-studio-record-content">
          <span className="ui-studio-eyebrow">{componentText.statuses[record.status]}</span>
          <h3>{record.title || componentText.emptyTitle}</h3>
          <p>{record.summary || componentText.emptySummary}</p>
        </div>
      </article>
    </StudioRecordPreview>
  );
}
