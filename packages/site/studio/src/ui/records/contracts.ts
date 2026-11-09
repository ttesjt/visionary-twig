import type { ContentIssue, ContentResult } from '@frontend/ui-document';
import type { StudioRecordUpdater } from '../../data/records.js';
export type StudioRecordSaveState =
  | { readonly status: 'idle' | 'saving' | 'saved' | 'conflict' | 'not-found' | 'unavailable' }
  | { readonly status: 'invalid'; readonly errors: readonly ContentIssue[] };
export interface StudioRecordSessionOptions<Row> {
  /** Rows must be structured-cloneable values. Initial values are read once; use open after guarding a resource switch. */
  readonly initial: Row;
  readonly adapter: StudioRecordUpdater<Row>;
  readonly validate: (input: unknown) => ContentResult<Row>;
  readonly identity: (record: Row) => string;
  /** Fingerprint only editable fields; host-managed associations are not record edits. */
  readonly fingerprint: (record: Row) => string;
}
export interface StudioRecordSession<Row> {
  readonly draft: Row;
  readonly baseline: Row;
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly state: StudioRecordSaveState;
  setDraft(this: void, draft: Row): void;
  save(this: void): Promise<void>;
  reset(this: void): void;
  open(this: void, record: Row): void;
}
