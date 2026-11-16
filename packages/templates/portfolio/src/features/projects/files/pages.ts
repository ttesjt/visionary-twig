import { resolveDocument, DEFAULT_CONTENT_LIMITS } from '@frontend/ui-document';
import { isJsonObject, snapshotJson } from '@frontend/ui-document/inspection';
import type { ProjectSummary } from '@frontend/portfolio/contracts';
import { projectPageRegistry } from '@frontend/portfolio/render';
import { PortfolioDataError, type ProjectDetail } from '@frontend/portfolio/server';
import { projectFilePageSchema } from './schemas.ts';

export function readFileProjectPage(
  project: ProjectSummary,
  resolve: () => unknown
): Exclude<ProjectDetail, { status: 'not-found' | 'summary-only' }> {
  try {
    // Text lookup belongs to the same failure boundary as document decoding.
    const input = projectFilePageSchema.parse(resolve());
    const context = snapshotJson(input.context, DEFAULT_CONTENT_LIMITS);
    const result = resolveDocument(input.document, projectPageRegistry, { context });
    if (!result.ok) throw new Error('Invalid file project document.', { cause: result.errors });
    const { document } = result.value;
    if (document.locale !== undefined && document.locale !== project.locale)
      throw new Error('Project page language differs from the requested project language.');
    if (!isJsonObject(context)) throw new Error('Expected an object context.');
    return {
      status: 'ready',
      project,
      page: {
        projectId: project.id,
        locale: project.locale,
        revision: document.revision,
        document,
        context,
      },
    };
  } catch (cause) {
    return {
      status: 'invalid-document',
      project,
      error: new PortfolioDataError(
        'invalid-published-page',
        'Unable to decode a file project page.',
        { cause }
      ),
    };
  }
}
