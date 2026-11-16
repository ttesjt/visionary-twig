import type { SqlCommand } from '@frontend/storage';

export const PROJECT_PINS_MIGRATION: readonly SqlCommand[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_project_pins (
      project_id TEXT PRIMARY KEY REFERENCES portfolio_projects(id) ON DELETE CASCADE,
      pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1))
    ) STRICT`,
  },
  {
    sql: `INSERT OR IGNORE INTO portfolio_project_pins (project_id, pinned)
      SELECT id, 0 FROM portfolio_projects`,
  },
];
