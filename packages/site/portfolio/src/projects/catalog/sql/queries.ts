import type { SqlDatabase } from '@frontend/storage';
import { projectLocaleSchema } from '../../schemas/locale.js';
import { projectSlugSchema } from '../../schemas/project-id.js';
import { projectListQuerySchema } from '../contracts.js';
import type {
  ProjectCategory,
  ProjectList,
  ProjectListQuery,
  ProjectSummary,
} from '../contracts.js';
import { mapProjectCategoryRow, mapProjectRow } from './rows.js';

const PROJECT_SUMMARY_SELECT = `
  SELECT p.id, p.slug, p.default_locale AS defaultLocale, t.locale, t.title, t.summary,
         COALESCE(pin.pinned, 0) AS pinned, p.cover_key, t.cover_alt, t.links_json,
         badge.type AS badge_type, badge.object_key AS badge_object_key,
         COALESCE(badge_text.label, badge_fallback.label) AS badge_label,
         COALESCE(badge_text.locale, badge_fallback.locale) AS badge_locale,
         (SELECT json_group_object(source.role, json_object(
            'objectKey', source.object_key, 'width', source.width, 'height', source.height))
          FROM portfolio_project_cover_sources AS source
          WHERE source.project_id = p.id AND source.cover_key = p.cover_key) AS cover_sources_json,
         (SELECT json_group_array(category_id ORDER BY category_id)
          FROM portfolio_project_categories WHERE project_id = p.id) AS category_ids_json
  FROM portfolio_projects AS p
  LEFT JOIN portfolio_project_pins AS pin ON pin.project_id = p.id
  LEFT JOIN portfolio_project_translations AS requested ON requested.project_id = p.id AND requested.locale = ?
  LEFT JOIN portfolio_project_translations AS t ON t.project_id = p.id
    AND t.locale = COALESCE(requested.locale, p.default_locale)
  LEFT JOIN portfolio_project_badges AS badge ON badge.project_id = p.id
  LEFT JOIN portfolio_project_badge_translations AS badge_text
    ON badge_text.project_id = badge.project_id AND badge_text.locale = ?
  LEFT JOIN portfolio_project_badge_translations AS badge_fallback
    ON badge_fallback.project_id = badge.project_id AND badge_fallback.locale = p.default_locale
  WHERE p.is_published = 1
`;

export async function listProjects(
  database: SqlDatabase,
  input: ProjectListQuery
): Promise<ProjectList> {
  const { locale, categoryId, limit, offset } = projectListQuerySchema.parse(input);
  const filter =
    categoryId === undefined
      ? ''
      : `
    AND EXISTS (SELECT 1 FROM portfolio_project_categories WHERE project_id = p.id AND category_id = ?)
  `;
  const rows = await database.all(
    PROJECT_SUMMARY_SELECT +
      filter +
      ' ORDER BY COALESCE(pin.pinned, 0) DESC, p.sort_order, p.id LIMIT ? OFFSET ?',
    [locale, locale, ...(categoryId === undefined ? [] : [categoryId]), limit + 1, offset]
  );
  return {
    projects: rows.slice(0, limit).map(mapProjectRow),
    hasMore: rows.length > limit,
  };
}

export async function findProjectBySlug(
  database: SqlDatabase,
  slug: string,
  locale: string
): Promise<ProjectSummary | null> {
  const requestedLocale = projectLocaleSchema.parse(locale);
  const [row] = await database.all(PROJECT_SUMMARY_SELECT + ' AND p.slug = ?', [
    requestedLocale,
    requestedLocale,
    projectSlugSchema.parse(slug),
  ]);
  return row === undefined ? null : mapProjectRow(row);
}

export async function listProjectCategories(
  database: SqlDatabase,
  locale: string
): Promise<readonly ProjectCategory[]> {
  const rows = await database.all(
    `SELECT c.id, COALESCE(requested.label, fallback.label) AS label, COUNT(p.id) AS count
      FROM portfolio_categories AS c
      LEFT JOIN portfolio_category_translations AS requested ON requested.category_id = c.id AND requested.locale = ?
      LEFT JOIN portfolio_category_translations AS fallback ON fallback.category_id = c.id AND fallback.locale = c.default_locale
      JOIN portfolio_project_categories AS pc ON pc.category_id = c.id
      JOIN portfolio_projects AS p ON p.id = pc.project_id AND p.is_published = 1
      GROUP BY c.id, c.sort_order, requested.label, fallback.label
      ORDER BY c.sort_order, c.id`,
    [projectLocaleSchema.parse(locale)]
  );
  return rows.map(mapProjectCategoryRow);
}
