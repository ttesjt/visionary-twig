import path from 'node:path';
import { NODE_WORKSPACE_GROUPS } from './lib/workspace-discovery.mjs';
import { parseOptions } from './workspace/options.mjs';
import { packageTaskSteps, runTaskSteps } from './workspace/package-tasks.mjs';

const tasks = {
  build: [],
  dev: [],
  lint: ['--fix'],
  typecheck: [],
  test: ['--watch', '--coverage'],
  validate: [],
};

try {
  const [action, ...args] = process.argv.slice(2);
  if (!Object.hasOwn(tasks, action)) throw new Error('Unknown workspace task.');
  const flags = tasks[action];
  const options = parseOptions(args, { flags: [...flags, '--help'] });
  if (options['--watch'] && options['--coverage'])
    throw new Error('--watch cannot be combined with --coverage.');
  if (options['--help']) {
    console.log(['pnpm', action, ...flags.map((flag) => '[' + flag + ']')].join(' '));
  } else {
    const root = path.resolve(import.meta.dirname, '..');
    const steps = packageTaskSteps(
      root,
      action,
      { fix: options['--fix'], watch: options['--watch'], coverage: options['--coverage'] },
      { groups: NODE_WORKSPACE_GROUPS }
    );
    process.exitCode = await runTaskSteps(root, steps);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
