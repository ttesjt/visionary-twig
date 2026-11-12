import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { NODE_PRESET } from '../templates/presets.mjs';

export async function runTargetCommand(root, args) {
  const code = await runProcesses([pnpmCommand(args)], {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  });
  if (code !== 0) throw new Error('Target command failed (' + code + '): pnpm ' + args.join(' '));
}
export async function qualifyWorkspace(root, options, run = runTargetCommand) {
  const offline = options.offline ? ['--offline'] : [];
  await run(root, ['install', '--no-frozen-lockfile', ...offline], options);
  await run(root, ['install', '--frozen-lockfile', ...offline], options);
  if (options.preset !== NODE_PRESET)
    await run(root, ['app:prepare', '--all', '--source', 'default'], options);
  if (options.verify !== false) await run(root, ['validate'], options);
  if (options.browser) {
    await run(root, ['test:e2e', '--all'], options);
    await run(root, ['test:e2e:theme-policy'], options);
  }
}
