import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { DEPENDENCY_GROUPS, NODE_WORKSPACE_GROUPS } from '../lib/workspace-discovery.mjs';
import { NODE_PRESET, scaffoldDirectory } from './presets.mjs';
import { copySource, inside, readJson, writeJson } from './files.mjs';

export const WORKSPACE_CONTRACT_VERSION = 1;
export const WORKSPACE_RECORD = '.workspace-template.json';

/** This declaration is the allowlist for user-owned workspace delivery. */
export function readDelivery(root, preset) {
  const definition = readJson(path.join(scaffoldDirectory(root, preset), 'delivery.json'));
  if (definition.version !== WORKSPACE_CONTRACT_VERSION)
    throw new Error('Unsupported delivery definition.');
  return definition;
}
export function copyWorkspaceFoundation(root, destination, preset) {
  const definition = readDelivery(root, preset);
  for (const file of [...definition.files, ...definition.directories])
    copySource(inside(root, file), inside(destination, file));
  for (const [source, target] of Object.entries(definition.configurations ?? {}))
    copySource(inside(root, source), inside(destination, target));
  for (const [source, target] of Object.entries(definition.documents))
    copySource(inside(root, source), inside(destination, target));
  copySource(path.join(root, 'scaffolds/monorepo/.npmrc'), path.join(destination, '.npmrc'));
  copySource(
    path.join(scaffoldDirectory(root, preset), 'AGENTS.md'),
    path.join(destination, 'AGENTS.md')
  );
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
function usedCatalogs(destination, manifest, plan) {
  const needed = new Set();
  function collect(value) {
    for (const group of DEPENDENCY_GROUPS)
      for (const [name, version] of Object.entries(value[group] ?? {}))
        if (version === 'catalog:') needed.add(name);
  }
  collect(manifest);
  for (const entry of [...plan.packages, ...plan.templates])
    collect(readJson(path.join(destination, entry.destination, 'package.json')));
  return needed;
}
export function writeWorkspaceConfiguration(root, destination, plan, contributions) {
  const scaffold = scaffoldDirectory(root, plan.preset);
  const node = plan.preset === NODE_PRESET;
  const manifest = readJson(path.join(scaffold, 'package.base.json'));
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
  const workspace = node
    ? { packages: NODE_WORKSPACE_GROUPS.map(({ parent }) => parent + '/*') }
    : parse(readFileSync(path.join(scaffold, 'pnpm-workspace.yaml'), 'utf8'));
  const needed = usedCatalogs(destination, manifest, plan);
  for (const name of needed)
    if (!requirements.catalog[name]) throw new Error('Missing catalog version: ' + name);
  writeFileSync(
    path.join(destination, 'pnpm-workspace.yaml'),
    stringify({
      ...workspace,
      packageManagerStrictVersion: sourceWorkspace.packageManagerStrictVersion,
      allowBuilds: Object.fromEntries(
        Object.entries(sourceWorkspace.allowBuilds ?? {}).filter(
          ([name]) => needed.has(name) || name === 'esbuild' || (!node && name === 'sharp')
        )
      ),
      catalog: Object.fromEntries(
        [...needed].sort().map((name) => [name, requirements.catalog[name]])
      ),
    })
  );
  const readme = readFileSync(path.join(scaffold, 'README.md.template'), 'utf8');
  writeFileSync(
    path.join(destination, 'README.md'),
    readme.replaceAll('{{projectName}}', plan.name)
  );
  mkdirSync(path.join(destination, '.github/workflows'), { recursive: true });
  copySource(path.join(scaffold, 'ci.yml'), path.join(destination, '.github/workflows/ci.yml'));
}
