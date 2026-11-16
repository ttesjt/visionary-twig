import type { SqlCommand } from '@frontend/storage';

export const PROJECT_BADGES_MIGRATION: readonly SqlCommand[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_project_badges (
      project_id TEXT PRIMARY KEY REFERENCES portfolio_projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('text', 'image')),
      object_key TEXT,
      CHECK ((type = 'text' AND object_key IS NULL) OR (type = 'image' AND object_key IS NOT NULL))
    ) STRICT`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_project_badge_translations (
      project_id TEXT NOT NULL REFERENCES portfolio_project_badges(project_id) ON DELETE CASCADE,
      locale TEXT NOT NULL,
      label TEXT NOT NULL CHECK (length(trim(label)) > 0),
      PRIMARY KEY (project_id, locale)
    ) STRICT`,
  },
];
