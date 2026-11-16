// @vitest-environment node

import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase } from '@frontend/storage';
import { CONTENT_SCHEMA_VERSION } from '@frontend/ui-document';
import type { ContentRegistry } from '@frontend/ui-document';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findProjectBySlug,
  listProjectCategories,
  listProjects,
  migratePortfolio,
  PortfolioDataError,
  readProjectDetail,
  readProjectMedia,
  readPublishedProjectPage,
  setProjectPinned,
} from '@frontend/portfolio/server';

const registry: ContentRegistry = { nodes: {} };
const publishedDocument = {
  documentId: 'document',
  schemaVersion: CONTENT_SCHEMA_VERSION,
  revision: 1,
  locale: 'en',
  data: { root: {}, content: [] },
  variables: { section: 'Example' },
};

let sqlite: DatabaseSync;
let database: SqlDatabase;

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
  database = {
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
});

afterEach(() => sqlite.close());

async function seedCatalog(): Promise<void> {
  await migratePortfolio(database);
  sqlite.exec(`
    INSERT INTO portfolio_projects (id, slug, default_locale, is_published, sort_order, cover_key)
    VALUES ('alpha', 'alpha', 'en', 1, 0, 'alpha/cover.webp'),
           ('beta', 'beta', 'en', 1, 0, NULL),
           ('draft', 'draft', 'en', 0, -1, 'draft/cover.webp');
    INSERT INTO portfolio_project_translations (project_id, locale, title, summary, cover_alt, links_json)
    VALUES ('alpha', 'en', 'Alpha', 'First project', 'Cover', '[{"label":"Source","href":"https://example.test/alpha"}]'),
           ('alpha', 'zh', '甲', '第一个项目', '封面', '[]'),
           ('beta', 'en', 'Beta', 'Second project', NULL, '[]'),
           ('draft', 'en', 'Draft', 'Unpublished project', 'Cover', '[]');
    INSERT INTO portfolio_categories (id, default_locale) VALUES ('work', 'en'), ('hidden', 'en');
    INSERT INTO portfolio_category_translations VALUES ('work', 'en', 'Work'), ('work', 'zh', '作品'), ('hidden', 'en', 'Hidden');
    INSERT INTO portfolio_project_categories VALUES ('alpha', 'work'), ('draft', 'work'), ('draft', 'hidden');
  `);
}

function seedPage(): void {
  sqlite
    .prepare(
      `
    INSERT INTO portfolio_project_pages VALUES ('alpha', 'en', 3, ?, '{"external":{"title":"From context"}}')
  `
    )
    .run(JSON.stringify(publishedDocument));
  sqlite.exec("INSERT INTO portfolio_project_page_media VALUES ('alpha', 'en', 'alpha/page.webp')");
}

describe('portfolio migrations', () => {
  it('applies migrations idempotently and enforces the page translation relationship', async () => {
    await Promise.all([migratePortfolio(database), migratePortfolio(database)]);
    await migratePortfolio(database);
    expect(await database.all('SELECT version FROM portfolio_migrations ORDER BY version')).toEqual(
      [
        { version: 1 },
        { version: 2 },
        { version: 3 },
        { version: 4 },
        { version: 5 },
        { version: 6 },
      ]
    );
    expect(() =>
      sqlite
        .prepare("INSERT INTO portfolio_project_pages VALUES ('missing', 'en', 1, ?, '{}')")
        .run(JSON.stringify(publishedDocument))
    ).toThrow(/FOREIGN KEY/u);
  });

  it('can resume from the first version and rejects an unknown migration', async () => {
    await migratePortfolio(database);
    sqlite.exec(`
      DROP TABLE portfolio_project_page_media;
      DROP TABLE portfolio_project_pages;
      DROP TABLE portfolio_project_cover_sources;
      DROP TABLE portfolio_project_badge_translations;
      DROP TABLE portfolio_project_badges;
      DROP TABLE portfolio_project_pins;
      DELETE FROM portfolio_migrations WHERE version >= 2;
    `);
    await migratePortfolio(database);
    expect(await database.all('SELECT locale FROM portfolio_project_pages')).toEqual([]);
    sqlite.exec('INSERT INTO portfolio_migrations VALUES (99)');
    await expect(migratePortfolio(database)).rejects.toMatchObject({
      code: 'invalid-migration-history',
    });
  });
});

describe('portfolio catalog', () => {
  it('filters, paginates, falls back by locale and excludes drafts', async () => {
    await seedCatalog();
    const first = await listProjects(database, { locale: 'zh', limit: 1 });
    expect(first).toEqual({
      projects: [
        {
          id: 'alpha',
          slug: 'alpha',
          locale: 'zh',
          defaultLocale: 'en',
          title: '甲',
          summary: '第一个项目',
          pinned: false,
          cover: { objectKey: 'alpha/cover.webp', alt: '封面' },
          categoryIds: ['work'],
          links: [],
        },
      ],
      hasMore: true,
    });
    const next = await listProjects(database, { locale: 'zh', limit: 1, offset: 1 });
    expect(next.projects[0]).toMatchObject({ id: 'beta', locale: 'en', cover: null });
    expect(next.hasMore).toBe(false);
    const byCategory = await listProjects(database, { locale: 'en', categoryId: 'work' });
    expect(byCategory.projects).toEqual([
      expect.objectContaining({
        id: 'alpha',
        links: [{ label: 'Source', href: 'https://example.test/alpha' }],
      }),
    ]);
    await expect(findProjectBySlug(database, 'draft', 'en')).resolves.toBeNull();
  });

  it('migrates legacy projects as unpinned and applies pin priority before filtering pages', async () => {
    await seedCatalog();
    sqlite.exec(`
      DROP TABLE portfolio_project_pins;
      DELETE FROM portfolio_migrations WHERE version >= 3;
      DROP TABLE portfolio_project_cover_sources;
      DROP TABLE portfolio_project_badge_translations;
      DROP TABLE portfolio_project_badges;
      INSERT INTO portfolio_project_categories VALUES ('beta', 'work');
    `);
    await migratePortfolio(database);
    expect(await findProjectBySlug(database, 'alpha', 'en')).toMatchObject({ pinned: false });
    await setProjectPinned(database, 'beta', true);
    await setProjectPinned(database, 'draft', true);
    const query = { locale: 'en', categoryId: 'work', limit: 1 };
    expect(await listProjects(database, query)).toMatchObject({
      projects: [{ id: 'beta', pinned: true }],
      hasMore: true,
    });
    expect(await listProjects(database, { ...query, offset: 1 })).toMatchObject({
      projects: [{ id: 'alpha', pinned: false }],
      hasMore: false,
    });
    await setProjectPinned(database, 'beta', false);
    expect(await listProjects(database, query)).toMatchObject({ projects: [{ id: 'alpha' }] });
    await expect(setProjectPinned(database, 'missing', true)).rejects.toMatchObject({
      code: 'project-not-found',
    });
  });

  it('localizes optional text and image badges and authorizes the image by project', async () => {
    await seedCatalog();
    sqlite.exec(`
      INSERT INTO portfolio_project_badges VALUES
        ('alpha', 'text', NULL), ('beta', 'image', 'beta/badge.webp'),
        ('draft', 'image', 'draft/badge.webp');
      INSERT INTO portfolio_project_badge_translations VALUES
        ('alpha', 'en', 'Prototype'), ('alpha', 'zh', '原型'),
        ('beta', 'en', 'Palette icon'), ('draft', 'en', 'Hidden icon');
    `);
    const projects = await listProjects(database, { locale: 'zh' });
    expect(projects.projects).toMatchObject([
      { badge: { type: 'text', label: '原型', locale: 'zh' } },
      { badge: { type: 'image', objectKey: 'beta/badge.webp', alt: 'Palette icon', locale: 'en' } },
    ]);
    sqlite.exec(
      "DELETE FROM portfolio_project_badge_translations WHERE project_id = 'alpha' AND locale = 'zh'"
    );
    expect(await findProjectBySlug(database, 'alpha', 'zh')).toMatchObject({
      locale: 'zh',
      badge: { type: 'text', label: 'Prototype', locale: 'en' },
    });
    const image = { bytes: new Uint8Array([1]), contentType: 'image/webp' };
    const objects = { get: vi.fn().mockResolvedValue(image) };
    await expect(readProjectMedia(database, objects, 'beta', 'beta/badge.webp')).resolves.toBe(
      image
    );
    await expect(
      readProjectMedia(database, objects, 'alpha', 'beta/badge.webp')
    ).resolves.toBeNull();
    await expect(
      readProjectMedia(database, objects, 'draft', 'draft/badge.webp')
    ).resolves.toBeNull();
    expect(objects.get).toHaveBeenCalledTimes(1);
  });

  it('omits badges without a label in the requested or default language', async () => {
    await seedCatalog();
    sqlite.exec(`
      INSERT INTO portfolio_project_badges VALUES
        ('alpha', 'text', NULL), ('beta', 'image', 'beta/badge.webp');
      INSERT INTO portfolio_project_badge_translations VALUES ('beta', 'fr', 'Icône de palette');
    `);

    const { projects } = await listProjects(database, { locale: 'zh' });
    expect(projects.map(({ id, badge }) => [id, badge])).toEqual([
      ['alpha', undefined],
      ['beta', undefined],
    ]);
    const project = await findProjectBySlug(database, 'beta', 'zh');
    expect(project?.id).toBe('beta');
    expect(project).not.toHaveProperty('badge');
  });

  it('uses the requested badge language when the project summary falls back', async () => {
    await seedCatalog();
    sqlite.exec(`
      INSERT INTO portfolio_project_badges VALUES ('beta', 'text', NULL);
      INSERT INTO portfolio_project_badge_translations VALUES
        ('beta', 'en', 'Prototype'), ('beta', 'zh', '原型');
    `);

    const expected = {
      slug: 'beta',
      locale: 'en',
      badge: { type: 'text', label: '原型', locale: 'zh' },
    };
    const { projects } = await listProjects(database, { locale: 'zh' });
    expect(projects.find(({ slug }) => slug === 'beta')).toMatchObject(expected);
    await expect(findProjectBySlug(database, 'beta', 'zh')).resolves.toMatchObject(expected);
  });

  it('counts published records separately and surfaces invalid stored values', async () => {
    await seedCatalog();
    await expect(listProjectCategories(database, 'zh')).resolves.toEqual([
      { id: 'work', label: '作品', count: 1 },
    ]);
    sqlite.exec(
      `UPDATE portfolio_project_translations SET links_json = '[{}]' WHERE project_id = 'alpha'`
    );
    await expect(listProjects(database, { locale: 'en' })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof PortfolioDataError &&
        error.code === 'invalid-project-row' &&
        error.cause instanceof Error
    );
  });
});

describe('project cover sources', () => {
  it('preserves legacy covers and only serves sources attached to the active published cover', async () => {
    await seedCatalog();
    const legacy = await findProjectBySlug(database, 'alpha', 'en');
    expect(legacy?.cover).toEqual({ objectKey: 'alpha/cover.webp', alt: 'Cover' });
    sqlite.exec(`
      INSERT INTO portfolio_project_cover_sources VALUES
        ('alpha', 'alpha/cover.webp', 'display', 'alpha/cover.webp', 960, 640),
        ('alpha', 'alpha/cover.webp', 'thumbnail', 'alpha/thumb.webp', 420, 280),
        ('alpha', 'alpha/cover.webp', 'original', 'alpha/full.webp', 1920, 1280),
        ('draft', 'draft/cover.webp', 'thumbnail', 'draft/thumb.webp', 420, 280);
    `);
    await expect(findProjectBySlug(database, 'alpha', 'zh')).resolves.toMatchObject({
      cover: {
        alt: '封面',
        sources: {
          display: { objectKey: 'alpha/cover.webp', width: 960, height: 640 },
          thumbnail: { objectKey: 'alpha/thumb.webp', width: 420, height: 280 },
          original: { objectKey: 'alpha/full.webp', width: 1920, height: 1280 },
        },
      },
    });
    const image = { bytes: new Uint8Array([1]), contentType: 'image/webp' };
    const objects = { get: vi.fn().mockResolvedValue(image) };
    await expect(readProjectMedia(database, objects, 'alpha', 'alpha/full.webp')).resolves.toBe(
      image
    );
    await expect(readProjectMedia(database, objects, 'alpha', 'alpha/thumb.webp')).resolves.toBe(
      image
    );
    await expect(
      readProjectMedia(database, objects, 'beta', 'alpha/thumb.webp')
    ).resolves.toBeNull();
    await expect(
      readProjectMedia(database, objects, 'draft', 'draft/thumb.webp')
    ).resolves.toBeNull();
    sqlite.exec("UPDATE portfolio_projects SET cover_key = 'alpha/new.webp' WHERE id = 'alpha'");
    const updated = await findProjectBySlug(database, 'alpha', 'zh');
    expect(updated?.cover).toEqual({ objectKey: 'alpha/new.webp', alt: '封面' });
    await expect(
      readProjectMedia(database, objects, 'alpha', 'alpha/full.webp')
    ).resolves.toBeNull();
    expect(objects.get).toHaveBeenCalledTimes(2);
  });
});

describe('published project detail', () => {
  const read = <T>(operation: (connection: SqlDatabase) => Promise<T>): Promise<T> =>
    operation(database);

  it('keeps metadata and published documents in the same language', async () => {
    await seedCatalog();
    await expect(readProjectDetail({ read }, registry, 'alpha', 'zh')).resolves.toMatchObject({
      status: 'summary-only',
      project: { locale: 'zh' },
    });
    await expect(readProjectDetail({ read }, registry, 'draft', 'en')).resolves.toEqual({
      status: 'not-found',
    });
    seedPage();
    await expect(readProjectDetail({ read }, registry, 'alpha', 'zh')).resolves.toMatchObject({
      status: 'ready',
      project: { locale: 'en', title: 'Alpha' },
      page: {
        locale: 'en',
        revision: 3,
        document: publishedDocument,
        context: { external: { title: 'From context' } },
      },
    });
    await expect(readPublishedProjectPage(database, registry, 'alpha', 'zh')).resolves.toBeNull();
  });

  it('retains the requested badge language when the published page falls back', async () => {
    await seedCatalog();
    seedPage();
    sqlite.exec(`
      INSERT INTO portfolio_project_badges VALUES ('alpha', 'text', NULL);
      INSERT INTO portfolio_project_badge_translations VALUES
        ('alpha', 'en', 'Prototype'), ('alpha', 'zh', '原型');
    `);

    await expect(readProjectDetail({ read }, registry, 'alpha', 'zh')).resolves.toMatchObject({
      status: 'ready',
      project: { locale: 'en', badge: { type: 'text', label: '原型', locale: 'zh' } },
      page: { locale: 'en' },
    });
  });

  it('surfaces corrupt publication content and keeps media scoped to a published project', async () => {
    await seedCatalog();
    seedPage();
    const image = { bytes: new Uint8Array([1]), contentType: 'image/webp' };
    const objects = { get: vi.fn().mockResolvedValue(image) };
    await expect(readProjectMedia(database, objects, 'alpha', 'alpha/cover.webp')).resolves.toBe(
      image
    );
    await expect(readProjectMedia(database, objects, 'alpha', 'alpha/page.webp')).resolves.toBe(
      image
    );
    await expect(
      readProjectMedia(database, objects, 'beta', 'alpha/page.webp')
    ).resolves.toBeNull();
    await expect(
      readProjectMedia(database, objects, 'draft', 'draft/cover.webp')
    ).resolves.toBeNull();
    await expect(readProjectMedia(database, objects, 'alpha', '../private.webp')).rejects.toThrow();
    expect(objects.get).toHaveBeenCalledTimes(2);
    sqlite.exec(
      "UPDATE portfolio_project_pages SET document_json = '{}' WHERE project_id = 'alpha'"
    );
    const detail = await readProjectDetail({ read }, registry, 'alpha', 'en');
    expect(detail).toMatchObject({
      status: 'invalid-document',
      project: { title: 'Alpha', summary: 'First project' },
    });
    if (detail.status !== 'invalid-document') throw new Error('Expected invalid publication');
    expect(detail.error).toBeInstanceOf(PortfolioDataError);
    expect(detail.error.code).toBe('invalid-published-page');
    expect(detail.error.cause).toBeInstanceOf(Error);
    sqlite.exec("UPDATE portfolio_projects SET is_published = 0 WHERE id = 'alpha'");
    await expect(readPublishedProjectPage(database, registry, 'alpha', 'en')).resolves.toBeNull();
    await expect(
      readProjectMedia(database, objects, 'alpha', 'alpha/page.webp')
    ).resolves.toBeNull();
  });

  it('revokes replaced or withdrawn media while retaining explicit references of the current revision', async () => {
    await seedCatalog();
    seedPage();
    // Reinstall the trigger as an upgrade with already published content.
    sqlite.exec(
      'DROP TRIGGER portfolio_clear_replaced_page_media; DELETE FROM portfolio_migrations WHERE version = 6'
    );
    await migratePortfolio(database);
    const image = { bytes: new Uint8Array([1]), contentType: 'image/webp' };
    const objects = { get: vi.fn().mockResolvedValue(image) };
    const oldKey = 'alpha/page.webp';
    const newKey = 'alpha/new.webp';
    await expect(readProjectMedia(database, objects, 'alpha', oldKey)).resolves.toBe(image);

    await database.batch([
      {
        sql: "UPDATE portfolio_project_pages SET revision = 4 WHERE project_id = 'alpha' AND locale = 'en'",
      },
      {
        sql: "INSERT INTO portfolio_project_page_media VALUES ('alpha', 'en', ?)",
        values: [newKey],
      },
    ]);
    await expect(readProjectMedia(database, objects, 'alpha', oldKey)).resolves.toBeNull();
    await expect(readProjectMedia(database, objects, 'alpha', newKey)).resolves.toBe(image);
    sqlite.exec(
      "UPDATE portfolio_project_pages SET context_json = '{\"media\":null}' WHERE project_id = 'alpha' AND locale = 'en'"
    );
    await expect(readProjectMedia(database, objects, 'alpha', newKey)).resolves.toBeNull();

    sqlite
      .prepare("INSERT INTO portfolio_project_page_media VALUES ('alpha', 'en', ?)")
      .run(newKey);
    sqlite.exec("DELETE FROM portfolio_project_pages WHERE project_id = 'alpha' AND locale = 'en'");
    await expect(readProjectMedia(database, objects, 'alpha', newKey)).resolves.toBeNull();
    await expect(readProjectMedia(database, objects, 'alpha', 'alpha/cover.webp')).resolves.toBe(
      image
    );
  });
});
