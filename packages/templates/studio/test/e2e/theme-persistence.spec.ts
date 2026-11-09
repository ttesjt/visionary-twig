import { applyDocument } from './fixtures/document';
import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { selectStudioTheme } from './fixtures/resource-controls';
import { STUDIO_THEME_COOKIE_NAME } from '../../src/theme/theme-preference';

test.beforeEach(() => {
  test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
});

test('remembers the global choice across reloads and new visits, including server HTML without JavaScript', async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Expected browser base URL.');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await selectStudioTheme(page, 'dark');
  const cookie = (await context.cookies()).find((item) => item.name === STUDIO_THEME_COOKIE_NAME);
  expect(cookie?.value).toBe('dark');
  expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
  expect(cookie?.sameSite).toBe('Lax');
  await page.getByRole('combobox', { name: 'Preview theme', exact: true }).selectOption('light');
  await expect(
    page.frameLocator('iframe[title="Actual content page"]').locator('main')
  ).toHaveAttribute('data-theme', 'light');
  expect(
    (await context.cookies()).find((item) => item.name === STUDIO_THEME_COOKIE_NAME)?.value
  ).toBe('dark');
  page.once('dialog', (dialog) => {
    void dialog.accept();
  });
  await page.reload();
  await applyDocument(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.ui-studio-shell')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('combobox', { name: 'Preview theme', exact: true })).toHaveValue(
    'inherit'
  );
  await expect(
    page.frameLocator('iframe[title="Actual content page"]').locator('main')
  ).toHaveAttribute('data-theme', 'dark');
  const fresh = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: 'light',
    storageState: await context.storageState(),
  });
  try {
    const revisit = await fresh.newPage();
    await revisit.goto(baseURL);
    await expect(revisit.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(revisit.locator('.ui-studio-shell')).toHaveAttribute('data-theme', 'dark');
    await expect(revisit.locator('.ui-studio-shell')).toHaveCSS('color', 'rgb(245, 245, 245)');
  } finally {
    await fresh.close();
  }
});

test('remembers Light and System as explicit preferences and keeps following OS changes', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await selectStudioTheme(page, 'light');
  page.once('dialog', (dialog) => {
    void dialog.accept();
  });
  await page.reload();
  await applyDocument(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.ui-studio-workbench')).toHaveCSS('color', 'rgb(23, 23, 23)');
  await selectStudioTheme(page, 'system');
  page.once('dialog', (dialog) => {
    void dialog.accept();
  });
  await page.reload();
  await applyDocument(page);
  await expect(page.locator('.ui-studio-shell')).toHaveAttribute('data-theme', 'system');
  await expect(page.locator('.ui-studio-workbench')).toHaveCSS('color', 'rgb(245, 245, 245)');
  const frame = page.frameLocator('iframe[title="Actual content page"]');
  await expect(frame.locator('main')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('.ui-studio-workbench')).toHaveCSS('color', 'rgb(23, 23, 23)');
  await expect(frame.locator('main')).toHaveCSS('background-color', 'rgb(250, 250, 250)');
  expect(
    (await context.cookies()).find((item) => item.name === STUDIO_THEME_COOKIE_NAME)?.value
  ).toBe('system');
});

test('invalid stored preferences fall back safely and can be replaced by a valid choice', async ({
  page,
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Expected browser base URL.');
  await context.addCookies([{ name: STUDIO_THEME_COOKIE_NAME, value: 'invalid', url: baseURL }]);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
  await expect(page.locator('.ui-studio-shell')).toHaveAttribute('data-theme', 'system');
  await selectStudioTheme(page, 'light');
  await page.reload();
  await expect(page.locator('.ui-studio-shell')).toHaveAttribute('data-theme', 'light');
  expect(
    (await context.cookies()).find((item) => item.name === STUDIO_THEME_COOKIE_NAME)?.value
  ).toBe('light');
});
