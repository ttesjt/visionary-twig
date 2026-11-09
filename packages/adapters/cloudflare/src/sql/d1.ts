import type { D1Database } from '@cloudflare/workers-types';
import type { SqlDatabase } from '@frontend/storage';
/** Bindings are injected by the host; account credentials never enter this adapter. */
export function createD1Database(database: D1Database): SqlDatabase {
  return {
    async all(sql, values = []) {
      const result = await database
        .prepare(sql)
        .bind(...values)
        .all<Record<string, unknown>>();
      if (!result.success) throw new Error('D1 read failed.');
      return result.results;
    },
    async batch(commands) {
      if (!commands.length) return [];
      const results = await database.batch<Record<string, unknown>>(
        commands.map(({ sql, values = [] }) => database.prepare(sql).bind(...values))
      );
      return results.map((result) => {
        if (!result.success) throw new Error('D1 batch failed.');
        return { rows: result.results, changes: result.meta.changes };
      });
    },
  };
}
