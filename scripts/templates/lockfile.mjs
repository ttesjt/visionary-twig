import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { readJson } from './files.mjs';

const DEPENDENCY_GROUPS = ['dependencies', 'devDependencies', 'optionalDependencies'];
/** Reuse tested resolutions; the single initial install reconciles new hook requirements. */
export function seedLockfile(source, destination, plan) {
  const file = path.join(source, 'pnpm-lock.yaml');
  if (!existsSync(file)) return;
  const lock = parse(readFileSync(file, 'utf8'));
  const directoriesByName = new Map(
    [...plan.packages, ...plan.templates].map((entry) => [entry.manifest.name, entry.destination])
  );
  function remapImporter(importer, directory) {
    const manifest = readJson(path.join(destination, directory, 'package.json'));
    const updated = globalThis.structuredClone(importer ?? {});
    for (const group of DEPENDENCY_GROUPS) {
      updated[group] = Object.fromEntries(
        Object.entries(updated[group] ?? {}).flatMap(([before, value]) => {
          const name = plan.mapping.packages[before] ?? before;
          if (!manifest[group]?.[name]) return [];
          const target = directoriesByName.get(before);
          return [
            [
              name,
              target
                ? {
                    ...value,
                    version: 'link:' + (path.posix.relative(directory, target) || '.'),
                  }
                : value,
            ],
          ];
        })
      );
      if (!Object.keys(updated[group]).length) delete updated[group];
    }
    return updated;
  }
  const importers = { '.': remapImporter(lock.importers?.['.'], '.') };
  for (const [before, after] of Object.entries(plan.mapping.directories)) {
    const importer = lock.importers?.[before];
    if (importer) importers[after] = remapImporter(importer, after);
  }
  // Generated workspaces may remove providers or select different catalog requirements.
  // Keep only resolutions matching their own configuration, never the source catalog.
  const workspace = parse(readFileSync(path.join(destination, 'pnpm-workspace.yaml'), 'utf8'));
  const configured = { default: workspace.catalog ?? {}, ...(workspace.catalogs ?? {}) };
  const catalogs = Object.fromEntries(
    Object.entries(lock.catalogs ?? {}).flatMap(([name, resolutions]) => {
      const entries = Object.fromEntries(
        Object.entries(resolutions).filter(
          ([dependency, resolution]) =>
            Object.hasOwn(configured[name] ?? {}, dependency) &&
            configured[name][dependency] === resolution.specifier
        )
      );
      return Object.keys(entries).length ? [[name, entries]] : [];
    })
  );
  delete lock.catalogs;
  writeFileSync(
    path.join(destination, 'pnpm-lock.yaml'),
    stringify({
      ...lock,
      ...(Object.keys(catalogs).length ? { catalogs } : {}),
      importers,
    })
  );
}
