import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { copySource, inside, readJson, writeJson } from './files.mjs';

export const WORKSPACE_CONTRACT_VERSION = 1;
export const WORKSPACE_RECORD = '.workspace-template.json';

/** This declaration is the allowlist for user-owned workspace delivery. */
export function readDelivery(root) {
  const definition = readJson(path.join(root, 'scaffolds/monorepo/delivery.json'));
  if (definition.version !== WORKSPACE_CONTRACT_VERSION)
    throw new Error('Unsupported delivery definition.');
  return definition;
}
export function copyWorkspaceFoundation(root, destination) {
  const definition = readDelivery(root);
  for (const file of [...definition.files, ...definition.directories])
    copySource(inside(root, file), inside(destination, file));
  for (const [source, target] of Object.entries(definition.configurations ?? {}))
    copySource(inside(root, source), inside(destination, target));
  for (const [source, target] of Object.entries(definition.documents))
    copySource(inside(root, source), inside(destination, target));
  const scaffold = path.join(root, 'scaffolds/monorepo');
  for (const file of [
    '.npmrc',
    'AGENTS.md',
    'apps/README.md',
    'packages/site/README.md',
    'packages/adapters/README.md',
  ])
    copySource(inside(scaffold, file), inside(destination, file));
}
export function mergeRequirements(target, contribution = {}) {
  for (const group of ['scripts', 'devDependencies', 'catalog']) {
    for (const [key, value] of Object.entries(contribution[group] ?? {})) {
      if (typeof value !== 'string' || !value) throw new Error('Invalid root contribution: ' + key);
      if (target[group][key] !== undefined && target[group][key] !== value)
        throw new Error('Conflicting root contribution: ' + group + '.' + key);
      target[group][key] = value;
    }
  }
}
function usedCatalogs(destination, manifest) {
  const needed = new Set();
  function collect(value) {
    for (const group of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ])
      for (const [name, version] of Object.entries(value[group] ?? {}))
        if (version === 'catalog:') needed.add(name);
  }
  collect(manifest);
  for (const parent of ['apps', 'packages/shared', 'packages/site', 'packages/adapters']) {
    const folder = path.join(destination, parent);
    if (!existsSync(folder)) continue;
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name, 'package.json');
      if (entry.isDirectory() && existsSync(file)) collect(readJson(file));
    }
  }
  return needed;
}
export function writeWorkspaceConfiguration(root, destination, plan, contributions) {
  const manifest = readJson(path.join(root, 'scaffolds/monorepo/package.base.json'));
  const source = readJson(path.join(root, 'package.json'));
  manifest.name = plan.name;
  manifest.packageManager = source.packageManager;
  manifest.engines = source.engines;
  manifest.devDependencies = Object.fromEntries(
    Object.entries(manifest.devDependencies).flatMap(([name, value]) =>
      value.startsWith('workspace:')
        ? plan.mapping.packages[name]
          ? [[plan.mapping.packages[name], value]]
          : []
        : [[name, value]]
    )
  );
  const sourceWorkspace = parse(readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8'));
  const requirements = {
    scripts: manifest.scripts,
    devDependencies: manifest.devDependencies,
    catalog: { ...sourceWorkspace.catalog },
  };
  for (const contribution of contributions) mergeRequirements(requirements, contribution);
  const apps = plan.templates.filter((entry) => entry.type === 'app');
  const primary = apps.find((entry) => entry.config.primary) ?? apps[0];
  if (primary) manifest.workspaceDefaultApp = primary.appId;
  writeJson(path.join(destination, 'package.json'), manifest);
  const workspace = parse(
    readFileSync(path.join(root, 'scaffolds/monorepo/pnpm-workspace.yaml'), 'utf8')
  );
  const needed = usedCatalogs(destination, manifest);
  for (const name of needed)
    if (!requirements.catalog[name]) throw new Error('Missing catalog version: ' + name);
  writeFileSync(
    path.join(destination, 'pnpm-workspace.yaml'),
    stringify({
      ...workspace,
      packageManagerStrictVersion: sourceWorkspace.packageManagerStrictVersion,
      allowBuilds: Object.fromEntries(
        Object.entries(sourceWorkspace.allowBuilds ?? {}).filter(
          ([name]) => needed.has(name) || ['esbuild', 'sharp'].includes(name)
        )
      ),
      catalog: Object.fromEntries(
        [...needed].sort().map((name) => [name, requirements.catalog[name]])
      ),
    })
  );
  const readme = readFileSync(path.join(root, 'scaffolds/monorepo/README.md.template'), 'utf8');
  writeFileSync(
    path.join(destination, 'README.md'),
    readme.replaceAll('{{projectName}}', plan.name)
  );
  mkdirSync(path.join(destination, '.github/workflows'), { recursive: true });
  copySource(
    path.join(root, 'scaffolds/monorepo/ci.yml'),
    path.join(destination, '.github/workflows/ci.yml')
  );
}
