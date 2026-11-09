import { readFileSync } from 'node:fs';
import path from 'node:path';
import { appFilter } from '../../tooling/workspace-apps.ts';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { selectTargets } from './targets.mjs';
import { packageBuildArguments } from './packages.mjs';

const ROOT_LINT_EXCLUDES = ['apps/**', 'packages/**', 'test/e2e/**', 'playwright.config.ts'];
const sourceCheck = () => ['check:workspace', '--source'];
const rootLint = (fix) => [
  'exec',
  'eslint',
  '.',
  ...ROOT_LINT_EXCLUDES.flatMap((pattern) => ['--ignore-pattern', pattern]),
  ...(fix ? ['--fix'] : []),
];
const lintSteps = (fix = false) => [
  rootLint(fix),
  ['-r', '--if-present', fix ? 'lint:fix' : 'lint'],
];
const typeSteps = () => [
  ['exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'],
  ['-r', '--if-present', 'typecheck'],
];
const testSteps = () => [['test:tooling'], ['-r', '--if-present', 'test']];

/** Plan once before executing, so aggregate validation can reuse its own library build. */
export function workspaceTaskSteps(root, action, options = {}) {
  const libraries = packageBuildArguments(root);
  const buildSteps = [sourceCheck(), ...(libraries ? [libraries] : [])];
  switch (action) {
    case 'build:packages':
      return buildSteps;
    case 'lint':
      return lintSteps(options.fix);
    case 'typecheck':
      return [...buildSteps, ...typeSteps()];
    case 'test':
      if (options.watch) return [sourceCheck(), ['-r', '--parallel', '--if-present', 'test:watch']];
      if (options.coverage) return [...buildSteps, ['-r', '--if-present', 'test:coverage']];
      return [...buildSteps, ...testSteps()];
    case 'validate': {
      const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
      const apps = selectTargets(root, { all: true, includeTemplates: true });
      return [
        ...buildSteps,
        ...(manifest.scripts?.['app:check'] ? [['app:check', '--all', '--include-templates']] : []),
        ['check:workspace'],
        ['format:check'],
        ...lintSteps(),
        ...typeSteps(),
        ...testSteps(),
        ...apps.map((app) => ['--filter', appFilter(root, app), 'build']),
      ];
    }
    default:
      throw new Error('Unknown workspace task: ' + action);
  }
}

export async function runWorkspaceTask(root, action, options = {}) {
  for (const args of workspaceTaskSteps(root, action, options)) {
    const code = await runProcesses([pnpmCommand(args)], { cwd: root });
    if (code) return code;
  }
  return 0;
}
