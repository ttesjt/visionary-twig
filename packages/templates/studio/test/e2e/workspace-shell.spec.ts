import { openPagePanel } from './fixtures/resource-controls';
import { expect, test } from '@playwright/test';
test('starter demo selects records, edits fields and previews the same record without data APIs', async ({
  page,
}) => {
  const calls: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) calls.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
  await expect(page.locator('.ui-studio-workbench')).toHaveCount(0);
  await expect(page.locator('.ui-studio-menu-trigger')).not.toBeVisible();
  await page.locator('.ui-studio-sidebar').getByRole('link', { name: 'Demo', exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/u);
  const preview = page.getByRole('region', { name: 'Card preview', exact: true });
  await expect(preview.getByRole('heading', { name: 'Field guide' })).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill('Changed record');
  await page.getByLabel('Summary', { exact: true }).fill('A changed summary.');
  await page.getByLabel('Status', { exact: true }).selectOption('ready');
  await expect(preview.getByRole('heading', { name: 'Changed record' })).toBeVisible();
  await expect(preview).toContainText('A changed summary.');
  await expect(preview).toContainText('Ready');
  await expect(page.getByRole('button', { name: 'Changed record', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await page.getByRole('button', { name: 'Image study', exact: true }).click();
  await expect(page.getByLabel('Record ID')).toHaveValue('image-study');
  await expect(preview.getByRole('heading', { name: 'Image study' })).toBeVisible();
  await page.getByRole('button', { name: 'Changed record', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Changed record');
  await page.reload();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Field guide');
  for (const path of ['/notebook', '/example']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/demo$/u);
  }
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
  expect((await page.goto('/not-registered'))?.status()).toBe(404);
});
for (const width of [320, 768, 1440]) {
  test('demo remains usable at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demo');
    await expect(page.getByRole('region', { name: 'Selected record', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Card preview', exact: true })).toBeVisible();
    await page.getByLabel('Title', { exact: true }).fill('A long title '.repeat(10));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });
}
test('demo editor composes file operations and memory publication without data APIs', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/data/')) requests.push(request.url());
  });
  await page.goto('/demo/pages/new');
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
  await expect(page.locator('.ui-studio-status')).not.toContainText('not published');
  await expect(page.getByRole('combobox', { name: 'Publish target' })).toHaveCount(0);
  await openPagePanel(page, 'Files');
  await page.getByRole('button', { name: 'Open neutral example' }).click();
  await expect(
    page.getByRole('region', { name: 'Actual page preview', exact: true })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit JSON', exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});
test('starter mobile navigation has focus recovery and keeps its real page URLs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  const durations = await dialog
    .locator('.ui-studio-navigation-group a')
    .first()
    .evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(durations.split(',').every((value) => value.trim() === '0s')).toBe(true);
  await expect(dialog.getByRole('link', { name: 'Demo', exact: true })).toHaveAttribute(
    'href',
    '/demo'
  );
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('fixed theme policy also governs the new starter workspace', async ({ page }) => {
  const mode = process.env.UI_THEME_POLICY;
  test.skip(mode !== 'light' && mode !== 'dark', 'Fixed policy case.');
  await page.goto('/');
  await expect(page.locator('.ui-studio-shell')).toHaveAttribute('data-theme', mode ?? '');
  await expect(page.locator('.ui-theme-switcher')).toHaveCount(0);
});

test('sidebar Pages opens independent page resources and keeps its active state in nested editors', async ({
  page,
}) => {
  await page.goto('/pages');
  await expect(page).toHaveURL(/\/demo\/pages$/u);
  await page
    .locator('.ui-studio-sidebar')
    .getByRole('link', { name: 'Overview', exact: true })
    .click();
  const pages = page
    .locator('.ui-studio-sidebar')
    .getByRole('link', { name: 'Pages', exact: true });
  await pages.click();
  await expect(page).toHaveURL(/\/demo\/pages$/u);
  await expect(pages).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'New page', exact: true }).click();
  await expect(pages).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Pages', exact: true })).toHaveCount(0);
});
