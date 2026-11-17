import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { WORKSPACE_GROUPS } from '../lib/workspace-layers.mjs';
import { DEPENDENCY_GROUPS, discoverWorkspaces } from '../lib/workspace-discovery.mjs';
export const PACKAGE_GROUPS = WORKSPACE_GROUPS.filter((group) => group.location === 'packages');

/** Select the workspace libraries required by the targets. Tests can also build the target libraries. */
export function dependencyFilters(root, targets, { includeTargets = false } = {}) {
  const packages = new Map(
    discoverWorkspaces(root, PACKAGE_GROUPS).map((entry) => [entry.manifest.name, entry])
  );
  const selected = new Set();
  function visit(manifest) {
    for (const group of DEPENDENCY_GROUPS)
      for (const name of Object.keys(manifest[group] ?? {})) {
        const entry = packages.get(name);
        if (!entry || selected.has(entry.relative)) continue;
        selected.add(entry.relative);
        visit(entry.manifest);
      }
  }
  for (const target of targets) {
    const manifest =
      target.manifest ??
      JSON.parse(readFileSync(path.join(target.directory, 'package.json'), 'utf8'));
    const entry = packages.get(manifest.name);
    if (includeTargets && entry) selected.add(entry.relative);
    visit(manifest);
  }
  return [...selected].flatMap((relative) => ['--filter', './' + relative]);
}
export function packageCommand(root, apps, action) {
  const filters = dependencyFilters(root, apps);
  return filters.length
    ? pnpmCommand([...filters, ...(action === 'dev' ? ['--parallel'] : []), '--if-present', action])
    : undefined;
}
export async function buildDependencies(root, apps, { env } = {}) {
  const command = packageCommand(root, apps, 'build');
  const code = command ? await runProcesses([command], { cwd: root, env }) : 0;
  if (code) throw new Error('Dependency build failed (' + code + ').');
}
