import path from 'node:path';
import { parseOptions, TARGET_VALUES, TARGET_FLAGS } from './workspace/options.mjs';
import { selectTargets, targetSelection, emptyAppsMessage } from './workspace/targets.mjs';
import { bootstrapApps } from './workspace/bootstrap.mjs';
import { commandHelp, PREPARE_HELP } from './workspace/help.mjs';
const root = path.resolve(import.meta.dirname, '..');
try {
  const options = parseOptions(process.argv.slice(2), {
    values: [...TARGET_VALUES, '--source'],
    flags: [...TARGET_FLAGS, '--offline'],
  });
  if (options['--help'])
    commandHelp(
      'bootstrap',
      'Installs frozen dependencies, builds selected dependencies and prepares all apps by default. --offline uses the local pnpm store. ' +
        PREPARE_HELP
    );
  else {
    const apps = selectTargets(root, targetSelection(options), { defaultAll: true });
    const code = await bootstrapApps(root, apps, {
      offline: options['--offline'],
      source: options['--source'],
    });
    if (code) process.exitCode = code;
    else if (!apps.length) console.log(emptyAppsMessage());
    else {
      console.log('Ready. Start one app with pnpm dev --app <directory-id>.');
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
