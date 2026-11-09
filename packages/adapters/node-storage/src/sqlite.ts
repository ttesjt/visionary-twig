import type { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase } from '@frontend/storage';
/** The caller owns this connection; batches commit atomically. */
export function createSqliteDatabase(database: DatabaseSync): SqlDatabase {
  return {
    all(sql, values = []) {
      return Promise.resolve(database.prepare(sql).all(...values));
    },
    batch(commands) {
      return Promise.resolve().then(() => {
        database.exec('BEGIN IMMEDIATE');
        try {
          const results = commands.map(({ sql, values = [] }) => {
            const statement = database.prepare(sql);
            const rows = statement.all(...values);
            const changes = Number(
              database.prepare('SELECT changes() AS changes').get()?.changes ?? 0
            );
            return { rows, changes };
          });
          database.exec('COMMIT');
          return results;
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      });
    },
  };
}
