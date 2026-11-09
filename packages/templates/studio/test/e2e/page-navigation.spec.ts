import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { applySection, openJson, returnToPage } from './fixtures/editing';

test('untouched independent pages leave freely while real content edits retain discard protection', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await expect(page.getByRole('region', { name: 'Page controls', exact: true })).toBeVisible();
  const leave = page.getByRole('dialog', { name: 'Leave this editing session?', exact: true });
  await page.getByRole('link', { name: 'Back to Pages', exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/pages$/u);
  await expect(leave).toBeHidden();
  await page.getByRole('link', { name: 'New page', exact: true }).click();
  await applySection(page, 'context', { changed: true });
  await page.getByRole('link', { name: 'Back to Pages', exact: true }).click();
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: 'Keep editing', exact: true }).click();
  const input = await openJson(page, 'context');
  await expect(input).toHaveValue(/changed/u);
  await page.getByRole('button', { name: 'undo', exact: true }).click();
  await expect(input).toHaveValue('{}');
  await returnToPage(page);
  await page.getByRole('link', { name: 'Back to Pages', exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/pages$/u);
  await expect(leave).toBeHidden();
});
