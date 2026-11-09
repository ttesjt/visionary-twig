import path from 'node:path';
import { discoverApps, discoverTemplateApps } from '../tooling/workspace-apps.ts';
import { parseOptions } from './workspace/options.mjs';
const root = path.resolve(import.meta.dirname, '..');
try {
  const options = parseOptions(process.argv.slice(2), { flags: ['--include-templates', '--help'] });
  if (options['--help'])
    console.log(
      'pnpm apps:list [--include-templates]\nLists application directory IDs and ports; no writes or external requests.'
    );
  else
    for (const app of [
      ...discoverApps(root),
      ...(options['--include-templates'] ? discoverTemplateApps(root) : []),
    ])
      console.log(
        app.id +
          '\t' +
          path.relative(root, app.directory) +
          '\tdev:' +
          app.devPort +
          '\ttest:' +
          app.testPort +
          (app.devHook ? '\tdata hook' : '')
      );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
