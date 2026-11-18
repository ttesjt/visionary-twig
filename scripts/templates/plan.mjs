import path from 'node:path';
import { readTemplateCatalog } from './catalog.mjs';
import { selectTemplateSetup } from './setup.mjs';
import { readAvailablePackages, packageClosure } from './packages.mjs';
import {
  packageScope,
  assertAppName,
  DEFAULT_PROJECT_NAME,
  DEFAULT_NODE_PROJECT_NAME,
} from './identities.mjs';
import { FRONTEND_PRESET, NODE_PRESET } from './presets.mjs';
import { NODE_WORKSPACE_GROUPS } from '../lib/workspace-discovery.mjs';

/** Pure source planning; Git is not needed to inspect template provenance. */
export async function planProject(root, options = {}) {
  const preset = options.preset ?? FRONTEND_PRESET;
  const node = preset === NODE_PRESET;
  const catalog = await readTemplateCatalog(root);
  const requested =
    options.templates ??
    (node ? [] : catalog.filter((entry) => entry.type === 'app').map((entry) => entry.id));
  if (!Array.isArray(requested) || new Set(requested).size !== requested.length)
    throw new Error('Choose distinct templates.');
  const entries = new Map(catalog.map((entry) => [entry.id, entry]));
  const visiting = new Set();
  const selected = new Map();
  function select(id) {
    if (visiting.has(id)) throw new Error('Template initialization dependency cycle: ' + id);
    if (selected.has(id)) return;
    const entry = entries.get(id);
    if (!entry) throw new Error('Unknown template: ' + id);
    if (node && entry.kind !== 'node-library')
      throw new Error('The Node preset requires Node library templates.');
    visiting.add(id);
    for (const dependency of entry.config.requires ?? []) select(dependency);
    visiting.delete(id);
    selected.set(id, entry);
  }
  for (const id of requested) select(id);
  const name = options.name ?? (node ? DEFAULT_NODE_PROJECT_NAME : DEFAULT_PROJECT_NAME);
  const scope = packageScope(name);
  const appNames = options.appNames ?? {};
  for (const [id, value] of Object.entries(appNames)) {
    if (selected.get(id)?.type !== 'app')
      throw new Error('App mapping must target a selected app template: ' + id);
    assertAppName(value);
  }
  const templates = [...selected.values()].map((entry) => {
    const destination = node
      ? path.posix.join(NODE_WORKSPACE_GROUPS[0].parent, path.posix.basename(entry.destination))
      : appNames[entry.id]
        ? 'apps/' + appNames[entry.id]
        : entry.destination;
    return {
      ...entry,
      setup: selectTemplateSetup(entry, options.setup),
      destination,
      appId: path.basename(destination),
      packageName: scope + '/' + path.basename(destination),
    };
  });
  if (new Set(templates.map((entry) => entry.destination)).size !== templates.length)
    throw new Error('Colliding template destinations.');
  const available = node ? new Map() : readAvailablePackages(root, scope);
  const extras = templates.flatMap((entry) => entry.config.packages ?? []);
  if (options.allShared)
    extras.push(
      ...[...available.values()]
        .filter((entry) => entry.layer === 'shared')
        .map((entry) => entry.manifest.name)
    );
  const packages = packageClosure(root, available, templates, extras);
  const sitePackageNames = new Set(
    packages.filter((entry) => entry.layer === 'site').map((entry) => entry.packageName)
  );
  for (const entry of templates) {
    if (entry.type === 'app' && sitePackageNames.has(entry.packageName)) {
      entry.packageName += '-app';
    }
  }
  const all = [...packages, ...templates];
  if (new Set([name, ...all.map((entry) => entry.packageName)]).size !== all.length + 1)
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
  return { preset, name, scope, templates, packages, mapping };
}
