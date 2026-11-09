import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
test('record selection protects unapplied fields and explicit discard leaves the stored row intact', async ({
  page,
}) => {
  await page.goto('/demo');
  const title = page.getByLabel('Title', { exact: true });
  await title.fill('Retained field draft');
  await page.getByRole('button', { name: 'Image study', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Discard record changes?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(title).toHaveValue('Retained field draft');
  await expect(page.getByLabel('Record ID')).toHaveValue('field-guide');
  await page.getByRole('button', { name: 'Field guide', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Image study', exact: true }).click();
  await dialog.getByRole('button', { name: 'Discard changes' }).click();
  await expect(title).toHaveValue('Image study');
  await page.getByRole('button', { name: 'Field guide', exact: true }).click();
  await expect(title).toHaveValue('Field guide');
  await title.fill('Acknowledged record');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  await page.getByRole('button', { name: 'Image study', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Acknowledged record', exact: true }).click();
  await expect(title).toHaveValue('Acknowledged record');
});
test('opening a page or leaving the module asks before discarding record edits', async ({
  page,
}) => {
  await page.goto('/demo');
  await page.getByLabel('Title', { exact: true }).fill('Pending fields');
  await page.getByRole('link', { name: 'Create item page', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Discard record changes?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/demo$/u);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Pending fields');
  await page
    .locator('.ui-studio-sidebar')
    .getByRole('link', { name: 'Overview', exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
});
