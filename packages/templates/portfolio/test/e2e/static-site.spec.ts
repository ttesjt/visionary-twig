import { existsSync } from 'node:fs';
import { expect } from '@playwright/test';
import { PROJECT_DEMO_ENABLED } from '../../src/site/project-data';
import { test } from './fixtures/portfolio';
import { openPreferences } from './fixtures/theme';

const LEGACY_PREVIEW_STORAGE_KEY = 'portfolio-appearance';
const previewInstalled = existsSync(new URL('../../src/demo/appearance', import.meta.url));

test('the static site needs no preview script, attributes or browser state', async ({ page }) => {
  test.skip(previewInstalled, 'Runs after the optional preview module has been removed.');
  test.skip(!PROJECT_DEMO_ENABLED, 'Demo project data was not selected.');
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'neutral'),
    LEGACY_PREVIEW_STORAGE_KEY
  );
  await page.goto('/?category=tools#work');
  await expect(page.locator('html')).not.toHaveAttribute('data-style-preview');
  await expect(page.locator('html')).not.toHaveAttribute('data-preset');
  await expect(page.locator('#appearance-demo-bootstrap')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Color Index', exact: true })).toBeVisible();
  await openPreferences(page);
  await expect(page.getByRole('combobox', { name: 'Appearance', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(20, 20, 20)');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('zh');
  await expect(page.getByRole('link', { name: '色彩索引', exact: true })).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-style-preview');
  await page.addStyleTag({
    content: ':root { --my-canvas: #203040; --ui-color-canvas: var(--my-canvas); }',
  });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(32, 48, 64)');
});

test('static Mono layout and translated Puck pages work without JavaScript', async ({
  browser,
  baseURL,
}) => {
  test.skip(previewInstalled, 'Runs after the optional preview module has been removed.');
  test.skip(!PROJECT_DEMO_ENABLED, 'Demo project data was not selected.');
  if (!baseURL) throw new Error('Missing browser base URL');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/projects?lang=zh');
    await expect(page.locator('html')).not.toHaveAttribute('data-style-preview');
    await expect(page.getByRole('banner')).toHaveCSS('position', 'sticky');
    await page.getByRole('link', { name: '野外笔记', exact: true }).click();
    await expect(page.getByRole('heading', { name: '带插图的野外记录' })).toBeVisible();
  } finally {
    await context.close();
  }
});
