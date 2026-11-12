import { existsSync } from 'node:fs';
import path from 'node:path';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';

function packageBuildArguments(root, groups) {
  const filters = groups
    .filter(({ parent }) => existsSync(path.join(root, parent)))
    .flatMap(({ parent }) => ['--filter', './' + parent + '/*']);
  return filters.length ? [...filters, '--if-present', 'build'] : undefined;
}

const sourceCheck = () => ['check:workspace', '--source'];
const lintSteps = (fix, excludes) => [
  [
    'exec',
    'eslint',
    '.',
    ...excludes.flatMap((pattern) => ['--ignore-pattern', pattern]),
    ...(fix ? ['--fix'] : []),
  ],
  ['-r', '--if-present', fix ? 'lint:fix' : 'lint'],
];
const typeSteps = () => [
  ['exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'],
  ['-r', '--if-present', 'typecheck'],
];
const testSteps = () => [['test:tooling'], ['-r', '--if-present', 'test']];

/** Plan the package lifecycle once so validation reuses its build outputs. */
export function packageTaskSteps(
  root,
  action,
  options,
  { groups, beforeChecks = [], afterTests = [], excludes = ['packages/**'] }
) {
  const libraries = packageBuildArguments(root, groups);
  const buildSteps = [sourceCheck(), ...(libraries ? [libraries] : [])];
  switch (action) {
    case 'build':
      return buildSteps;
    case 'dev':
      return [...buildSteps, ['-r', '--parallel', '--if-present', 'dev']];
    case 'lint':
      return lintSteps(options.fix, excludes);
    case 'typecheck':
      return [...buildSteps, ...typeSteps()];
    case 'test':
      if (options.watch) return [sourceCheck(), ['-r', '--parallel', '--if-present', 'test:watch']];
      if (options.coverage) return [...buildSteps, ['-r', '--if-present', 'test:coverage']];
      return [...buildSteps, ...testSteps()];
    case 'validate':
      return [
        ...buildSteps,
        ...beforeChecks,
        ['check:workspace'],
        ['format:check'],
        ...lintSteps(false, excludes),
        ...typeSteps(),
        ...testSteps(),
        ...afterTests,
      ];
    default:
      throw new Error('Unknown workspace task: ' + action);
  }
}

export async function runTaskSteps(root, steps) {
  for (const args of steps) {
    const code = await runProcesses([pnpmCommand(args)], { cwd: root });
    if (code) return code;
  }
  return 0;
}
