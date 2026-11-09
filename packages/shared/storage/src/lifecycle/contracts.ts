import type { SqlDatabase } from '../sql/contracts.js';
import type { ObjectStorage } from '../objects/contracts.js';
export interface StorageConnection {
  readonly database: SqlDatabase;
  readonly objects: ObjectStorage;
  /** A host may provide a read transaction; direct reads imply no multi-query snapshot. */
  readonly read: <T>(operation: (database: SqlDatabase) => Promise<T>) => Promise<T>;
  close(): Promise<void>;
}
