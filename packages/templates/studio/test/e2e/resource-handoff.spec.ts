import { expect } from '@playwright/test';
import { test } from './fixtures/studio';

test('the localized workbench renders prepared Studio text and demo records without JavaScript', async ({
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Missing Studio test URL.');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const path of ['/demo', '/en/demo']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle('Content Studio');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(
        page
          .getByRole('region', { name: 'Card preview' })
          .getByRole('heading', { name: 'Field guide' })
      ).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

test('Studio hydrates and edits from the server snapshot with resource HTTP disabled', async ({
  page,
}) => {
  const resourceRequests: string[] = [];
  await page.route('**/resources/**', async (route) => {
    resourceRequests.push(route.request().url());
    await route.abort();
  });
  await page.goto('/en/demo');
  const title = page.getByLabel('Title', { exact: true });
  await title.fill('Hydrated field notes');
  await expect(page.getByRole('region', { name: 'Card preview' })).toContainText(
    'Hydrated field notes'
  );
  expect(resourceRequests).toEqual([]);
});
