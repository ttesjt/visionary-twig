import type { SqlCommand } from '@frontend/storage';

export const PROJECT_COVER_SOURCES_MIGRATION: readonly SqlCommand[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_project_cover_sources (
      project_id TEXT NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
      cover_key TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('thumbnail', 'display', 'original')),
      object_key TEXT NOT NULL,
      width INTEGER NOT NULL CHECK (width > 0),
      height INTEGER NOT NULL CHECK (height > 0),
      CHECK (role != 'display' OR cover_key = object_key),
      PRIMARY KEY (project_id, cover_key, role)
    ) STRICT`,
  },
];
