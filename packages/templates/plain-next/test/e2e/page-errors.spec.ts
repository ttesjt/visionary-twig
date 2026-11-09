import { expect, test } from '@playwright/test';

for (const entry of [
  { path: '/unknown-page', title: 'Page not found', home: '/', label: 'Back to home' },
  { path: '/unknown-page?lang=zh', title: '找不到页面', home: '/?lang=zh', label: '返回首页' },
  { path: '/zh/unknown/nested', title: '找不到页面', home: '/?lang=zh', label: '返回首页' },
  { path: '/not-found', title: 'Page not found', home: '/', label: 'Back to home' },
  { path: '/?lang=unknown', title: 'Page not found', home: '/', label: 'Back to home' },
  { path: '/zh/?lang=en', title: 'Page not found', home: '/', label: 'Back to home' },
]) {
  test('404 returns its status and recovers at ' + entry.path, async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('Browser base URL is required.');
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 320, height: 800 },
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(entry.path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: entry.title, exact: true })).toBeVisible();
      const home = page.getByRole('link', { name: entry.label, exact: true });
      await expect(home).toHaveAttribute('href', entry.home);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await home.click();
      await expect(
        page.getByRole('heading', {
          name: entry.home.includes('zh') ? '欢迎。' : 'Welcome.',
          exact: true,
        })
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
}
