import type { ObjectStorage, SqlDatabase, StoredObject } from '@frontend/storage';
import { projectMediaKeySchema } from '../schemas/media-key.js';
import { projectIdSchema } from '../schemas/project-id.js';
import type { ProjectId } from '../schemas/project-id.js';

/** Only media registered to the published project can be served. */
export async function readProjectMedia(
  database: SqlDatabase,
  objects: Pick<ObjectStorage, 'get'>,
  projectId: ProjectId,
  objectKey: string
): Promise<StoredObject | null> {
  const key = projectMediaKeySchema.parse(objectKey);
  const [authorized] = await database.all(
    `SELECT 1 FROM portfolio_projects AS p
      WHERE p.id = ? AND p.is_published = 1
      AND (p.cover_key = ? OR EXISTS (
        SELECT 1 FROM portfolio_project_cover_sources AS source
        WHERE source.project_id = p.id AND source.cover_key = p.cover_key AND source.object_key = ?
      ) OR EXISTS (
        SELECT 1 FROM portfolio_project_badges AS badge
        WHERE badge.project_id = p.id AND badge.type = 'image' AND badge.object_key = ?
      ) OR EXISTS (
        SELECT 1 FROM portfolio_project_page_media AS m
        JOIN portfolio_project_pages AS page ON page.project_id = m.project_id AND page.locale = m.locale
        WHERE m.project_id = p.id AND m.object_key = ?
      ))`,
    [projectIdSchema.parse(projectId), key, key, key, key]
  );
  return authorized === undefined ? null : objects.get(key);
}
