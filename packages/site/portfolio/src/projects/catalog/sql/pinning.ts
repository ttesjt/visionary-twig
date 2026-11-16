import type { SqlDatabase } from '@frontend/storage';
import { PortfolioDataError } from '../../data-error.js';
import { projectIdSchema } from '../../schemas/project-id.js';

export async function setProjectPinned(
  database: SqlDatabase,
  projectId: string,
  pinned: boolean
): Promise<void> {
  const id = projectIdSchema.parse(projectId);
  const [result] = await database.batch([
    {
      sql: `INSERT INTO portfolio_project_pins (project_id, pinned)
        SELECT id, ? FROM portfolio_projects WHERE id = ?
        ON CONFLICT (project_id) DO UPDATE SET pinned = excluded.pinned
        RETURNING project_id`,
      values: [pinned ? 1 : 0, id],
    },
  ]);
  if (result?.rows.length !== 1)
    throw new PortfolioDataError('project-not-found', 'No project exists with ID ' + id + '.');
}
