import type { SqlCommand, SqlDatabase } from '@frontend/storage';
import { PortfolioDataError } from '../data-error.js';
import { PROJECT_CATALOG_MIGRATION } from './migrations/001-project-catalog.js';
import { PROJECT_PAGES_MIGRATION } from './migrations/002-project-pages.js';
import { PROJECT_PINS_MIGRATION } from './migrations/003-project-pins.js';
import { PROJECT_BADGES_MIGRATION } from './migrations/004-project-badges.js';
import { PROJECT_COVER_SOURCES_MIGRATION } from './migrations/005-project-cover-sources.js';
import { PUBLICATION_MEDIA_MIGRATION } from './migrations/006-publication-media.js';

interface Migration {
  readonly version: number;
  readonly commands: readonly SqlCommand[];
}

const PORTFOLIO_MIGRATIONS: readonly Migration[] = [
  { version: 1, commands: PROJECT_CATALOG_MIGRATION },
  { version: 2, commands: PROJECT_PAGES_MIGRATION },
  { version: 3, commands: PROJECT_PINS_MIGRATION },
  { version: 4, commands: PROJECT_BADGES_MIGRATION },
  { version: 5, commands: PROJECT_COVER_SOURCES_MIGRATION },
  { version: 6, commands: PUBLICATION_MEDIA_MIGRATION },
];

/** Run explicitly before serving requests. Each version and its DDL commit together. */
export async function migratePortfolio(database: SqlDatabase): Promise<void> {
  await database.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS portfolio_migrations (
    version INTEGER PRIMARY KEY CHECK (version > 0)
  ) STRICT`,
    },
  ]);

  const applied = await database.all('SELECT version FROM portfolio_migrations ORDER BY version');
  if (applied.some((row, index) => row.version !== PORTFOLIO_MIGRATIONS[index]?.version)) {
    throw new PortfolioDataError(
      'invalid-migration-history',
      'Portfolio migration history is not a supported prefix.'
    );
  }

  for (const { version, commands } of PORTFOLIO_MIGRATIONS.slice(applied.length)) {
    await database.batch([
      ...commands,
      { sql: 'INSERT OR IGNORE INTO portfolio_migrations (version) VALUES (?)', values: [version] },
    ]);
  }
}
