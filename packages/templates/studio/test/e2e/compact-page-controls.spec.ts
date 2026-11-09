import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { openJson, returnToPage } from './fixtures/editing';
import { openPagePanel } from './fixtures/resource-controls';
import { project } from './fixtures/project';

for (const width of [375, 1440]) {
  test(`resource controls fit their allocated space at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/demo/pages/new');
    const manager = page.getByRole('region', { name: 'Page controls', exact: true });
    await expect(manager.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(manager.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await expect(manager.getByRole('button', { name: 'Save As', exact: true })).toBeVisible();
    await expect(manager.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
    const bounds = await manager.boundingBox();
    if (!bounds) throw new Error('Expected resource management bounds.');
    expect(bounds.height).toBeLessThan(width === 1440 ? 230 : 400);
    expect(bounds.y).toBeLessThan(150);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await openPagePanel(page, 'Copy & languages');
    await page.getByRole('textbox', { name: 'New language', exact: true }).fill('fr-CA');
    const catalogPanel = manager.getByRole('tabpanel', { name: 'Copy & languages', exact: true });
    expect((await catalogPanel.boundingBox())?.height).toBeLessThanOrEqual(290);
    await openPagePanel(page, 'Files');
    await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeVisible();
    await openPagePanel(page, 'Copy & languages');
    await expect(page.getByRole('textbox', { name: 'New language', exact: true })).toHaveValue(
      'fr-CA'
    );
    const tab = manager.getByRole('tab', { name: 'Copy & languages', exact: true });
    await tab.focus();
    await page.keyboard.press('Home');
    await expect(manager.getByRole('tab', { name: 'Overview', exact: true })).toBeFocused();
    await expect(manager.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
}

test('hidden catalog drafts stay in the same session and continue blocking save and publish', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await openPagePanel(page, 'Files');
  await page.getByLabel('Open JSON file', { exact: true }).setInputFiles({
    name: 'draft.studio.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await openPagePanel(page, 'Copy & languages');
  await page
    .locator('.ui-studio-key-list button')
    .filter({ hasText: /^hero.title$/u })
    .click();
  await page.getByLabel('Value format', { exact: true }).selectOption('json');
  const value = page.getByRole('textbox', { name: 'Catalog value', exact: true });
  await value.fill('{broken');
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeDisabled();
  await openPagePanel(page, 'Association');
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
  await openJson(page);
  await returnToPage(page);
  await openPagePanel(page, 'Copy & languages');
  await expect(value).toHaveValue('{broken');
  await value.fill('"Repaired catalog"');
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeEnabled();
  await expect(
    page.frameLocator('iframe[title="Actual content page"]').getByRole('heading').first()
  ).toContainText('Repaired catalog');
  await value.focus();
  await page.keyboard.press('Control+z');
  await expect(
    page.frameLocator('iframe[title="Actual content page"]').getByRole('heading').first()
  ).toContainText('Quiet discoveries');
});
