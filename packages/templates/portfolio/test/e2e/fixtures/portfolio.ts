import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_DEMO_ENABLED } from '../../../src/site/project-data';
import { test as base } from '@playwright/test';

const app = resolve(import.meta.dirname, '../../..');
const seed = resolve(app, 'scripts/data-setup.ts');

export const test = base.extend<Record<never, never>, { portfolioData: void }>({
  portfolioData: [
    async ({ browserName }, use) => {
      void browserName;
      if (existsSync(seed)) {
        if (!process.env.PORTFOLIO_LOCAL_DIR) throw new Error('Run this suite with pnpm test:e2e.');
        execFileSync(process.execPath, [seed, ...(PROJECT_DEMO_ENABLED ? ['--with-demo'] : [])], {
          cwd: app,
          env: process.env,
          stdio: 'pipe',
        });
      }
      await use();
    },
    { scope: 'worker', auto: true },
  ],
});
