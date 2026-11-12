import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { readJson } from './files.mjs';
import { pruneLockfile } from './lockfile-graph.mjs';
import { NODE_PRESET } from './presets.mjs';

const DEPENDENCY_GROUPS = ['dependencies', 'devDependencies', 'optionalDependencies'];
// Vitest and coverage share a peer graph. The source snapshots include DOM test
// environments, so resolve this pair again against the Node target's manifest.
const NODE_TEST_PEERS = new Set(['vitest', '@vitest/coverage-v8']);
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
          if (plan.preset === NODE_PRESET && NODE_TEST_PEERS.has(name)) return [];
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
    stringify(
      pruneLockfile({
        ...lock,
        ...(Object.keys(catalogs).length ? { catalogs } : {}),
        importers,
      })
    )
  );
}

/** Add tested resolutions for new workspaces without replacing existing target importers. */
export function extendLockfile(source, target, plan, entries) {
  const filename = path.join(target, 'pnpm-lock.yaml');
  const previous = parse(readFileSync(filename, 'utf8'));
  seedLockfile(source, target, plan);
  const seed = parse(readFileSync(filename, 'utf8'));
  const additions = Object.fromEntries(
    entries.flatMap((entry) =>
      seed.importers[entry.destination]
        ? [[entry.destination, seed.importers[entry.destination]]]
        : []
    )
  );
  writeFileSync(
    filename,
    stringify({
      ...previous,
      catalogs: Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(seed.catalogs ?? {}),
            ...Object.keys(previous.catalogs ?? {}),
          ]),
        ].map((key) => [key, { ...seed.catalogs?.[key], ...previous.catalogs?.[key] }])
      ),
      importers: { ...previous.importers, ...additions },
      packages: { ...seed.packages, ...previous.packages },
      snapshots: { ...seed.snapshots, ...previous.snapshots },
    })
  );
}
