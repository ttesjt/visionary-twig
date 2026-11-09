import { devices, type PlaywrightTestConfig } from '@playwright/test';
import path from 'node:path';
import { appAddress, selectApp, appFilter } from './workspace-apps.ts';

const SERVER_START_TIMEOUT_MS = 60_000;

export function appPlaywrightConfig(root: string, id: string) {
  const app = selectApp(root, id);
  const { port, baseURL } = appAddress(app, process.env.PLAYWRIGHT_PORT);
  return {
    testDir: path.join(app.directory, 'test/e2e'),
    outputDir: path.join(root, 'test-results', id),
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    use: { baseURL, trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
      command: `pnpm --filter "${appFilter(root, app)}" start --hostname ${app.hostname} --port ${port}`,
      cwd: root,
      url: baseURL,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
    },
  } satisfies PlaywrightTestConfig;
}
