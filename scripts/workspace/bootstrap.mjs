import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { buildDependencies } from './packages.mjs';
import { prepareInputs } from './inputs.mjs';

const INSTALL_FLAGS = {
  frozen: '--frozen-lockfile',
  reconcile: '--no-frozen-lockfile',
};

/** One install, then the selected dependency build and fixed-input preparation. */
export async function bootstrapApps(
  root,
  apps,
  { installation = 'frozen', offline = false, source } = {}
) {
  if (!Object.hasOwn(INSTALL_FLAGS, installation))
    throw new Error('Unknown installation policy: ' + installation);
  const code = await runProcesses(
    [pnpmCommand(['install', INSTALL_FLAGS[installation], ...(offline ? ['--offline'] : [])])],
    { cwd: root }
  );
  if (code || !apps.length) return code;
  await buildDependencies(root, apps);
  await prepareInputs(apps, { source });
  return 0;
}
