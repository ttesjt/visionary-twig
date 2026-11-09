import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { DEPENDENCY_GROUPS } from '../lib/workspace-layers.mjs';
import { readJson, writeJson } from '../templates/files.mjs';
import { mergeRequirements } from '../templates/delivery.mjs';

/** Extend only declared root requirements; never replace the target's manifest or catalog. */
export function mergeWorkspaceContributions(source, target, plan, contributions) {
  const manifest = readJson(path.join(target, 'package.json'));
  const workspacePath = path.join(target, 'pnpm-workspace.yaml');
  const workspace = parse(readFileSync(workspacePath, 'utf8'));
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
  // SDK build permissions enter only with adapters explicitly delivered by this task.
  if (plan.packages.some((entry) => entry.layer === 'adapter'))
    for (const [name, enabled] of Object.entries(input.allowBuilds ?? {})) {
      if (!enabled) continue;
      const current = (workspace.allowBuilds ??= {})[name];
      if (current === false) throw new Error('Target explicitly disallows build: ' + name);
      workspace.allowBuilds[name] = enabled;
    }
  writeJson(path.join(target, 'package.json'), manifest);
  writeFileSync(workspacePath, stringify(workspace));
}
