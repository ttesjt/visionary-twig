import type { SqlCommand } from '@frontend/storage';

export const PROJECT_PAGES_MIGRATION: readonly SqlCommand[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_project_pages (
    project_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision > 0),
    document_json TEXT NOT NULL CHECK (json_valid(document_json) AND json_type(document_json) = 'object'),
    context_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(context_json) AND json_type(context_json) = 'object'),
    PRIMARY KEY (project_id, locale),
    FOREIGN KEY (project_id, locale) REFERENCES portfolio_project_translations(project_id, locale) ON DELETE CASCADE
  ) STRICT`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_project_page_media (
    project_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    object_key TEXT NOT NULL,
    PRIMARY KEY (project_id, locale, object_key),
    FOREIGN KEY (project_id, locale) REFERENCES portfolio_project_pages(project_id, locale) ON DELETE CASCADE
  ) STRICT`,
  },
];
