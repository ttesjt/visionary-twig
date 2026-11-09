import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
test('opens a neutral local workbench without fixture credentials and local project file controls', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await expect(page.getByRole('region', { name: 'Page controls', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Document is valid.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
});
