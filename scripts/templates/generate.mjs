import { usesPreparedInputs } from '../../tooling/workspace-apps.ts';
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

const ROOT_FILES = [
  'package.json',
  'docs/data-fetching.md',
  'docs/code-standards.md',
  'docs/monorepo-standards.md',
  'docs/repository-conventions.md',
  'docs/feature-boundaries.md',
  'docs/resource-initialization.md',
  'docs/metadata.md',
  'docs/infrastructure.md',
  'docs/text-catalog.md',
  'docs/app-config.md',
  'docs/providers.md',
  'docs/commands.md',
  'docs/content-profiles.md',
  'docs/development.md',
  '.node-version',
  '.npmrc',
  '.gitignore',
  '.prettierignore',
  '.prettierrc',
  'eslint.config.js',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.node.json',
  'tsconfig.react.json',
  'tsconfig.e2e.json',
  'vitest.config.base.ts',
  'vitest.config.node.ts',
  'vitest.config.react.ts',
];
const GENERATOR_FILES = [
  'templates',
  'clone-template.mjs',
  'test-templates.mjs',
  'test/templates.test.mjs',
  'test/template-repository.test.mjs',
  'test/template-next-initializer.test.mjs',
  'test/template-lockfile.test.mjs',
  'test/infrastructure-templates.test.mjs',
  'test/prepared-inputs.test.mjs',
  'test/template-verification-inputs.test.mjs',
  'test/page-error-verification.test.mjs',
];
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
    for (const file of ROOT_FILES)
      if (existsSync(path.join(root, file)))
        copySource(path.join(root, file), path.join(destination, file));
    const excludedScripts = plan.templates.some((entry) => usesPreparedInputs(entry.manifest))
      ? GENERATOR_FILES
      : [
          ...GENERATOR_FILES,
          'prepare-app.mjs',
          'lib/preparation-options.mjs',
          'test/preparation-options.test.mjs',
          'test/bootstrap.test.mjs',
          'test/preparation-concurrency.test.mjs',
        ];
    copySource(path.join(root, 'scripts'), path.join(destination, 'scripts'), excludedScripts);
    copySource(path.join(root, 'tooling'), path.join(destination, 'tooling'));
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
