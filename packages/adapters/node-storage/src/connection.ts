import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { StorageConnection, SqlDatabase } from '@frontend/storage';
import { createSqliteDatabase } from './sqlite.js';
import { createFileObjectStorage } from './files.js';
const SQLITE_TIMEOUT_MS = 5_000;
export type DatabaseCheck = (database: DatabaseSync) => void;
export interface NodeStorageOptions {
  readonly filename: string;
  readonly mediaDirectory: string;
}
export function createSqliteReadScope(
  filename: string,
  check?: DatabaseCheck
): StorageConnection['read'] {
  return async <T>(operation: (database: SqlDatabase) => Promise<T>) => {
    const database = new DatabaseSync(filename, {
      readOnly: true,
      enableForeignKeyConstraints: true,
      timeout: SQLITE_TIMEOUT_MS,
    });
    try {
      database.exec('BEGIN');
      check?.(database);
      const result = await operation(createSqliteDatabase(database));
      database.exec('COMMIT');
      return result;
    } finally {
      database.close();
    }
  };
}
export function openNodeStorage(
  options: NodeStorageOptions,
  check?: DatabaseCheck
): StorageConnection {
  if (!isAbsolute(options.filename) || !isAbsolute(options.mediaDirectory))
    throw new Error('Storage paths must be absolute.');
  if (!existsSync(options.filename))
    throw new Error('Run the explicit data migration before opening a local database.');
  const connection = new DatabaseSync(options.filename, {
    enableForeignKeyConstraints: true,
    timeout: SQLITE_TIMEOUT_MS,
  });
  try {
    check?.(connection);
    return {
      database: createSqliteDatabase(connection),
      objects: createFileObjectStorage(options.mediaDirectory),
      read: createSqliteReadScope(options.filename, check),
      close() {
        connection.close();
        return Promise.resolve();
      },
    };
  } catch (error) {
    connection.close();
    throw error;
  }
}
