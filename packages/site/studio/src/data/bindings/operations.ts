import type { ContentRegistry, ContentResult, JsonValue } from '@frontend/ui-document';
import {
  bindingDestinations,
  assertSafePath,
  capture,
  fail,
  inspectDocument,
  isPrefix,
  readJsonPath,
  snapshotJson,
  contentLimits,
  writeJsonPath,
} from '@frontend/ui-document/inspection';
import { parseProject } from '../project/parse.js';
import { projectContext } from '../project/import.js';
import { setCatalogPath, setCatalogValue } from '../catalog/operations.js';
import type { StudioProject } from '../project/schema.js';
/** New bindings can be incomplete while editing, but targets must remain valid and disjoint. */
export function bindProjectField(
  project: StudioProject,
  nodeId: string,
  targetPath: readonly string[],
  sourcePath: readonly string[],
  registry: ContentRegistry
): ContentResult<StudioProject> {
  const inspected = inspectDocument(project.document, registry, {});
  if (!inspected.ok) return inspected;
  const result = capture(() => {
    assertSafePath(targetPath, targetPath);
    assertSafePath(sourcePath, sourcePath);
    const bindings = (project.document.bindings ?? []).filter(
      (binding) =>
        !(
          binding.nodeId === nodeId &&
          JSON.stringify(binding.targetPath) === JSON.stringify(targetPath)
        )
    );
    bindingDestinations([...bindings, { nodeId, targetPath, sourcePath }], inspected.value.nodes);
    return {
      ...project,
      document: {
        ...project.document,
        bindings: [...bindings, { nodeId, targetPath, sourcePath }],
      },
    };
  });
  return result.ok ? parseProject(result.value, registry) : result;
}
export function unbindProjectField(
  project: StudioProject,
  nodeId: string,
  targetPath: readonly string[],
  locale: string,
  registry: ContentRegistry
): ContentResult<StudioProject> {
  const inspected = inspectDocument(project.document, registry, {});
  if (!inspected.ok) return inspected;
  const result = capture(() => {
    const binding = (project.document.bindings ?? []).find(
      (binding) =>
        binding.nodeId === nodeId &&
        JSON.stringify(binding.targetPath) === JSON.stringify(targetPath)
    );
    const node = inspected.value.nodes.get(nodeId);
    if (!binding || !node) fail('missing-binding', targetPath, 'Binding does not exist.');
    const value = readJsonPath(
      { ...project.document.variables, ...projectContext(project, locale) },
      binding.sourcePath
    );
    if (value === undefined)
      fail(
        'missing-variable',
        binding.sourcePath,
        'Supply a current value before switching to direct mode.'
      );
    writeJsonPath(node.node.props, targetPath, snapshotJson(value, contentLimits()));
    return {
      ...project,
      document: {
        ...inspected.value.document,
        bindings: (project.document.bindings ?? []).filter((item) => item !== binding),
      },
    };
  });
  return result.ok ? parseProject(result.value, registry) : result;
}
/** Validate a proposed value against its registered target without resolving unrelated missing keys. */
export function validateBoundValue(
  project: StudioProject,
  nodeId: string,
  targetPath: readonly string[],
  value: JsonValue,
  locale: string,
  registry: ContentRegistry
): ContentResult<JsonValue> {
  const inspected = inspectDocument(project.document, registry, {});
  if (!inspected.ok) return inspected;
  const result = capture(() => {
    const target = inspected.value.nodes.get(nodeId);
    if (!target) fail('missing-binding-node', targetPath, 'Component no longer exists.');
    const context = { ...project.document.variables, ...projectContext(project, locale) };
    for (const binding of project.document.bindings ?? []) {
      const node = inspected.value.nodes.get(binding.nodeId);
      const item = readJsonPath(context, binding.sourcePath);
      if (node && item !== undefined) writeJsonPath(node.node.props, binding.targetPath, item);
    }
    writeJsonPath(target.node.props, targetPath, value);
    const issues = target.contract
      .validateProps(target.node.props)
      .filter((issue) => isPrefix(targetPath, issue.path) || isPrefix(issue.path, targetPath));
    if (issues.length)
      fail('invalid-bound-value', targetPath, issues.map((issue) => issue.message).join('; '));
    return value;
  });
  return result;
}

/** Edit the actual owner of a source namespace, never create a competing copy. */
export function setBindingSourceValue(
  project: StudioProject,
  sourcePath: readonly string[],
  value: JsonValue,
  locale: string,
  registry: ContentRegistry
): ContentResult<StudioProject> {
  const result = capture(() => {
    assertSafePath(sourcePath, sourcePath);
    const namespace = sourcePath[0];
    if (namespace === undefined)
      fail('invalid-path', sourcePath, 'A source namespace is required.');
    if (Object.hasOwn(project.document.variables ?? {}, namespace))
      return {
        ...project,
        document: {
          ...project.document,
          variables: setCatalogPath(project.document.variables ?? {}, sourcePath, value),
        },
      };
    if (namespace === 'copy') {
      if (sourcePath.length === 1) {
        if (value === null || typeof value !== 'object' || Array.isArray(value))
          fail('invalid-catalog', sourcePath, 'A catalog must be an object.');
        return { ...project, catalogs: { ...project.catalogs, [locale]: value } };
      }
      const changed = setCatalogValue(project, locale, sourcePath.slice(1), value, registry);
      if (!changed.ok)
        fail(
          'invalid-catalog-value',
          sourcePath,
          changed.errors.map((issue) => issue.message).join('; ')
        );
      return changed.value;
    }
    return { ...project, context: setCatalogPath(project.context, sourcePath, value) };
  });
  return result.ok ? parseProject(result.value, registry) : result;
}
