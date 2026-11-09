'use client';
export { useStudioRecordSession } from './records/use-record-session.js';
export type {
  StudioRecordSession,
  StudioRecordSessionOptions,
  StudioRecordSaveState,
} from './records/contracts.js';
export {
  StudioRecordWorkspace,
  StudioRecordInspector,
  StudioRecordPreview,
} from './records/record-layout.js';
export { StudioRecordTable, type StudioRecordColumn } from './records/record-table.js';
