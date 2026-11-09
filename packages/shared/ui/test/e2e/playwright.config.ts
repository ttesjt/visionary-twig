import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3477);
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  workers: 1,
  retries: 0,
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: 'chromium' },
  projects: [
    { name: 'motion', use: { reducedMotion: 'no-preference' } },
    { name: 'reduced-motion', use: { reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: `pnpm exec vite --config test/e2e/vite.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
