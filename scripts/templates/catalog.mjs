import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inside, readJson } from './files.mjs';

const CATALOG_VERSION = 1;
import { TEMPLATE_ID_PATTERN as ID } from './identities.mjs';
export async function readTemplateCatalog(root) {
  const directory = path.join(root, 'packages/templates');
  const catalog = readJson(path.join(directory, 'catalog.json'));
  if (catalog.version !== CATALOG_VERSION || !Array.isArray(catalog.templates))
    throw new Error('Unsupported template catalog.');
  const seen = new Set();
  const entries = [];
  for (const entry of catalog.templates) {
    if (!entry || typeof entry.id !== 'string' || !ID.test(entry.id) || seen.has(entry.id))
      throw new Error('Invalid or duplicate template ID.');
    if (
      !/^[a-f0-9]{40}$/u.test(entry.origin?.commit ?? '') ||
      !entry.origin?.path ||
      entry.origin.path.includes('..')
    )
      throw new Error('Template origin needs an exact commit and source path.');
    seen.add(entry.id);
    const source = path.join(directory, entry.id);
    const manifest = readJson(path.join(source, 'package.json'));
    if (manifest.workspaceKind !== entry.kind)
      throw new Error('Template kind disagrees with manifest.');
    const configFile = path.join(source, 'template.config.mjs');
    const config = existsSync(configFile)
      ? (await import(pathToFileURL(configFile).href)).default
      : {};
    const type = config.type ?? (entry.kind.endsWith('-app') ? 'app' : 'library');
    if (!['app', 'library'].includes(type)) throw new Error('Unsupported template type.');
    const destination = config.destination ?? entry.destination;
    const pattern =
      type === 'app' ? /^apps\/[a-z][a-z0-9-]*$/u : /^packages\/shared\/[a-z][a-z0-9-]*$/u;
    if (!pattern.test(destination)) throw new Error('Invalid template destination.');
    if (config.initialize) {
      const hook = inside(source, config.initialize);
      if (!existsSync(hook)) throw new Error('Missing template initializer.');
    }
    if (
      config.requires &&
      (!Array.isArray(config.requires) ||
        !config.requires.every((id) => typeof id === 'string' && ID.test(id)))
    )
      throw new Error('Invalid required templates.');
    if (
      config.packages !== undefined &&
      (!Array.isArray(config.packages) ||
        !config.packages.every((name) => typeof name === 'string') ||
        new Set(config.packages).size !== config.packages.length)
    )
      throw new Error('Invalid template delivery packages.');
    entries.push({ ...entry, type, destination, source, manifest, config });
  }
  return entries;
}
