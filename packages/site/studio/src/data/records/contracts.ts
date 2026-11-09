import type { ContentIssue } from '@frontend/ui-document';
/** Provider-neutral acknowledgement. A saved result means this snapshot was durably accepted by that adapter. */
export type StudioRecordUpdateResult<Row> =
  | { readonly status: 'saved'; readonly record: Row }
  | { readonly status: 'invalid'; readonly errors: readonly ContentIssue[] }
  | { readonly status: 'conflict' | 'not-found' | 'cancelled' | 'unavailable' };
export interface StudioRecordUpdater<Row> {
  update(
    this: void,
    record: Row,
    signal: AbortSignal,
    baseline: Row
  ): Promise<StudioRecordUpdateResult<Row>>;
}
/** A synchronous snapshot is a client cache, not a requirement that remote reads be synchronous. */
export interface StudioRecordSource<Row> {
  getSnapshot(this: void): readonly Row[];
  subscribe(this: void, listener: () => void): () => void;
}
