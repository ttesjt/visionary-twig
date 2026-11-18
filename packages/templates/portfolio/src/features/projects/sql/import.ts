import type { SqlCommand, SqlDatabase } from '@frontend/storage';
import { DEFAULT_TEXT_LOCALE } from '../../../site/text.ts';
import type { ProjectDataset } from '../dataset-types.ts';
import { sqlProjectDocument } from './import-media.ts';

/** Explicit initial import. Existing rows keep their authored values. */
export async function importProjectDatasets(
  database: SqlDatabase,
  datasets: readonly ProjectDataset[]
): Promise<void> {
  const primary = datasets.find(({ locale }) => locale === DEFAULT_TEXT_LOCALE);
  if (!primary) throw new Error('The project dataset needs its default locale.');
  const commands: SqlCommand[] = [];
  for (const [sortOrder, item] of primary.categories.entries()) {
    commands.push({
      sql: 'INSERT OR IGNORE INTO portfolio_categories (id, default_locale, sort_order) VALUES (?, ?, ?)',
      values: [item.id, DEFAULT_TEXT_LOCALE, sortOrder],
    });
  }
  for (const [sortOrder, item] of primary.projects.entries()) {
    commands.push({
      sql: 'INSERT OR IGNORE INTO portfolio_projects (id, slug, default_locale, is_published, sort_order, cover_key) VALUES (?, ?, ?, 1, ?, ?)',
      values: [item.id, item.slug, item.defaultLocale, sortOrder, item.cover?.objectKey ?? null],
    });
    commands.push({
      sql: 'INSERT OR IGNORE INTO portfolio_project_pins (project_id, pinned) VALUES (?, ?)',
      values: [item.id, item.pinned ? 1 : 0],
    });
    if (item.badge)
      commands.push({
        sql: 'INSERT OR IGNORE INTO portfolio_project_badges (project_id, type, object_key) VALUES (?, ?, ?)',
        values: [
          item.id,
          item.badge.type,
          item.badge.type === 'image' ? item.badge.objectKey : null,
        ],
      });
    if (item.cover?.sources) {
      for (const [role, source] of Object.entries(item.cover.sources)) {
        if (!source) continue;
        commands.push({
          sql: `INSERT OR IGNORE INTO portfolio_project_cover_sources
             (project_id, cover_key, role, object_key, width, height)
             SELECT id, cover_key, ?, ?, ?, ? FROM portfolio_projects WHERE id = ? AND cover_key = ?`,
          values: [
            role,
            source.objectKey,
            source.width,
            source.height,
            item.id,
            item.cover.objectKey,
          ],
        });
      }
    }
    for (const categoryId of item.categoryIds) {
      commands.push({
        sql: 'INSERT OR IGNORE INTO portfolio_project_categories (project_id, category_id) VALUES (?, ?)',
        values: [item.id, categoryId],
      });
    }
  }
  for (const dataset of datasets) {
    const { locale } = dataset;
    for (const category of dataset.categories) {
      commands.push({
        sql: 'INSERT OR IGNORE INTO portfolio_category_translations (category_id, locale, label) VALUES (?, ?, ?)',
        values: [category.id, locale, category.label],
      });
    }
    for (const project of dataset.projects) {
      commands.push({
        sql: 'INSERT OR IGNORE INTO portfolio_project_translations (project_id, locale, title, summary, cover_alt, links_json) VALUES (?, ?, ?, ?, ?, ?)',
        values: [
          project.id,
          locale,
          project.title,
          project.summary,
          project.cover?.alt ?? null,
          JSON.stringify(project.links),
        ],
      });
      const { badge } = project;
      if (badge)
        commands.push({
          sql: `INSERT OR IGNORE INTO portfolio_project_badge_translations (project_id, locale, label)
          SELECT project_id, ?, ? FROM portfolio_project_badges
          WHERE project_id = ? AND type = ? AND object_key IS ?`,
          values: [
            locale,
            badge.type === 'image' ? badge.alt : badge.label,
            project.id,
            badge.type,
            badge.type === 'image' ? badge.objectKey : null,
          ],
        });
      const page = dataset.pages.find((page) => page.projectId === project.id);
      if (!page) continue;
      const document = JSON.stringify(sqlProjectDocument(page, project));
      const context = JSON.stringify(page.context);
      commands.push({
        sql: 'INSERT OR IGNORE INTO portfolio_project_pages (project_id, locale, revision, document_json, context_json) VALUES (?, ?, ?, ?, ?)',
        values: [page.projectId, page.locale, page.revision, document, context],
      });
      if (project.cover) {
        commands.push({
          sql: `INSERT OR IGNORE INTO portfolio_project_page_media (project_id, locale, object_key)
            SELECT project_id, locale, ?
            FROM portfolio_project_pages
            WHERE project_id = ? AND locale = ? AND revision = ?
              AND document_json = ? AND context_json = ?`,
          values: [
            project.cover.objectKey,
            page.projectId,
            page.locale,
            page.revision,
            document,
            context,
          ],
        });
      }
    }
  }
  await database.batch(commands);
}
