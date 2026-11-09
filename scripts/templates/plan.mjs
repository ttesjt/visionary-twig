import { readAdapterProviderPackages, isProviderPackage } from '../lib/workspace-layers.mjs';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { readTemplateCatalog } from './catalog.mjs';
import { readJson } from './files.mjs';

const DEPENDENCY_GROUPS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
function scopedName(value) {
  const match = /^(@[a-z0-9][a-z0-9-]*)\/([a-z][a-z0-9-]*)$/u.exec(value);
  if (!match) throw new Error('Project name must be scoped, for example @example/frontend.');
  return match[1];
}
export async function planProject(root, options = {}) {
  const catalog = await readTemplateCatalog(root);
  const providerPackages = readAdapterProviderPackages(root);
  const requested =
    options.templates ?? catalog.filter((entry) => entry.type === 'app').map((entry) => entry.id);
  if (!requested.length || new Set(requested).size !== requested.length)
    throw new Error('Choose distinct templates.');
  const entries = new Map(catalog.map((entry) => [entry.id, entry]));
  const visiting = new Set();
  const selected = new Map();
  function select(id) {
    if (visiting.has(id)) throw new Error('Template initialization dependency cycle: ' + id);
    if (selected.has(id)) return;
    const entry = entries.get(id);
    if (!entry) throw new Error('Unknown template: ' + id);
    visiting.add(id);
    for (const dependency of entry.config.requires ?? []) select(dependency);
    visiting.delete(id);
    selected.set(id, entry);
  }
  for (const id of requested) select(id);
  const name = options.name ?? '@frontend/starter';
  const scope = scopedName(name);
  const appNames = options.appNames ?? {};
  for (const id of Object.keys(appNames)) {
    if (selected.get(id)?.type !== 'app')
      throw new Error('App mapping must target a selected app template: ' + id);
    if (!/^[a-z][a-z0-9-]*$/u.test(appNames[id])) throw new Error('Invalid app destination ID.');
  }
  const templates = [...selected.values()].map((entry) => {
    const destination = appNames[entry.id] ? 'apps/' + appNames[entry.id] : entry.destination;
    return {
      ...entry,
      destination,
      appId: path.basename(destination),
      packageName: scope + '/' + path.basename(destination),
    };
  });
  const destinations = templates.map((entry) => entry.destination);
  if (new Set(destinations).size !== destinations.length)
    throw new Error('Colliding template destinations.');
  const shared = new Map();
  for (const layer of ['shared', 'site']) {
    const packageRoot = path.join(root, 'packages', layer);
    if (!existsSync(packageRoot)) continue;
    for (const entry of readdirSync(packageRoot, { withFileTypes: true })) {
      const source = path.join(packageRoot, entry.name);
      if (!entry.isDirectory() || !existsSync(path.join(source, 'package.json'))) continue;
      const manifest = readJson(path.join(source, 'package.json'));
      shared.set(manifest.name, {
        source,
        layer,
        manifest,
        destination: 'packages/' + layer + '/' + entry.name,
        packageName: scope + '/' + manifest.name.split('/')[1],
      });
    }
  }
  const packages = new Map();
  const walking = new Set();
  function dependencies(manifest) {
    for (const group of DEPENDENCY_GROUPS)
      for (const [dependency, version] of Object.entries(manifest[group] ?? {})) {
        if (isProviderPackage(dependency, providerPackages))
          throw new Error('Provider SDKs cannot be cloned into neutral templates: ' + dependency);
        if (!version.startsWith('workspace:')) continue;
        if (walking.has(dependency)) throw new Error('Shared dependency cycle: ' + dependency);
        if (packages.has(dependency)) continue;
        const entry = shared.get(dependency);
        if (!entry)
          throw new Error(
            'Only shared and site workspace dependencies can be cloned: ' + dependency
          );
        walking.add(dependency);
        dependencies(entry.manifest);
        walking.delete(dependency);
        packages.set(dependency, entry);
      }
  }
  for (const entry of templates) dependencies(entry.manifest);
  const siteNames = new Set(
    [...packages.values()]
      .filter((entry) => entry.layer === 'site')
      .map((entry) => entry.packageName)
  );
  for (const entry of templates)
    if (entry.type === 'app' && siteNames.has(entry.packageName)) entry.packageName += '-app';
  const all = [...packages.values(), ...templates];
  const outputNames = [name, ...all.map((entry) => entry.packageName)];
  if (new Set(outputNames).size !== outputNames.length)
    throw new Error('Colliding output package names.');
  const mapping = Object.freeze({
    packages: Object.freeze(
      Object.fromEntries(all.map((entry) => [entry.manifest.name, entry.packageName]))
    ),
    directories: Object.freeze(
      Object.fromEntries(
        all.map((entry) => [
          path.relative(root, entry.source).split(path.sep).join('/'),
          entry.destination,
        ])
      )
    ),
  });
  return { name, scope, templates, packages: [...packages.values()], mapping };
}
