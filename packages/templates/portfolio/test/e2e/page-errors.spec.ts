import { expect } from '@playwright/test';
import { test } from './fixtures/portfolio';

const messages = {
  en: {
    title: 'Page not found',
    home: '/',
    label: 'Back to home',
    welcome: 'Small projects, made with care.',
  },
  zh: { title: '找不到页面', home: '/?lang=zh', label: '返回首页', welcome: '用心做的小项目。' },
} as const;

const routes = [
  { path: '/unknown-page', locale: 'en' },
  { path: '/unknown-page?lang=zh', locale: 'zh' },
  { path: '/zh/unknown/nested', locale: 'zh' },
  { path: '/not-found', locale: 'en' },
  { path: '/?lang=unknown', locale: 'en' },
  { path: '/zh?lang=en', locale: 'en' },
] as const;

for (const [mode, javaScriptEnabled] of [
  ['with JavaScript', true],
  ['without JavaScript', false],
] as const) {
  test.describe(mode, () => {
    test.use({ javaScriptEnabled, viewport: { width: 320, height: 800 } });

    for (const { path, locale } of routes) {
      test('404 returns localized HTML and recovers at ' + path, async ({ page }) => {
        const text = messages[locale];
        const response = await page.goto(path);
        expect(response?.status()).toBe(404);
        await expect(page).toHaveURL(path);
        await expect(page).toHaveTitle(text.title);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.getByRole('heading', { name: text.title, exact: true })).toBeVisible();
        const home = page.getByRole('link', { name: text.label, exact: true });
        await expect(home).toHaveAttribute('href', text.home);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        );
        await home.click();
        await expect(page.getByRole('heading', { name: text.welcome, exact: true })).toBeVisible();
      });
    }
  });
}
