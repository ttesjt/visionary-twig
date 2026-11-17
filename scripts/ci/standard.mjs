import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { discoverWorkspaces } from '../lib/workspace-discovery.mjs';
import { WORKSPACE_GROUPS } from '../lib/workspace-layers.mjs';
import { prepareInputs } from '../workspace/inputs.mjs';
import { runTaskSteps } from '../workspace/package-tasks.mjs';
import { dependencyFilters } from '../workspace/packages.mjs';
import { selectTargets } from '../workspace/targets.mjs';

const SHARED_CONFIG_FILES = new Set([
  '.gitignore',
  '.node-version',
  '.npmrc',
  '.prettierignore',
  '.prettierrc',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
]);
const ROOT_CONFIG_PATTERN = /^(?:[^/]+\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json)$/u;
const SHARED_CONFIG_DIRECTORIES = ['tooling/', '.github/workflows/'];

function changedPaths(root, base) {
  if (!base) return null;
  const options = { cwd: root, encoding: 'utf8' };
  const resolved = spawnSync(
    'git',
    ['rev-parse', '--verify', '--end-of-options', base + '^{commit}'],
    options
  );
  if (resolved.status !== 0) return null;
  // Treat moves as a removal and an addition so both workspace owners are checked.
  const diff = spawnSync(
    'git',
    ['diff', '--name-only', '--no-renames', '-z', resolved.stdout.trim(), 'HEAD', '--'],
    options
  );
  return diff.status === 0 ? diff.stdout.split('\0').filter(Boolean) : null;
}

function selectWorkspaces(root, base) {
  const workspaces = discoverWorkspaces(root, WORKSPACE_GROUPS);
  const changed = changedPaths(root, base);
  if (changed === null) {
    console.log('Checking all workspaces because the Git change range is unavailable.');
    return workspaces;
  }
  const sharedChange = changed.find(
    (file) =>
      SHARED_CONFIG_FILES.has(file) ||
      ROOT_CONFIG_PATTERN.test(file) ||
      SHARED_CONFIG_DIRECTORIES.some((directory) => file.startsWith(directory))
  );
  if (sharedChange) {
    console.log(
      'Checking all workspaces because shared configuration changed: ' +
        JSON.stringify(sharedChange)
    );
    return workspaces;
  }
  return workspaces.filter((workspace) =>
    changed.some((file) => file.startsWith(workspace.relative + '/'))
  );
}

function workspaceFilters(workspaces) {
  return workspaces.flatMap(({ relative }) => ['--filter', './' + relative]);
}

/** Runs the package checks for a committed change range ending at the checked-out HEAD. */
export async function runStandard(root, base) {
  const selected = selectWorkspaces(root, base).filter(
    ({ manifest }) => manifest.scripts?.lint || manifest.scripts?.test
  );
  if (!selected.length) {
    console.log('No changed workspaces with lint or test scripts.');
    return 0;
  }
  console.log('Checking workspaces: ' + selected.map(({ relative }) => relative).join(', '));

  const testing = selected.filter(({ manifest }) => manifest.scripts?.test);
  const buildFilters = dependencyFilters(root, testing, { includeTargets: true });
  if (buildFilters.length) {
    const code = await runTaskSteps(root, [[...buildFilters, '--if-present', 'build']]);
    if (code) return code;
  }
  const testDirectories = new Set(testing.map(({ directory }) => directory));
  const hosts = selectTargets(root, { all: true, includeTemplates: true }).filter(({ directory }) =>
    testDirectories.has(directory)
  );
  await prepareInputs(hosts, { source: 'default' });

  const filters = workspaceFilters(selected);
  return runTaskSteps(root, [
    [...filters, '--if-present', 'lint'],
    [...filters, '--if-present', 'test'],
  ]);
}

if (import.meta.main)
  try {
    process.exitCode = await runStandard(
      path.resolve(import.meta.dirname, '../..'),
      process.env.VALIDATION_BASE ?? 'HEAD^'
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
