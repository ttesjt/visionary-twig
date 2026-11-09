import { DEFAULT_CONTENT_LIMITS } from '@frontend/ui-document';
import type { ContentRegistry, ContentResult, JsonObject, JsonValue } from '@frontend/ui-document';
import {
  assertSafePath,
  capture,
  fail,
  isJsonObject,
  isPrefix,
  readJsonPath,
} from '@frontend/ui-document/inspection';
import { parseProject } from '../project/parse.js';
import type { StudioProject } from '../project/schema.js';
export interface CatalogEntry {
  readonly path: readonly string[];
  readonly value: JsonValue;
}
/** A node may bind an entire structured value; callers need not flatten it to strings. */
export function catalogEntries(catalog: JsonObject): readonly CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  function walk(value: JsonObject, parent: readonly string[]) {
    for (const [key, item] of Object.entries(value)) {
      const path = [...parent, key];
      entries.push({ path, value: item });
      if (isJsonObject(item)) walk(item, path);
    }
  }
  walk(catalog, []);
  return entries;
}
export function catalogReferences(project: StudioProject, path: readonly string[]) {
  return (project.document.bindings ?? []).filter(
    (binding) =>
      binding.sourcePath[0] === 'copy' &&
      (isPrefix(path, binding.sourcePath.slice(1)) || isPrefix(binding.sourcePath.slice(1), path))
  );
}
/** Immutable object-path editing. Arrays are values; their nested slots are not fabricated. */
export function setCatalogPath(
  object: JsonObject,
  path: readonly string[],
  value: JsonValue | undefined
): JsonObject {
  assertSafePath(path, path);
  if (path.length > DEFAULT_CONTENT_LIMITS.maxPathSegments)
    fail('path-too-long', path, 'Path exceeds maxPathSegments.');
  const [key, ...rest] = path;
  if (key === undefined) throw new Error('Empty path.');
  const previous = Object.hasOwn(object, key) ? object[key] : undefined;
  const next: Record<string, JsonValue> = { ...object };
  if (!rest.length) {
    if (value === undefined) delete next[key];
    else
      Object.defineProperty(next, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
  } else {
    if (previous !== undefined && !isJsonObject(previous))
      fail('catalog-path-conflict', path, 'Intermediate catalog path is not an object.');
    next[key] = setCatalogPath(previous ?? {}, rest, value);
  }
  return next;
}
export function setCatalogValue(
  project: StudioProject,
  locale: string,
  path: readonly string[],
  value: JsonValue,
  registry: ContentRegistry
): ContentResult<StudioProject> {
  const result = capture(() => ({
    ...project,
    catalogs: {
      ...project.catalogs,
      [locale]: setCatalogPath(project.catalogs[locale] ?? {}, path, value),
    },
  }));
  return result.ok ? parseProject(result.value, registry) : result;
}
/** Rename across every language and binding is one project transaction. */
export function renameCatalogKey(
  project: StudioProject,
  from: readonly string[],
  to: readonly string[],
  registry: ContentRegistry
): ContentResult<StudioProject> {
  const result = capture(() => {
    assertSafePath(from, from);
    assertSafePath(to, to);
    if (isPrefix(from, to) || isPrefix(to, from))
      fail('overlapping-key', to, 'Rename paths must not overlap.');
    const catalogs: Record<string, JsonObject> = {};
    let found = false;
    for (const [locale, catalog] of Object.entries(project.catalogs)) {
      if (readJsonPath(catalog, to) !== undefined)
        fail('existing-key', ['catalogs', locale, ...to], 'Destination already exists.');
      const value = readJsonPath(catalog, from);
      if (value !== undefined) found = true;
      catalogs[locale] =
        value === undefined
          ? catalog
          : setCatalogPath(setCatalogPath(catalog, from, undefined), to, value);
    }
    if (!found) fail('missing-key', from, 'Source key does not exist.');
    const bindings = (project.document.bindings ?? []).map((binding) =>
      binding.sourcePath[0] === 'copy' && isPrefix(from, binding.sourcePath.slice(1))
        ? { ...binding, sourcePath: ['copy', ...to, ...binding.sourcePath.slice(1 + from.length)] }
        : binding
    );
    return { ...project, catalogs, document: { ...project.document, bindings } };
  });
  return result.ok ? parseProject(result.value, registry) : result;
}
export function deleteCatalogKey(
  project: StudioProject,
  path: readonly string[],
  registry: ContentRegistry
): ContentResult<StudioProject> {
  if (catalogReferences(project, path).length)
    return {
      ok: false,
      errors: [
        {
          code: 'referenced-key',
          path,
          message: 'Unbind or rename every reference before deleting this key.',
        },
      ],
    };
  const result = capture(() => ({
    ...project,
    catalogs: Object.fromEntries(
      Object.entries(project.catalogs).map(([locale, catalog]) => [
        locale,
        setCatalogPath(catalog, path, undefined),
      ])
    ),
  }));
  return result.ok ? parseProject(result.value, registry) : result;
}
