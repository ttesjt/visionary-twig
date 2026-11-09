import { parseDocument, CONTENT_SCHEMA_VERSION } from '@frontend/ui-document';
import type {
  ContentRegistry,
  ContentResult,
  ContentDocument,
  JsonObject,
} from '@frontend/ui-document';
import { capture, fail, snapshotJson, isJsonObject } from '@frontend/ui-document/inspection';
import { DEFAULT_CONTENT_LIMITS } from '@frontend/ui-document';
import {
  DEFAULT_PROJECT_LOCALE,
  MAX_STUDIO_PROJECT_BYTES,
  STUDIO_PROJECT_KIND,
  STUDIO_FORMAT_VERSION,
  type StudioProject,
} from './schema.js';
import { parseProject } from './parse.js';
export interface ImportProjectOptions {
  readonly locale?: string;
  readonly context?: unknown;
  readonly documentId?: string;
  /** Only the Puck adapter knows how to normalize native editor bookkeeping. */
  readonly normalizePuck?: (input: unknown) => unknown;
}
export function projectFromDocument(
  document: ContentDocument,
  context: unknown = {},
  locale = document.locale ?? DEFAULT_PROJECT_LOCALE
): ContentResult<StudioProject> {
  const result = capture(() => {
    const object = snapshotJson(context, DEFAULT_CONTENT_LIMITS);
    if (!isJsonObject(object)) fail('invalid-context', ['context'], 'Expected an object.');
    const { copy: text, ...rest } = object;
    if (text !== undefined && !isJsonObject(text))
      fail('invalid-catalog', ['context', 'copy'], 'Legacy copy must be a JSON object.');
    if (text !== undefined && Object.hasOwn(document.variables ?? {}, 'copy'))
      fail('copy-conflict', ['variables', 'copy'], 'Embedded and external copy must not overlap.');
    return {
      metadata: {
        kind: STUDIO_PROJECT_KIND,
        formatVersion: STUDIO_FORMAT_VERSION,
        defaultLocale: locale,
      },
      document,
      catalogs: text === undefined ? {} : { [locale]: text },
      context: rest,
    } satisfies StudioProject;
  });
  return result;
}
/** Explicit project discriminators never fall through to another importer on failure. */
export function importProject(
  input: unknown,
  registry: ContentRegistry,
  options: ImportProjectOptions = {}
): ContentResult<StudioProject> {
  const decoded = capture(() => {
    if (typeof input !== 'string')
      return snapshotJson(input, { ...DEFAULT_CONTENT_LIMITS, maxBytes: MAX_STUDIO_PROJECT_BYTES });
    if (new TextEncoder().encode(input).byteLength > MAX_STUDIO_PROJECT_BYTES)
      fail('project-too-large', [], 'Project exceeds the file size limit.');
    let value: unknown;
    try {
      value = JSON.parse(input);
    } catch {
      fail('invalid-json', [], 'Enter valid JSON.');
    }
    return snapshotJson(value, { ...DEFAULT_CONTENT_LIMITS, maxBytes: MAX_STUDIO_PROJECT_BYTES });
  });
  if (!decoded.ok) return decoded;
  const value = decoded.value;
  if (value !== null && typeof value === 'object' && Object.hasOwn(value, 'metadata'))
    return parseProject(value, registry);
  let documentInput: unknown = value;
  if (
    value !== null &&
    typeof value === 'object' &&
    !Object.hasOwn(value, 'schemaVersion') &&
    Object.hasOwn(value, 'root') &&
    Object.hasOwn(value, 'content')
  ) {
    const data = options.normalizePuck ? options.normalizePuck(value) : value;
    documentInput = {
      documentId: options.documentId ?? 'imported-layout',
      schemaVersion: CONTENT_SCHEMA_VERSION,
      revision: 1,
      data,
    };
  }
  const parsed = parseDocument(documentInput, registry);
  if (!parsed.ok) return parsed;
  const project = projectFromDocument(
    parsed.value,
    options.context,
    options.locale ?? parsed.value.locale ?? DEFAULT_PROJECT_LOCALE
  );
  return project.ok ? parseProject(project.value, registry) : project;
}
export function createProject(documentId: string, locale = DEFAULT_PROJECT_LOCALE): StudioProject {
  return {
    metadata: {
      kind: STUDIO_PROJECT_KIND,
      formatVersion: STUDIO_FORMAT_VERSION,
      defaultLocale: locale,
    },
    document: {
      documentId,
      schemaVersion: CONTENT_SCHEMA_VERSION,
      revision: 1,
      data: { root: {}, content: [] },
    },
    catalogs: {},
    context: {},
  };
}
export function projectContext(project: StudioProject, locale: string): JsonObject {
  const text = project.catalogs[locale];
  return text === undefined ? project.context : { ...project.context, copy: text };
}
