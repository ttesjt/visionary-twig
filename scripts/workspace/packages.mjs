import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { WORKSPACE_GROUPS, DEPENDENCY_GROUPS } from '../lib/workspace-layers.mjs';
const PACKAGE_GROUPS = WORKSPACE_GROUPS.filter((group) => group.location === 'packages').map(
  (group) => group.parent
);
/** Aggregate library build; source templates are runnable hosts, not libraries. */
export function packageBuildArguments(root) {
  const filters = PACKAGE_GROUPS.filter((parent) => existsSync(path.join(root, parent))).flatMap(
    (parent) => ['--filter', './' + parent + '/*']
  );
  return filters.length ? [...filters, '--if-present', 'build'] : undefined;
}
/** Build/watch only the dependency closure of the selected hosts. */
export function dependencyFilters(root, apps) {
  const packages = new Map();
  for (const parent of PACKAGE_GROUPS) {
    const directory = path.join(root, parent);
    if (!existsSync(directory)) continue;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = parent + '/' + entry.name;
      const file = path.join(root, relative, 'package.json');
      if (entry.isDirectory() && existsSync(file)) {
        const manifest = JSON.parse(readFileSync(file, 'utf8'));
        packages.set(manifest.name, { manifest, relative });
      }
    }
  }
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
  for (const app of apps)
    visit(JSON.parse(readFileSync(path.join(app.directory, 'package.json'), 'utf8')));
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
