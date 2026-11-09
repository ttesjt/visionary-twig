import path from 'node:path';
import { appFilter } from '../tooling/workspace-apps.ts';
import { parseOptions, TARGET_VALUES, TARGET_FLAGS } from './workspace/options.mjs';
import { selectTargets, targetSelection, emptyAppsMessage } from './workspace/targets.mjs';
import { buildDependencies } from './workspace/packages.mjs';
import { commandHelp } from './workspace/help.mjs';
import { pnpmCommand, runProcesses } from './lib/processes.mjs';
const root = path.resolve(import.meta.dirname, '..');
try {
  const [action, ...args] = process.argv.slice(2);
  if (!['build', 'start'].includes(action)) throw new Error('Expected build or start.');
  const options = parseOptions(args, {
    values: TARGET_VALUES,
    flags: action === 'start' ? ['--help'] : TARGET_FLAGS,
  });
  if (options['--help'])
    commandHelp(
      action,
      action === 'build'
        ? 'Builds selected dependencies and apps; requires already prepared inputs. Default: all apps.'
        : 'Starts one previously built app; does not prepare, build or choose storage.',
      { batch: action === 'build' }
    );
  else {
    const apps = selectTargets(root, targetSelection(options), { defaultAll: action === 'build' });
    if (action === 'build') {
      if (apps.length) await buildDependencies(root, apps);
      else {
        const code = await runProcesses([pnpmCommand(['build:packages'])], { cwd: root });
        if (code) throw new Error('Package build failed.');
      }
    }
    if (!apps.length) console.log(emptyAppsMessage());
    for (const app of apps) {
      const code = await runProcesses([pnpmCommand(['--filter', appFilter(root, app), action])], {
        cwd: root,
      });
      if (code) {
        process.exitCode = code;
        break;
      }
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
