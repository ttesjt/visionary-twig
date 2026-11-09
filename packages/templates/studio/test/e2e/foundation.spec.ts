import { expect, test } from '@playwright/test';

test('the Studio foundation emits prepared metadata and its indexing policy without JavaScript', async ({
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Expected browser base URL.');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    expect((await page.goto('/en'))?.status()).toBe(200);
    await expect(page).toHaveTitle('Content Studio');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'A local workspace for editing and previewing content.'
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex.*nofollow/
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Content Studio'
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /icon\.svg/);
  } finally {
    await context.close();
  }
});

for (const route of ['/en/missing/section', '/?lang=unsupported']) {
  test(
    'the localized 404 returns its status and recovers at ' + route,
    async ({ browser, baseURL }) => {
      if (!baseURL) throw new Error('Expected browser base URL.');
      const context = await browser.newContext({ baseURL });
      try {
        const page = await context.newPage();
        expect((await page.goto(route))?.status()).toBe(404);
        await expect(
          page.getByRole('heading', { name: 'Page not found', exact: true })
        ).toBeVisible();
        const home = page.getByRole('link', { name: 'Back to home', exact: true });
        await expect(home).toHaveAttribute('href', '/');
        await home.click();
        await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
      } finally {
        await context.close();
      }
    }
  );
}
