import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DEPENDENCY_GROUPS } from './workspace-discovery.mjs';
export { DEPENDENCY_GROUPS } from './workspace-discovery.mjs';
export const WORKSPACE_GROUPS = [
  { parent: 'apps', location: 'apps', layer: 'app' },
  { parent: 'packages/shared', location: 'packages', layer: 'shared' },
  { parent: 'packages/site', location: 'packages', layer: 'site' },
  { parent: 'packages/adapters', location: 'packages', layer: 'adapter' },
  {
    parent: 'packages/templates',
    location: 'apps',
    layer: 'template',
    accept: (manifest) => manifest.workspaceKind === 'next-app',
  },
];
export function layerViolation(from, to) {
  if (to === 'adapter' && ['shared', 'site', 'template'].includes(from))
    return 'core and templates cannot depend on adapters';
  if (from === 'adapter' && ['site', 'app', 'template'].includes(to))
    return 'adapters can only depend on neutral shared packages or other adapters';
  if (from === 'shared' && to === 'site') return 'shared packages cannot depend on site packages';
  if (to === 'template') return 'templates cannot be runtime dependencies';
  if (['shared', 'site'].includes(from) && to === 'app')
    return 'packages cannot depend on application hosts';
  return null;
}
export function readAdapterProviderPackages(root) {
  const directory = path.join(root, 'packages/adapters');
  if (!existsSync(directory)) return new Set();
  return new Set(
    readdirSync(directory).flatMap((name) => {
      const file = path.join(directory, name, 'package.json');
      if (!existsSync(file)) return [];
      const manifest = JSON.parse(readFileSync(file, 'utf8'));
      const packages = manifest.workspaceAdapter?.providerPackages ?? [];
      if (!Array.isArray(packages) || !packages.every((entry) => typeof entry === 'string'))
        throw new Error('Invalid adapter providerPackages metadata.');
      return packages;
    })
  );
}
export function isProviderPackage(name, providerPackages) {
  return name === 'wrangler' || name.startsWith('@cloudflare/') || providerPackages.has(name);
}
export function checkAdapterGraph(workspaces, providerPackages) {
  const byName = new Map(workspaces.map((workspace) => [workspace.manifest.name, workspace]));
  const errors = [];
  for (const workspace of workspaces) {
    if (!['shared', 'site', 'template'].includes(workspace.layer)) continue;
    const visited = new Set();
    function visit(name, chain) {
      if (visited.has(name)) return;
      visited.add(name);
      const current = byName.get(name);
      if (current?.layer === 'adapter' || isProviderPackage(name, providerPackages)) {
        errors.push(
          workspace.manifest.name +
            ': forbidden adapter dependency chain: ' +
            [...chain, name].join(' -> ')
        );
        return;
      }
      for (const group of DEPENDENCY_GROUPS)
        for (const dependency of Object.keys(current?.manifest[group] ?? {}))
          visit(dependency, [...chain, name]);
    }
    visit(workspace.manifest.name, []);
  }
  return errors;
}
