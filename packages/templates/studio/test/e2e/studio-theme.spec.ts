import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { selectStudioTheme } from './fixtures/resource-controls';
import { openJson, returnToPage } from './fixtures/editing';
import { applyDocument } from './fixtures/document';

test.beforeEach(() => {
  test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
});

test('top appearance controls resource tools and default Viewer; an override affects only the frame', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await applyDocument(page);
  await selectStudioTheme(page, 'light');
  const frame = page.frameLocator('iframe[title="Actual content page"]');
  const workbench = page.locator('.ui-studio-workbench');
  const previewTheme = page.getByRole('combobox', { name: 'Preview theme', exact: true });
  await expect(previewTheme).toHaveValue('inherit');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'light');
  await expect(frame.locator('main')).toHaveCSS('color-scheme', 'light');
  await expect(workbench).toHaveCSS('color', 'rgb(23, 23, 23)');
  await expect(workbench).not.toHaveAttribute('data-theme');
  await previewTheme.selectOption('dark');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'dark');
  await expect(frame.locator('main')).toHaveCSS('color-scheme', 'dark');
  await expect(workbench).toHaveCSS('background-color', 'rgb(247, 247, 248)');
  await expect(page.getByLabel('Page name', { exact: true })).toHaveCSS('color', 'rgb(23, 23, 23)');
  const source = await openJson(page);
  await expect(source).toHaveCSS('color', 'rgb(23, 23, 23)');
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(previewTheme).toHaveValue('dark');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'dark');
  await returnToPage(page);
  await selectStudioTheme(page, 'dark');
  await expect(workbench).toHaveCSS('color', 'rgb(245, 245, 245)');
  await selectStudioTheme(page, 'light');
  await expect(previewTheme).toHaveValue('dark');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'dark');
  await previewTheme.selectOption('inherit');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'light');
  await selectStudioTheme(page, 'dark');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'dark');
});

test('inherit and explicit system remain distinct and react to OS changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await selectStudioTheme(page, 'light');
  const theme = page.getByRole('combobox', { name: 'Preview theme', exact: true });
  const frame = page.frameLocator('iframe[title="Actual content page"]');
  await theme.selectOption('system');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'system');
  await expect(frame.locator('main')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
  await expect(page.locator('.ui-studio-workbench')).toHaveCSS('color', 'rgb(23, 23, 23)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(frame.locator('main')).toHaveCSS('background-color', 'rgb(250, 250, 250)');
  await selectStudioTheme(page, 'system');
  await theme.selectOption('inherit');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('.ui-studio-workbench')).toHaveCSS('color', 'rgb(245, 245, 245)');
  await expect(frame.locator('main')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
  await theme.selectOption('light');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'light');
  const input = await openJson(page);
  await expect(input).toHaveCSS('color', 'rgb(245, 245, 245)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(input).toHaveCSS('color', 'rgb(23, 23, 23)');
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(theme).toHaveValue('light');
  await expect(frame.locator('main')).toHaveCSS('background-color', 'rgb(250, 250, 250)');
});

test('appearance changes preserve pending JSON, resource identity, binding and applied history', async ({
  page,
}) => {
  await page.goto('/demo/pages/new?item=field-guide');
  await page.getByLabel('Page name', { exact: true }).fill('Retained resource');
  await applyDocument(page);
  const identity = await page
    .locator('.ui-studio-resource-overview .ui-studio-identity')
    .textContent();
  const input = await openJson(page, 'context');
  await input.fill('{pending context');
  await returnToPage(page);
  await selectStudioTheme(page, 'light');
  await page.getByRole('combobox', { name: 'Preview theme', exact: true }).selectOption('dark');
  await selectStudioTheme(page, 'dark');
  await openJson(page, 'context');
  await expect(input).toHaveValue('{pending context');
  await input.fill('{"retained":true}');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await returnToPage(page);
  await selectStudioTheme(page, 'light');
  await expect(page.getByLabel('Page name', { exact: true })).toHaveValue('Retained resource');
  await expect(page.locator('.ui-studio-resource-overview .ui-studio-identity')).toHaveText(
    identity ?? ''
  );
  await openJson(page, 'context');
  await expect(input).toHaveValue(/"retained": true/);
  await page.getByRole('button', { name: 'undo', exact: true }).click();
  await expect(input).toHaveValue('{}');
  await page.getByRole('button', { name: 'redo', exact: true }).click();
  await expect(input).toHaveValue(/"retained": true/);
  await returnToPage(page);
  await page.getByRole('tab', { name: 'Association', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Item association' })).toContainText('Field guide');
});
