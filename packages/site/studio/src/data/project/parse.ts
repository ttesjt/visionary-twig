import { parseDocument, DEFAULT_CONTENT_LIMITS } from '@frontend/ui-document';
import type { ContentRegistry, ContentResult, JsonObject } from '@frontend/ui-document';
import { capture, fail, snapshotJson, isJsonObject } from '@frontend/ui-document/inspection';
import { projectEnvelopeSchema, MAX_STUDIO_PROJECT_BYTES, type StudioProject } from './schema.js';
export function parseProject(
  input: unknown,
  registry: ContentRegistry
): ContentResult<StudioProject> {
  const outer = capture(() => {
    if (
      typeof input === 'string' &&
      new TextEncoder().encode(input).byteLength > MAX_STUDIO_PROJECT_BYTES
    )
      fail('project-too-large', [], 'Studio project exceeds the file size limit.');
    let decoded: unknown = input;
    if (typeof input === 'string') {
      try {
        decoded = JSON.parse(input);
      } catch {
        fail('invalid-json', [], 'Enter valid project JSON.');
      }
    }
    const owned = snapshotJson(decoded, {
      ...DEFAULT_CONTENT_LIMITS,
      maxBytes: MAX_STUDIO_PROJECT_BYTES,
    });
    const result = projectEnvelopeSchema.safeParse(owned);
    if (!result.success)
      fail(
        'invalid-project',
        [],
        result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      );
    const envelope = result.data;
    if (!isJsonObject(owned)) fail('invalid-project', [], 'Expected a project object.');
    const catalogs = owned.catalogs;
    if (!isJsonObject(catalogs))
      fail('invalid-catalogs', ['catalogs'], 'Expected language catalogs.');
    const checked: Record<string, JsonObject> = {};
    for (const [locale, value] of Object.entries(catalogs)) {
      if (!isJsonObject(value))
        fail('invalid-catalog', ['catalogs', locale], 'A catalog must be a JSON object.');
      Object.defineProperty(checked, locale, { value, enumerable: true });
    }
    if (!isJsonObject(owned.context))
      fail('invalid-context', ['context'], 'Context must be a JSON object.');
    if (Object.hasOwn(owned.context, 'copy'))
      fail('duplicate-copy', ['context', 'copy'], 'Project copy belongs only in catalogs.');
    return { envelope, catalogs: checked, context: owned.context };
  });
  if (!outer.ok) return outer;
  const document = parseDocument(outer.value.envelope.document, registry);
  if (!document.ok) return document;
  if (
    Object.keys(outer.value.catalogs).length &&
    Object.hasOwn(document.value.variables ?? {}, 'copy')
  )
    return {
      ok: false,
      errors: [
        {
          code: 'copy-conflict',
          path: ['document', 'variables', 'copy'],
          message:
            'Embedded copy conflicts with project catalogs. Move it explicitly to a language catalog.',
        },
      ],
    };
  return {
    ok: true,
    value: {
      metadata: outer.value.envelope.metadata,
      document: document.value,
      catalogs: outer.value.catalogs,
      context: outer.value.context,
      ...(outer.value.envelope.publishing === undefined
        ? {}
        : { publishing: outer.value.envelope.publishing }),
    },
  };
}
export function encodeProject(project: StudioProject): string {
  const readable = JSON.stringify(project, null, 2);
  return new TextEncoder().encode(readable).byteLength <= MAX_STUDIO_PROJECT_BYTES
    ? readable
    : JSON.stringify(project);
}
/** Local-file baseline includes publication associations; publication payload identity excludes them. */
export const projectFingerprint = (project: StudioProject): string => JSON.stringify(project);
export const contentFingerprint = (project: StudioProject): string =>
  JSON.stringify({
    document: project.document,
    catalogs: project.catalogs,
    context: project.context,
    defaultLocale: project.metadata.defaultLocale,
  });
