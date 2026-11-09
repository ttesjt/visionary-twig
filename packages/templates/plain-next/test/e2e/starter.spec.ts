import { THEME_STORAGE_KEY } from '../../src/site/theme';
import { holdHydration, hydrationErrors, THEME_CANVAS } from './fixtures/theme';
import { expect, test } from '@playwright/test';

for (const width of [320, 1440]) {
  test(`neutral web starter renders useful server HTML at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height: 900 },
    });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Welcome.' })).toBeVisible();
      await expect(page).toHaveTitle('Plain Next.js');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
    } finally {
      await context.close();
    }
  });
}

test('homepage example links follow their displayed order with the keyboard', async ({ page }) => {
  await page.goto('/');
  const links = page.getByRole('navigation').getByRole('link');
  const destinations = [
    '/examples/event-tracking',
    '/examples/remote-settings',
    '/examples/text',
    '/examples/content',
  ];
  await expect(links).toHaveCount(destinations.length);
  await links.first().focus();
  for (const destination of destinations) {
    const link = page.locator('nav a[href="' + destination + '"]');
    await expect(link).toBeFocused();
    await page.keyboard.press('Tab');
  }
});

test('neutral starter changes themes and has no website, editor or example routes', async ({
  page,
  request,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('system');
  for (const route of ['/portfolio', '/art', '/examples/foundation', '/api/preview'])
    expect((await request.get(route)).status()).toBe(404);
});

test('fixed theme policy governs neutral starter SSR and hydration', async ({
  browser,
  baseURL,
}) => {
  const scheme = process.env.UI_THEME_POLICY;
  if (scheme !== 'light' && scheme !== 'dark') return test.skip();
  if (!baseURL) throw new Error('Browser base URL is required.');
  for (const saved of [scheme === 'light' ? 'dark' : 'light', 'sepia'])
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({
        baseURL,
        javaScriptEnabled,
        colorScheme: scheme === 'light' ? 'dark' : 'light',
        storageState: {
          cookies: [],
          origins: [
            {
              origin: new URL(baseURL).origin,
              localStorage: [{ name: THEME_STORAGE_KEY, value: saved }],
            },
          ],
        },
      });
      try {
        const page = await context.newPage();
        const errors = hydrationErrors(page);
        const held = javaScriptEnabled ? await holdHydration(page) : undefined;
        try {
          await page.goto('/', { waitUntil: 'commit' });
          await expect(page.getByRole('heading', { name: 'Welcome.', exact: true })).toBeVisible();
          if (held) {
            await expect
              .poll(() => held.paints[0])
              .toBe(scheme + ' ' + scheme + ' ' + THEME_CANVAS[scheme]);
            await held.release();
            await page.waitForLoadState('load');
          }
        } finally {
          await held?.release();
        }
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        await expect(page.locator('html')).toHaveCSS('color-scheme', scheme);
        await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveCount(0);
        if (javaScriptEnabled)
          expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(
            saved
          );
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    }
});
