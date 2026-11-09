import { capture } from '../document/errors.js';
import type { ContentIssue, ContentResult } from '../document/errors.js';
import { contentLimits } from '../document/limits.js';
import type { ContentData, DocumentOptions } from '../document/types.js';
import { snapshotJson } from '../json/snapshot.js';
import type { ContentRegistry } from './contracts.js';
import { inspectData } from './inspect-data.js';
import type { InspectedData } from './inspect-data.js';

export function propsIssues(
  inspected: InspectedData,
  registry: ContentRegistry
): readonly ContentIssue[] {
  const issues: ContentIssue[] = [];
  const rootProps = inspected.data.root.props ?? {};
  const rootIssues =
    registry.validateRootProps?.(rootProps) ??
    Object.keys(rootProps).map((key) => ({
      path: [key],
      message: 'Root props require a registered validator.',
    }));
  for (const issue of rootIssues) {
    issues.push({
      code: 'invalid-props',
      path: ['data', 'root', 'props', ...issue.path],
      message: issue.message,
    });
  }
  for (const { node, contract, path } of inspected.nodes.values()) {
    for (const issue of contract.validateProps(node.props)) {
      issues.push({
        code: 'invalid-props',
        nodeId: node.props.id,
        path: [...path, 'props', ...issue.path],
        message: issue.message,
      });
    }
  }
  if (!issues.length) {
    for (const issue of registry.validateData?.(inspected.data) ?? []) {
      issues.push({ code: 'invalid-data', path: ['data', ...issue.path], message: issue.message });
    }
  }
  return issues;
}

/** Inspect a final data tree on its own budget, without raw variables or document envelope. */
export function inspectResolvedData(
  input: unknown,
  registry: ContentRegistry,
  options: DocumentOptions = {}
): ContentResult<InspectedData> {
  const limits = contentLimits(options.limits);
  const result = capture(() => inspectData(snapshotJson(input, limits), registry, limits));
  if (!result.ok) return result;
  const errors = propsIssues(result.value, registry);
  return errors.length ? { ok: false, errors } : result;
}

/** Checks tree structure and final props; does not retrieve content or resolve bindings. */
export function validateResolvedData(
  input: unknown,
  registry: ContentRegistry,
  options: DocumentOptions = {}
): ContentResult<ContentData> {
  const result = inspectResolvedData(input, registry, options);
  return result.ok ? { ok: true, value: result.value.data } : result;
}
