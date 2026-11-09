import { verifyPageErrorRecovery } from './templates/verify-errors.mjs';
import { verifyNamespaceInputsFlow } from './templates/verify-resources.mjs';
import { rmSync } from 'node:fs';
import { verifyStudioInputsFlow } from './templates/verify-inputs.mjs';
import { verifyConfiguredTracking, verifyTrackingIsolation } from './templates/verify-tracking.mjs';
import { trackingTestEnvironment } from './lib/runner-options.mjs';
import path from 'node:path';
import { discoverTemplateApps } from '../tooling/workspace-apps.ts';
import { pnpmCommand, runProcesses } from './lib/processes.mjs';

const TEMPLATE_BROWSER_PORT = '3160';
const TEST_TRACKING_URL = 'https://events.example.test/capture';
const root = path.resolve(import.meta.dirname, '..');
const destination = path.join(root, '.cache/template-verification/project');
const plainDestination = path.join(root, '.cache/template-verification/plain-next');
const env = trackingTestEnvironment({
  ...process.env,
  TEST_EVENT_TRACKING_URL: '',
  NEXT_TELEMETRY_DISABLED: '1',
  CI: 'true',
  UI_THEME_POLICY: 'selectable',
  PLAYWRIGHT_PORT: process.env.PLAYWRIGHT_PORT ?? TEMPLATE_BROWSER_PORT,
});
const configuredEnv = trackingTestEnvironment({
  ...env,
  TEST_EVENT_TRACKING_URL: TEST_TRACKING_URL,
});
const flags = process.argv.slice(2);
if (flags.length > 1 || flags.some((flag) => !['--source-only', '--clone-only'].includes(flag)))
  throw new Error('Use --source-only or --clone-only.');
const sourceOnly = flags.includes('--source-only');
const sourceApps = flags.includes('--clone-only') ? [] : discoverTemplateApps(root);
const commands = sourceApps.map((app) => ({ args: ['test:e2e', '--app', app.id], env }));
for (const theme of ['light', 'dark'])
  for (const app of sourceApps)
    commands.push({
      args: ['test:e2e', '--app', app.id, '--grep', 'fixed theme policy'],
      env: { ...env, UI_THEME_POLICY: theme },
    });
// Only these fixed ignored directories belong to template verification.
if (!sourceOnly) {
  for (const directory of [destination, plainDestination])
    rmSync(directory, { recursive: true, force: true });
  commands.push(
    {
      args: [
        'template:clone',
        '--output',
        destination,
        '--name',
        '@template-check/workspace',
        '--app',
        'studio=editor',
        '--offline',
        '--browser',
      ],
      env,
    },
    {
      args: [
        'template:clone',
        '--output',
        plainDestination,
        '--name',
        '@plain-check/workspace',
        '--templates',
        'plain-next',
        '--app',
        'plain-next=welcome',
        '--offline',
        '--browser',
      ],
      env,
    }
  );
}
for (const command of commands) {
  const code = await runProcesses([pnpmCommand(command.args)], { cwd: root, env: command.env });
  if (code !== 0) {
    process.exitCode = code;
    break;
  }
}
if (!sourceOnly && !process.exitCode) {
  await verifyNamespaceInputsFlow(destination, 'plain', env);
  await verifyNamespaceInputsFlow(plainDestination, 'welcome', env);
  await verifyPageErrorRecovery(plainDestination, 'welcome', env);
  await verifyTrackingIsolation(destination, env);
  await verifyStudioInputsFlow(destination, 'editor', env);
  await verifyConfiguredTracking(plainDestination, 'welcome', configuredEnv);
  for (const cwd of [destination, plainDestination]) {
    const code = await runProcesses([pnpmCommand(['install', '--frozen-lockfile', '--offline'])], {
      cwd,
      env,
    });
    if (code !== 0) {
      process.exitCode = code;
      break;
    }
  }
}

if (sourceApps.some((app) => app.id === 'template-plain-next') && !process.exitCode)
  await verifyNamespaceInputsFlow(root, 'template-plain-next', env);

if (sourceApps.some((app) => app.id === 'template-studio') && !process.exitCode)
  await verifyStudioInputsFlow(root, 'template-studio', env);
