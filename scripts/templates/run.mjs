import { usesPreparedInputs } from '../../tooling/workspace-apps.ts';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { createTemplateProject } from './generate.mjs';

export async function cloneProject(root, options) {
  const plan = await createTemplateProject(root, options.destination, {
    ...options,
    allShared: true,
  });
  console.log('Created:', options.destination);
  console.log('Templates:', plan.templates.map((entry) => entry.id).join(', '));
  console.log('Shared dependencies:', plan.packages.map((entry) => entry.manifest.name).join(', '));
  const commands = [];
  if (options.install !== false)
    commands.push(['install', '--no-frozen-lockfile', ...(options.offline ? ['--offline'] : [])]);
  if (
    options.install !== false &&
    plan.templates.some((entry) => usesPreparedInputs(entry.manifest))
  )
    commands.push(['app:prepare', '--all', '--source', 'default']);
  if (options.verify !== false) commands.push(['validate']);
  if (options.browser) commands.push(['test:e2e', '--all'], ['test:e2e:theme-policy']);
  for (const args of commands) {
    const code = await runProcesses([pnpmCommand(args)], { cwd: options.destination });
    if (code !== 0) return code;
  }
  return 0;
}
