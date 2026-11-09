import path from 'node:path';
import { selectApp, defaultApp } from '../tooling/workspace-apps.ts';
import { devOptions } from './lib/dev-server/options.mjs';
import { runProcesses, PROCESS_SHUTDOWN_GRACE_MS } from './lib/processes.mjs';
import { buildDependencies, packageCommand } from './workspace/packages.mjs';
import { appEnvironment } from './workspace/hooks.mjs';
import { commandHelp } from './workspace/help.mjs';
const root = path.resolve(import.meta.dirname, '..');
const SUPERVISOR_SHUTDOWN_GRACE_MS = PROCESS_SHUTDOWN_GRACE_MS * 2;
try {
  const args = process.argv.slice(2);
  const options = devOptions(args, { defaultApp: () => defaultApp(root) });
  if (options.help)
    commandHelp(
      'dev',
      'Builds/watches selected dependencies and starts one app. --port <port>, --port-fallback; --data <mode> and optional --data-environment <name> require an app-owned dev hook. Does not prepare inputs or migrate storage.',
      { batch: false }
    );
  else {
    const app = selectApp(root, options.app);
    const env = await appEnvironment(root, app, 'dev', {
      data: options.data,
      targetEnvironment: options.targetEnvironment,
      environment: process.env,
    });
    await buildDependencies(root, [app]);
    const watch = packageCommand(root, [app], 'dev');
    process.exitCode = await runProcesses(
      [
        ...(watch ? [watch] : []),
        [process.execPath, [path.join(root, 'scripts/run-dev-server.mjs'), ...args]],
      ],
      { cwd: root, env, shutdownGraceMs: SUPERVISOR_SHUTDOWN_GRACE_MS }
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
