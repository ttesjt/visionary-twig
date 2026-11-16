import type { SqlCommand } from '@frontend/storage';

export const PROJECT_CATALOG_MIGRATION: readonly SqlCommand[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_projects (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    default_locale TEXT NOT NULL,
    is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    cover_key TEXT
  ) STRICT`,
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS portfolio_project_order
    ON portfolio_projects (is_published, sort_order, id)`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_project_translations (
    project_id TEXT NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    summary TEXT NOT NULL CHECK (length(trim(summary)) > 0),
    cover_alt TEXT,
    links_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(links_json) AND json_type(links_json) = 'array'),
    PRIMARY KEY (project_id, locale)
  ) STRICT`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_categories (
    id TEXT PRIMARY KEY,
    default_locale TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  ) STRICT`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_category_translations (
    category_id TEXT NOT NULL REFERENCES portfolio_categories(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    label TEXT NOT NULL CHECK (length(trim(label)) > 0),
    PRIMARY KEY (category_id, locale)
  ) STRICT`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS portfolio_project_categories (
    project_id TEXT NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES portfolio_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, category_id)
  ) STRICT`,
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS portfolio_projects_by_category
    ON portfolio_project_categories (category_id, project_id)`,
  },
];
