import type { StudioRecordSource, StudioRecordUpdater } from '@frontend/studio/data/records';
import type { DemoRecord } from '../demo-record';
export interface UploadedDemoImage {
  readonly url: string;
}
export interface DemoImageAdapter {
  upload(this: void, file: File, signal: AbortSignal): Promise<UploadedDemoImage>;
  /** Release adapter-owned local resources, not a general remote object deletion contract. */
  release(this: void, image: UploadedDemoImage): void;
}
export interface DemoRecordAdapter {
  /** The caller's stable record ID is also the idempotency identity for retries. */
  create(this: void, record: DemoRecord, signal: AbortSignal): Promise<DemoRecord>;
}

export interface DemoRecordStore
  extends DemoRecordAdapter, StudioRecordSource<DemoRecord>, StudioRecordUpdater<DemoRecord> {}
