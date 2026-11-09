import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { StorageConnection } from '@frontend/storage';
import { createD1Database } from './sql/d1.js';
import { createR2Storage } from './objects/r2.js';
export interface CloudflareBindings {
  readonly DB: D1Database;
  readonly MEDIA: R2Bucket;
}
/** Worker entry: bindings are supplied by the host; no Node bridge or connection discovery. */
export function createCloudflareStorage(bindings: CloudflareBindings): StorageConnection {
  const database = createD1Database(bindings.DB);
  return {
    database,
    objects: createR2Storage(bindings.MEDIA),
    read: (operation) => operation(database),
    close: () => Promise.resolve(),
  };
}
