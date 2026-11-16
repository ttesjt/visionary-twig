import { expect } from '@playwright/test';
import { test } from './fixtures/portfolio';
import { THEME_STORAGE_KEY } from '../../src/site/theme';
import { holdHydration, hydrationErrors, THEME_CANVAS } from './fixtures/theme';

test.describe('selectable theme', () => {
  test.beforeEach(() => {
    test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
  });

  for (const entry of [
    { saved: 'dark', system: 'light', scheme: 'dark', selected: 'dark' },
    { saved: 'light', system: 'dark', scheme: 'light', selected: 'light' },
    { saved: 'system', system: 'dark', scheme: 'dark', selected: 'system' },
    { saved: undefined, system: 'dark', scheme: 'dark', selected: 'system' },
    { saved: undefined, system: 'light', scheme: 'light', selected: 'system' },
    { saved: 'sepia', system: 'dark', scheme: 'dark', selected: 'system' },
    { saved: 'sepia', system: 'light', scheme: 'light', selected: 'system' },
    { saved: '', system: 'dark', scheme: 'dark', selected: 'system' },
  ] as const) {
    test(
      'uses the correct first paint before hydration: ' +
        (entry.saved ?? 'default') +
        '/' +
        entry.system,
      async ({ browser, baseURL }) => {
        if (!baseURL) throw new Error('Browser base URL is required.');
        const context = await browser.newContext({
          baseURL,
          colorScheme: entry.system,
          storageState: {
            cookies: [],
            origins: [
              {
                origin: new URL(baseURL).origin,
                localStorage:
                  entry.saved === undefined
                    ? []
                    : [{ name: THEME_STORAGE_KEY, value: entry.saved }],
              },
            ],
          },
        });
        const page = await context.newPage();
        const errors = hydrationErrors(page);
        const held = await holdHydration(page);
        try {
          await page.goto('/', { waitUntil: 'commit' });
          await expect(
            page.getByRole('heading', { name: 'Small projects, made with care.', exact: true })
          ).toBeVisible();
          const picker = page.getByRole('combobox', { name: 'Theme', exact: true });
          await expect(picker).toBeDisabled();
          await expect(picker).toHaveValue('');
          await expect(page.locator('html')).toHaveAttribute('data-theme', entry.scheme);
          await expect(page.locator('body')).toHaveCSS(
            'background-color',
            THEME_CANVAS[entry.scheme]
          );
          await expect
            .poll(() => held.paints[0])
            .toBe(entry.scheme + ' ' + entry.scheme + ' ' + THEME_CANVAS[entry.scheme]);
          const before = await picker.boundingBox();
          await held.release();
          await expect(picker).toBeEnabled();
          await expect(picker).toHaveValue(entry.selected);
          if (entry.saved !== undefined)
            expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(
              entry.selected
            );
          const after = await picker.boundingBox();
          if (!before || !after) throw new Error('Theme control must reserve its space.');
          expect(Math.abs(before.width - after.width)).toBeLessThanOrEqual(1);
          expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1);
          expect(errors).toEqual([]);
        } finally {
          await held.release();
          await context.close();
        }
      }
    );
  }

  test('restores the preference after refresh', async ({ page }) => {
    const errors = hydrationErrors(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe('dark');
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(errors).toEqual([]);
  });

  test('follows system changes only while the selected preference is system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const picker = page.getByRole('combobox', { name: 'Theme', exact: true });
    await expect(picker).toHaveValue('system');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(picker).toHaveValue('system');
    await picker.selectOption('light');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await picker.selectOption('system');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('synchronizes real tabs through storage events', async ({ context, page }) => {
    await page.goto('/');
    const other = await context.newPage();
    try {
      await other.goto('/');
      const picker = page.getByRole('combobox', { name: 'Theme', exact: true });
      const otherPicker = other.getByRole('combobox', { name: 'Theme', exact: true });
      await expect(otherPicker).toBeEnabled();
      await picker.selectOption('dark');
      await expect(otherPicker).toHaveValue('dark');
      await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
      await otherPicker.selectOption('light');
      await expect(picker).toHaveValue('light');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    } finally {
      await other.close();
    }
  });

  test('repairs unsupported values arriving through a real storage event', async ({
    context,
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const other = await context.newPage();
    try {
      await other.emulateMedia({ colorScheme: 'dark' });
      await other.goto('/');
      const picker = other.getByRole('combobox', { name: 'Theme', exact: true });
      await expect(picker).toBeEnabled();
      await page.evaluate((key) => localStorage.setItem(key, 'sepia'), THEME_STORAGE_KEY);
      await expect
        .poll(() => other.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY))
        .toBe('system');
      await expect(picker).toHaveValue('system');
      await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    } finally {
      await other.close();
    }
  });

  test('repairs invalid first paint and library state when storage can be read but not written', async ({
    browser,
    baseURL,
  }) => {
    if (!baseURL) throw new Error('Browser base URL is required.');
    const context = await browser.newContext({
      baseURL,
      colorScheme: 'dark',
      storageState: {
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL).origin,
            localStorage: [{ name: THEME_STORAGE_KEY, value: 'sepia' }],
          },
        ],
      },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(Storage.prototype, 'setItem', {
        value() {
          throw new DOMException('Storage is read-only', 'QuotaExceededError');
        },
      });
    });
    const held = await holdHydration(page);
    const errors = hydrationErrors(page);
    try {
      await page.goto('/', { waitUntil: 'commit' });
      await expect.poll(() => held.paints[0]).toBe('dark dark ' + THEME_CANVAS.dark);
      await held.release();
      await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue(
        'system'
      );
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(
        'sepia'
      );
      expect(errors).toEqual([]);
    } finally {
      await held.release();
      await context.close();
    }
  });

  test('keeps theme selection usable when persistent storage is blocked', async ({ page }) => {
    const errors = hydrationErrors(page);
    await page.addInitScript(() => {
      for (const method of ['getItem', 'setItem'])
        Object.defineProperty(Storage.prototype, method, {
          value() {
            throw new DOMException('Storage is blocked', 'SecurityError');
          },
        });
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
    await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(errors).toEqual([]);
  });
});
