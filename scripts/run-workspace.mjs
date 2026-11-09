import path from 'node:path';
import { parseOptions } from './workspace/options.mjs';
import { runWorkspaceTask } from './workspace/tasks.mjs';

const root = path.resolve(import.meta.dirname, '..');
const TASKS = {
  'build:packages': {
    flags: [],
    help: 'Checks source policy and builds every library workspace; no app production builds.',
  },
  lint: {
    flags: ['--fix'],
    help: 'Checks root tooling and workspace source. --fix edits source files.',
  },
  typecheck: {
    flags: [],
    help: 'Builds libraries, then checks root and workspace types. Does not prepare inputs.',
  },
  test: {
    flags: ['--watch', '--coverage'],
    help: 'Runs workspace tests. Normal and coverage modes build libraries; watch requires existing dist. Writes test caches/coverage, but does not prepare inputs.',
  },
  validate: {
    flags: [],
    help: 'Checks existing prepared inputs, builds libraries once, runs checks/tests and builds all apps/templates. No installation, preparation, browser tests or cloud data operations.',
  },
};
try {
  const [action, ...args] = process.argv.slice(2);
  if (!Object.hasOwn(TASKS, action)) throw new Error('Unknown workspace task.');
  const task = TASKS[action];
  const options = parseOptions(args, { flags: [...task.flags, '--help'] });
  if (options['--watch'] && options['--coverage'])
    throw new Error('--watch cannot be combined with --coverage.');
  if (options['--help']) {
    console.log('pnpm ' + action + ' ' + task.flags.join(' '));
    console.log(
      action === 'build:packages'
        ? 'Scope: all library workspaces.'
        : 'Scope: the workspace, including source templates when present.'
    );
    console.log(task.help);
  } else
    process.exitCode = await runWorkspaceTask(root, action, {
      fix: options['--fix'],
      watch: options['--watch'],
      coverage: options['--coverage'],
    });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
