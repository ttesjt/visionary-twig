import path from 'node:path';
import { defaultApp, selectApp } from '../tooling/workspace-apps.ts';
import { devOptions } from './lib/dev-server/options.mjs';
import { runDevServer } from './lib/dev-server/server.mjs';

const root = path.resolve(import.meta.dirname, '..');
try {
  const options = devOptions(process.argv.slice(2), { defaultApp: () => defaultApp(root) });
  process.exitCode = await runDevServer(root, selectApp(root, options.app), options);
} catch (error) {
  console.error('[dev] ' + error.message);
  process.exitCode = 1;
}
