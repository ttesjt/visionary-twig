import type { SqlDatabase } from '@frontend/storage';
import type { ContentRegistry } from '@frontend/ui-document';
import { projectLocaleSchema } from '../../schemas/locale.js';
import { projectIdSchema } from '../../schemas/project-id.js';
import type { ProjectId } from '../../schemas/project-id.js';
import type { PublishedProjectPage } from '../contracts.js';
import { mapPublishedPageRow } from './rows.js';

export async function readPublishedProjectPage(
  database: SqlDatabase,
  registry: ContentRegistry,
  projectId: ProjectId,
  locale: string
): Promise<PublishedProjectPage | null> {
  const [row] = await database.all(
    `SELECT page.project_id AS projectId, page.locale, page.revision, page.document_json, page.context_json
      FROM portfolio_project_pages AS page
      JOIN portfolio_projects AS p ON p.id = page.project_id AND p.is_published = 1
      WHERE page.project_id = ? AND page.locale = ?`,
    [projectIdSchema.parse(projectId), projectLocaleSchema.parse(locale)]
  );
  return row === undefined ? null : mapPublishedPageRow(row, registry);
}
