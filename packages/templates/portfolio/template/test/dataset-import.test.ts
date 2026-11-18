import { projectPageRegistry } from '@frontend/portfolio/render';
// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import type { SqlDatabase } from '@frontend/storage';
import {
  migratePortfolio,
  listProjects,
  listProjectCategories,
  readPublishedProjectPage,
} from '@frontend/portfolio/server';
import {
  readProjectDatasets,
  importProjectDatasets,
} from '../../src/features/projects/import.node.ts';

it('imports the same eight localized file projects into SQLite, preserves authored values and maps page media', async () => {
  const datasets = readProjectDatasets(resolve(import.meta.dirname, '../..'));
  const sqlite = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
  const database: SqlDatabase = {
    all: (sql, values = []) => Promise.resolve(sqlite.prepare(sql).all(...values)),
    batch: (commands) =>
      Promise.resolve().then(() => {
        sqlite.exec('BEGIN IMMEDIATE');
        try {
          const results = commands.map(({ sql, values = [] }) => ({
            rows: sqlite.prepare(sql).all(...values),
            changes: 0,
          }));
          sqlite.exec('COMMIT');
          return results;
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      }),
  };
  try {
    await migratePortfolio(database);
    await importProjectDatasets(database, datasets);
    for (const dataset of datasets) {
      expect(dataset.projects).toHaveLength(8);
      const first = await listProjects(database, { locale: dataset.locale, offset: 0, limit: 6 });
      const next = await listProjects(database, { locale: dataset.locale, offset: 6, limit: 6 });
      expect(first.projects).toEqual(dataset.projects.slice(0, 6));
      expect(first.hasMore).toBe(true);
      expect(next.projects).toEqual(dataset.projects.slice(6));
      expect(next.hasMore).toBe(false);
      expect(await listProjectCategories(database, dataset.locale)).toEqual(dataset.categories);
      const page = await readPublishedProjectPage(
        database,
        projectPageRegistry,
        'field-notes',
        dataset.locale
      );
      expect(page?.document).toMatchObject({ bindings: dataset.pages[0]?.document.bindings });
      expect(JSON.stringify(page?.document)).toContain(
        '/api/projects/media/field-notes?key=samples%2Fportfolio%2Flake.jpg'
      );
      expect(JSON.stringify(dataset.pages[0]?.document)).toContain('/samples/portfolio/lake.jpg');
    }
    sqlite.exec(
      "UPDATE portfolio_project_translations SET title = 'Owner title' WHERE project_id = 'field-notes' AND locale = 'en'"
    );
    await importProjectDatasets(database, datasets);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM portfolio_projects').get()).toMatchObject({
      count: 8,
    });
    expect(
      (await listProjects(database, { locale: 'en', offset: 0, limit: 6 })).projects[0]?.title
    ).toBe('Owner title');
  } finally {
    sqlite.close();
  }
});
