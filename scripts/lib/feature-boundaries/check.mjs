import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { readFeatures } from './declarations.mjs';
import { contains } from '../module-targets.mjs';
import { createSourceResolver } from './resolution.mjs';

const isCode = (file) => /\.[cm]?[jt]sx?$/.test(file);
const isSharedPublicDependency = (workspace, feature, file) =>
  workspace &&
  feature &&
  workspace !== feature.workspace &&
  feature.sharedEntries.has(file) &&
  feature.publicEntries.has(file);
/** Recursive source ownership is explicit. Same-scope modules remain free to collaborate. */
export function checkFeatureBoundaries(root, workspaces, byName) {
  const { features, errors } = readFeatures(workspaces);
  if (!features.length) return errors;
  const owner = (file) => features.find((feature) => contains(feature.directory, file));
  const resolve = createSourceResolver(workspaces, byName);
  const graph = new Map();
  const sharedStarts = new Set(features.flatMap((feature) => [...feature.sharedEntries]));
  const report = (file, message) => errors.push(path.relative(root, file) + ': ' + message);
  for (const workspace of workspaces) {
    for (const filename of workspace.files) {
      if (!isCode(filename) || filename.endsWith('next-env.d.ts')) continue;
      const file = realpathSync(filename);
      const references = ts.preProcessFile(readFileSync(file, 'utf8'), true, true).importedFiles;
      const targets = new Set();
      for (const { fileName: specifier } of references) {
        let resolved;
        try {
          resolved = resolve(workspace, file, specifier);
        } catch (error) {
          report(file, 'feature import resolution failed: ' + error.message);
          continue;
        }
        for (const target of resolved) {
          targets.add(target);
          const from = owner(file);
          const to = owner(target);
          if (from === to) continue;
          if (from && (!to || contains(to.directory, from.directory))) {
            if (to && !to.sharedEntries.has(target))
              report(file, 'feature may consume ancestor shared entries only: ' + specifier);
            else sharedStarts.add(target);
            continue;
          }
          // Across packages, only explicitly neutral shared public capabilities can
          // be consumed by another feature. Package/layer checks still apply.
          if (from && isSharedPublicDependency(from.workspace, to, target)) {
            sharedStarts.add(target);
          } else if (from && to && !contains(from.directory, to.directory)) {
            report(file, 'unrelated features cannot depend on each other: ' + specifier);
            continue;
          }
          for (const feature of features) {
            if (!contains(feature.directory, target) || contains(feature.directory, file)) continue;
            if (!feature.publicEntries.has(target))
              report(
                file,
                'feature access must use a declared public entry of ' +
                  feature.label +
                  ': ' +
                  specifier
              );
          }
        }
      }
      graph.set(file, { workspace, targets });
    }
  }
  // A common helper cannot turn into an indirect bridge back into a feature.
  for (const start of sharedStarts) {
    const scope = owner(start);
    const workspace = scope?.workspace ?? graph.get(start)?.workspace;
    const visited = new Set();
    const pending = [[start, [start]]];
    while (pending.length) {
      const [file, trail] = pending.pop();
      if (visited.has(file)) continue;
      visited.add(file);
      const current = owner(file);
      if (current && (!scope || !contains(current.directory, scope.directory))) {
        // Every declared shared entry is independently traversed from its own
        // scope. Stop at an approved cross-package entry, not its implementation;
        // that entry's traversal still rejects any specialized feature it reaches.
        if (isSharedPublicDependency(workspace, current, file)) continue;
        report(
          start,
          'shared capability reaches a feature: ' +
            trail.map((value) => path.relative(root, value)).join(' → ')
        );
        continue;
      }
      for (const target of graph.get(file)?.targets ?? [])
        pending.push([target, [...trail, target]]);
    }
  }
  return errors;
}
