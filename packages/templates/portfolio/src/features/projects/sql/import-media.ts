import { z } from 'zod';
import type { JsonValue } from '@frontend/ui-document';
import { parseDocument } from '@frontend/ui-document';
import type { ProjectSummary, PublishedProjectPage } from '@frontend/portfolio/contracts';
import { projectPageRegistry } from '@frontend/portfolio/render';
import { projectMediaPath } from './routes.ts';

/** SQL documents use authorized media URLs; file documents keep their public URLs. */
export function sqlProjectDocument(page: PublishedProjectPage, project: ProjectSummary) {
  const replacements = new Map(
    projectMediaKeys(project).map((key) => ['/' + key, projectMediaPath(project.id, key)])
  );
  function rewrite(value: JsonValue): JsonValue {
    if (typeof value === 'string') return replacements.get(value) ?? value;
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewrite(child)]));
    return value;
  }
  const parsed = parseDocument(rewrite(z.json().parse(page.document)), projectPageRegistry);
  if (!parsed.ok)
    throw new Error('Unable to prepare SQL project document.', { cause: parsed.errors });
  return parsed.value;
}

export function projectMediaKeys(project: ProjectSummary): readonly string[] {
  return [
    ...new Set([
      ...(project.cover ? [project.cover.objectKey] : []),
      ...Object.values(project.cover?.sources ?? {}).flatMap((source) =>
        source ? [source.objectKey] : []
      ),
      ...(project.badge?.type === 'image' ? [project.badge.objectKey] : []),
    ]),
  ];
}
