import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, parseDocument } from 'yaml';
import { DEPENDENCY_GROUPS } from '../lib/workspace-layers.mjs';
import { readJson, writeJson } from '../templates/files.mjs';
import { pruneLockfile } from '../templates/lockfile-graph.mjs';
import { mergeRequirements } from '../templates/delivery.mjs';

/** Extend only declared root requirements; never replace the target's manifest or catalog. */
export function mergeWorkspaceContributions(source, target, plan, contributions) {
  const manifest = readJson(path.join(target, 'package.json'));
  const workspacePath = path.join(target, 'pnpm-workspace.yaml');
  const document = parseDocument(readFileSync(workspacePath, 'utf8'));
  const workspace = document.toJSON();
  const input = parse(readFileSync(path.join(source, 'pnpm-workspace.yaml'), 'utf8'));
  const requirements = {
    scripts: (manifest.scripts ??= {}),
    devDependencies: (manifest.devDependencies ??= {}),
    catalog: (workspace.catalog ??= {}),
  };
  for (const contribution of contributions) mergeRequirements(requirements, contribution);
  for (const entry of [...plan.packages, ...plan.templates]) {
    const next = readJson(path.join(target, entry.destination, 'package.json'));
    for (const group of DEPENDENCY_GROUPS) {
      for (const [name, value] of Object.entries(next[group] ?? {})) {
        if (!value.startsWith('catalog:')) continue;
        const id = value.slice('catalog:'.length);
        const selected = id
          ? (input.catalogs?.[id] ?? {})
          : {
              ...input.catalog,
              ...Object.assign({}, ...contributions.map((item) => item.catalog ?? {})),
            };
        const version = selected[name];
        if (!version) throw new Error('Missing source catalog version: ' + name);
        const versions = id ? ((workspace.catalogs ??= {})[id] ??= {}) : workspace.catalog;
        if (versions[name] !== undefined && versions[name] !== version)
          throw new Error('Conflicting target catalog version: ' + name);
        versions[name] = version;
      }
    }
  }
  if (!manifest.workspaceDefaultApp) {
    const primary = plan.templates.find((entry) => entry.type === 'app');
    if (primary) manifest.workspaceDefaultApp = primary.appId;
  }
  writeJson(path.join(target, 'package.json'), manifest);
  for (const [name, version] of Object.entries(workspace.catalog ?? {}))
    document.setIn(['catalog', name], version);
  for (const [id, catalog] of Object.entries(workspace.catalogs ?? {}))
    for (const [name, version] of Object.entries(catalog))
      document.setIn(['catalogs', id, name], version);
  writeFileSync(workspacePath, document.toString());
}

/** Copy SDK build permissions only when the selected resolution graph actually needs them. */
export function mergeAdapterBuildPermissions(source, target, plan) {
  if (!plan.packages.some((entry) => entry.layer === 'adapter')) return;
  const input = parse(readFileSync(path.join(source, 'pnpm-workspace.yaml'), 'utf8'));
  const file = path.join(target, 'pnpm-workspace.yaml');
  const document = parseDocument(readFileSync(file, 'utf8'));
  const workspace = document.toJSON();
  const sourceLock = parse(readFileSync(path.join(source, 'pnpm-lock.yaml'), 'utf8'));
  const adapterImporters = plan.packages
    .filter((entry) => entry.layer === 'adapter')
    .map((entry) => path.relative(source, entry.source).split(path.sep).join('/'));
  const lock = pruneLockfile({
    ...sourceLock,
    importers: Object.fromEntries(
      adapterImporters.flatMap((name) =>
        sourceLock.importers[name] ? [[name, sourceLock.importers[name]]] : []
      )
    ),
  });
  for (const [name, enabled] of Object.entries(input.allowBuilds ?? {})) {
    if (!enabled || !Object.keys(lock.packages ?? {}).some((key) => key.startsWith(name + '@')))
      continue;
    const current = (workspace.allowBuilds ??= {})[name];
    if (current === false) throw new Error('Target explicitly disallows build: ' + name);
    document.setIn(['allowBuilds', name], enabled);
  }
  writeFileSync(file, document.toString());
}
