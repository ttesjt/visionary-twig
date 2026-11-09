import { collectResolvedMedia, resolveDocument } from '@frontend/ui-document';
import type {
  ContentIssue,
  ContentRegistry,
  ContentResult,
  JsonObject,
} from '@frontend/ui-document';
import type { EditableDocument } from '@frontend/ui-document/inspection';
import { inspectDocument, readJsonPath } from '@frontend/ui-document/inspection';
import { projectContext } from './import.js';
import { parseProject } from './parse.js';
import { localeSchema, type StudioProject } from './schema.js';
export interface ProjectIssue extends ContentIssue {
  readonly locale?: string;
  readonly sourcePath?: readonly string[];
  readonly targetPath?: readonly string[];
  readonly sourceKind?: 'catalog' | 'context';
}
export function projectIssues(
  project: StudioProject,
  registry: ContentRegistry,
  locale: string
): readonly ProjectIssue[] {
  const missing: ProjectIssue[] = [];
  const external = projectContext(project, locale);
  const context: JsonObject = { ...project.document.variables, ...external };
  for (const [index, binding] of (project.document.bindings ?? []).entries()) {
    if (readJsonPath(context, binding.sourcePath) === undefined)
      missing.push({
        code: 'missing-variable',
        path: ['bindings', String(index), 'sourcePath'],
        message: 'Variable path does not exist.',
        nodeId: binding.nodeId,
        locale,
        sourcePath: binding.sourcePath,
        targetPath: binding.targetPath,
        sourceKind:
          binding.sourcePath[0] === 'copy' &&
          !Object.hasOwn(project.document.variables ?? {}, 'copy')
            ? 'catalog'
            : 'context',
      });
  }
  const resolved = resolveDocument(project.document, registry, { context: external });
  const errors = resolved.ok
    ? []
    : resolved.errors
        .filter((issue) => issue.code !== 'missing-variable' || !missing.length)
        .map((issue) => ({ ...issue, locale }));
  return [...missing, ...errors];
}
export interface PublishSnapshot {
  readonly project: StudioProject;
  readonly locales: readonly string[];
  readonly mediaUrls: readonly string[];
}
/** The returned snapshot is owned. Later edits cannot enter an in-flight publication. */
export function preparePublication(
  input: unknown,
  registry: ContentRegistry,
  locales: readonly string[]
): ContentResult<PublishSnapshot> {
  const parsed = parseProject(input, registry);
  if (!parsed.ok) return parsed;
  const selected = [...new Set(locales)];
  const errors: ContentIssue[] = [];
  if (!selected.length || !selected.includes(parsed.value.metadata.defaultLocale))
    errors.push({
      code: 'invalid-publication-locales',
      path: ['locales'],
      message: 'Select the default language and every language to publish.',
    });
  for (const locale of selected) {
    if (
      !localeSchema.safeParse(locale).success ||
      (Object.keys(parsed.value.catalogs).length > 0 &&
        !Object.hasOwn(parsed.value.catalogs, locale))
    ) {
      errors.push({
        code: 'missing-catalog',
        path: ['catalogs', locale],
        message: 'The selected publication language has no catalog.',
      });
    } else errors.push(...projectIssues(parsed.value, registry, locale));
  }
  if (errors.length) return { ok: false, errors };
  const mediaUrls = new Set<string>();
  for (const locale of selected) {
    const resolved = resolveDocument(parsed.value.document, registry, {
      context: projectContext(parsed.value, locale),
    });
    if (!resolved.ok) return resolved;
    const media = collectResolvedMedia(resolved.value.data, registry);
    if (!media.ok) return media;
    for (const url of media.value) mediaUrls.add(url);
  }
  const catalogs = Object.fromEntries(
    Object.entries(parsed.value.catalogs).filter(([locale]) => selected.includes(locale))
  );
  return {
    ok: true,
    value: { project: { ...parsed.value, catalogs }, locales: selected, mediaUrls: [...mediaUrls] },
  };
}
export function projectNodes(
  project: StudioProject,
  registry: ContentRegistry
): ContentResult<EditableDocument> {
  return inspectDocument(project.document, registry, {});
}
