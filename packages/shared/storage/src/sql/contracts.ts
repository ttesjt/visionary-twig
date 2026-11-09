export type SqlValue = string | number | null;
export interface SqlCommand {
  readonly sql: string;
  readonly values?: readonly SqlValue[];
}
export interface SqlResult {
  readonly rows: readonly Record<string, unknown>[];
  readonly changes: number;
}
/** batch must be atomic: one failed statement rolls the whole batch back. */
export interface SqlDatabase {
  all(sql: string, values?: readonly SqlValue[]): Promise<readonly Record<string, unknown>[]>;
  batch(commands: readonly SqlCommand[]): Promise<readonly SqlResult[]>;
}
