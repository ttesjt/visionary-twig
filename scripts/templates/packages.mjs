import { existsSync, readdirSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  DEPENDENCY_GROUPS,
  layerViolation,
  readAdapterProviderPackages,
  isProviderPackage,
} from '../lib/workspace-layers.mjs';
import { readJson } from './files.mjs';

export function readAvailablePackages(root, scope) {
  const packages = new Map();
  for (const layer of ['shared', 'site', 'adapters']) {
    const parent = path.join(root, 'packages', layer);
    if (!existsSync(parent)) continue;
    for (const directory of readdirSync(parent, { withFileTypes: true })) {
      const source = path.join(parent, directory.name);
      if (directory.isSymbolicLink()) throw new Error('Source symlinks are unsupported: ' + source);
      if (!directory.isDirectory() || !existsSync(path.join(source, 'package.json'))) continue;
      const manifest = readJson(path.join(source, 'package.json'));
      if (
        typeof manifest.name !== 'string' ||
        !/^@[a-z0-9-]+\/[a-z][a-z0-9-]*$/u.test(manifest.name)
      )
        throw new Error('Invalid package identity: ' + source);
      if (packages.has(manifest.name))
        throw new Error('Duplicate source package: ' + manifest.name);
      packages.set(manifest.name, {
        source,
        manifest,
        layer: layer === 'adapters' ? 'adapter' : layer,
        destination: 'packages/' + layer + '/' + directory.name,
        packageName: scope + '/' + manifest.name.split('/')[1],
      });
    }
  }
  return packages;
}
/** Resolve actual dependency ownership, including test, peer and optional contracts. */
export function packageClosure(root, available, templates, extraPackages = []) {
  const providers = readAdapterProviderPackages(root);
  const selected = new Map();
  const walking = new Set();
  function visit(entry) {
    const name = entry.manifest.name;
    if (walking.has(name)) throw new Error('Workspace dependency cycle: ' + name);
    if (selected.has(name)) return;
    walking.add(name);
    for (const group of DEPENDENCY_GROUPS) {
      for (const [dependency, version] of Object.entries(entry.manifest[group] ?? {})) {
        if (typeof version !== 'string')
          throw new Error('Invalid dependency version: ' + dependency);
        if (
          ['shared', 'site', 'template'].includes(entry.layer) &&
          isProviderPackage(dependency, providers)
        )
          throw new Error('Provider SDKs cannot be cloned into neutral templates: ' + dependency);
        if (!version.startsWith('workspace:')) continue;
        const target = available.get(dependency);
        if (!target) throw new Error('Missing workspace dependency: ' + dependency);
        const violation = layerViolation(entry.layer, target.layer);
        if (violation) throw new Error(name + ': ' + violation + ': ' + dependency);
        visit(target);
      }
    }
    walking.delete(name);
    if (entry.layer !== 'template') selected.set(name, entry);
  }
  for (const entry of templates) visit({ ...entry, layer: 'template' });
  for (const name of extraPackages) {
    const entry = available.get(name);
    if (!entry) throw new Error('Unknown delivery package: ' + name);
    visit(entry);
  }
  return [...selected.values()];
}
/** Existing package directories are ownership boundaries, never update targets. */
export function checkReusablePackage(target, entry, expectedManifest) {
  const file = path.join(target, 'package.json');
  if (lstatSync(target).isSymbolicLink() || !existsSync(file) || lstatSync(file).isSymbolicLink())
    throw new Error('Existing package cannot be reused: ' + entry.destination);
  const current = readJson(file);
  for (const key of ['name', 'version', 'workspaceKind'])
    if (!isDeepStrictEqual(current[key], expectedManifest[key]))
      throw new Error('Incompatible existing package ' + entry.destination + ': ' + key);
  // API and dependency declarations are the reusable contract. User implementations stay owned by the target.
  for (const key of ['exports', ...DEPENDENCY_GROUPS, 'workspaceEntrypoints'])
    if (!isDeepStrictEqual(current[key] ?? {}, expectedManifest[key] ?? {}))
      throw new Error('Incompatible existing package ' + entry.destination + ': ' + key);
}
