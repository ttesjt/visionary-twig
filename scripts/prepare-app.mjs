import path from 'node:path';
import { preparationOptions } from './lib/preparation-options.mjs';
import { selectTargets, emptyAppsMessage } from './workspace/targets.mjs';
import { buildDependencies } from './workspace/packages.mjs';
import { prepareInputs } from './workspace/inputs.mjs';
import { commandHelp, PREPARE_HELP } from './workspace/help.mjs';
const root = path.resolve(import.meta.dirname, '..');
try {
  const options = preparationOptions(process.argv.slice(2));
  if (options.help)
    commandHelp(
      options.kind + (options.check ? ':check' : ':prepare'),
      (options.check
        ? 'Checks recorded sources and freshness without installation, builds or writes. --source <mode> additionally requires that prepared source mode.'
        : PREPARE_HELP) + ' Default target: all apps.'
    );
  else {
    const apps = selectTargets(root, options, { defaultAll: true });
    if (!apps.length) console.log(emptyAppsMessage());
    else {
      if (!options.check) await buildDependencies(root, apps);
      await prepareInputs(apps, options);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
