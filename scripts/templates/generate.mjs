import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  assertNewDestination,
  copySource,
  inside,
  rewritePackageNames,
  targetFiles,
} from './files.mjs';
import { seedLockfile } from './lockfile.mjs';
import { formatProject } from './format.mjs';
import { planProject } from './plan.mjs';
import { writeRootProject } from './root-project.mjs';
import { copyWorkspaceFoundation } from './delivery.mjs';

export async function createTemplateProject(root, destination, options = {}) {
  const plan = await planProject(root, options);
  assertNewDestination(destination);
  for (const source of [
    path.join(root, 'scripts'),
    path.join(root, 'tooling'),
    ...plan.packages.map((entry) => entry.source),
    ...plan.templates.map((entry) => entry.source),
  ]) {
    const relative = path.relative(source, destination);
    if (!relative.startsWith('..') && !path.isAbsolute(relative))
      throw new Error('Destination cannot be inside copied source.');
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  mkdirSync(destination);
  try {
    copyWorkspaceFoundation(root, destination);
    for (const entry of [...plan.packages, ...plan.templates]) {
      copySource(entry.source, inside(destination, entry.destination), [
        'template.config.mjs',
        'template',
        'README.md',
      ]);
    }
    // Package READMEs are public exports; app README describes the instantiated host.
    for (const entry of [...plan.packages, ...plan.templates]) {
      if (existsSync(path.join(entry.source, 'README.md')))
        copySource(
          path.join(entry.source, 'README.md'),
          path.join(destination, entry.destination, 'README.md')
        );
    }
    for (const entry of plan.templates)
      for (const [target, source] of Object.entries(entry.config.files ?? {}))
        copySource(
          inside(entry.source, source),
          inside(path.join(destination, entry.destination), target)
        );
    const names = Object.entries(plan.mapping.packages).sort(([a], [b]) => b.length - a.length);
    rewritePackageNames(destination, names);
    const contributions = [];
    for (const entry of plan.templates) {
      contributions.push(entry.config.root ?? {});
      if (!entry.config.initialize) continue;
      const { initialize } = await import(
        pathToFileURL(inside(entry.source, entry.config.initialize)).href
      );
      if (typeof initialize !== 'function')
        throw new Error('Initializer must export initialize(context).');
      const targetDirectory = inside(destination, entry.destination);
      contributions.push(
        (await initialize(
          Object.freeze({
            id: entry.id,
            appId: entry.appId,
            config: entry.config,
            sourceDirectory: entry.source,
            targetDirectory,
            projectName: plan.name,
            scope: plan.scope,
            mapping: plan.mapping,
            files: targetFiles(targetDirectory, destination),
          })
        )) ?? {}
      );
    }
    writeRootProject(root, destination, plan, contributions);
    // Root config owns framework lint/typecheck inclusion. Generated apps live only in apps/.
    rewritePackageNames(destination, names);
    seedLockfile(root, destination, plan);
    await formatProject(destination);
    return { ...plan, contributions };
  } catch (error) {
    // Only this newly created destination is owned by the generator.
    rmSync(destination, { recursive: true, force: true });
    throw error;
  }
}
