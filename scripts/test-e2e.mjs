import path from 'node:path';
import { appFilter, defaultApp, appAddress } from '../tooling/workspace-apps.ts';
import { runnerOptions, browserEnvironment } from './lib/runner-options.mjs';
import { pnpmCommand, runProcesses } from './lib/processes.mjs';
import { selectTargets, emptyAppsMessage } from './workspace/targets.mjs';
import { buildDependencies } from './workspace/packages.mjs';
import { appEnvironment } from './workspace/hooks.mjs';
import { commandHelp } from './workspace/help.mjs';
const root = path.resolve(import.meta.dirname, '..');
try {
  const options = runnerOptions(process.argv.slice(2), {
    e2e: true,
    defaultApp: () => defaultApp(root),
  });
  if (options.help)
    commandHelp(
      'test:e2e',
      'Builds apps, starts strict-port production servers and runs browser tests. Writes test/build output. --grep <pattern>; --production-defaults requires an app test hook.'
    );
  else {
    const apps = selectTargets(root, options);
    if (!apps.length) throw new Error(emptyAppsMessage());
    const plans = [];
    for (const app of apps) {
      appAddress(app, process.env.PLAYWRIGHT_PORT);
      const env = await appEnvironment(root, app, 'test', {
        productionDefaults: options.productionDefaults,
        environment: browserEnvironment(process.env),
      });
      plans.push({ app, env });
    }
    await buildDependencies(root, apps, { env: browserEnvironment(process.env) });
    for (const { app, env } of plans) {
      for (const args of [
        ['--filter', appFilter(root, app), 'build'],
        [
          'exec',
          'playwright',
          'test',
          '--config',
          app.testConfig,
          ...(options.grep === undefined ? [] : ['--grep', options.grep]),
        ],
      ]) {
        const code = await runProcesses([pnpmCommand(args)], { cwd: root, env });
        if (code) {
          process.exitCode = code;
          break;
        }
      }
      if (process.exitCode) break;
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
