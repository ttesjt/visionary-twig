import { test as base, expect } from '@playwright/test';
/** Headless acceptance explicitly exercises the honest import/download fallback.
 * Native file-handle cases override these methods with deterministic writable handles. */
export const test = base.extend<{ fileMode: void }>({
  fileMode: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        Object.defineProperty(window, 'showOpenFilePicker', {
          configurable: true,
          value: undefined,
        });
        Object.defineProperty(window, 'showSaveFilePicker', {
          configurable: true,
          value: undefined,
        });
      });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:'))
          errors.push(message.text());
      });
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
