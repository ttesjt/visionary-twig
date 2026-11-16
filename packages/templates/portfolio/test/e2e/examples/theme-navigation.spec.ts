import { expect, test } from '@playwright/test';
import { hydrationErrors } from '../fixtures/theme';

test('theme preference survives client navigation through examples', async ({ page }) => {
  test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
  const errors = hydrationErrors(page);
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
  await page.getByRole('link', { name: 'Remote settings example', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Remote settings', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('dark');
  expect(errors).toEqual([]);
});
