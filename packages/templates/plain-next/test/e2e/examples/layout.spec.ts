import { expect, test } from '@playwright/test';

for (const entry of [
  {
    home: '/',
    title: 'Layout with Row and Column',
    examples: 'Starter examples',
    back: 'Back to home',
    suffix: '',
  },
  {
    home: '/?lang=zh',
    title: '用 Row 和 Column 布局',
    examples: '模板示例',
    back: '返回首页',
    suffix: '?lang=zh',
  },
]) {
  test(
    'layout example opens and returns in the same language from ' + entry.home,
    async ({ page }) => {
      await page.goto(entry.home);
      await page.getByRole('navigation').getByRole('link', { name: entry.title }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title);
      const links = page.getByRole('navigation', { name: entry.examples }).getByRole('link');
      await expect(links).toHaveCount(3);
      await expect(links.first()).toHaveAttribute(
        'href',
        '/examples/event-tracking' + entry.suffix
      );
      await page.getByRole('link', { name: entry.back }).click();
      await expect(
        page.getByRole('navigation').getByRole('link', { name: entry.title })
      ).toBeVisible();
    }
  );
}

test('Column spaces the preview and Row wraps links as the available width changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto('/examples/layout');
  const preview = page.getByRole('navigation', { name: 'Starter examples' });
  const links = preview.getByRole('link');
  const top = (index: number) =>
    links.nth(index).evaluate((link) => link.getBoundingClientRect().top);
  const first = await top(0);
  expect(await top(1)).toBe(first);
  expect(await top(2)).toBe(first);
  const headingBottom = await preview
    .getByRole('heading')
    .evaluate((heading) => heading.getBoundingClientRect().bottom);
  expect(first).toBeGreaterThan(headingBottom);

  // At this width two links share a line and only the third wraps.
  await page.setViewportSize({ width: 600, height: 800 });
  const narrowFirst = await top(0);
  expect(await top(1)).toBe(narrowFirst);
  expect(await top(2)).toBeGreaterThan(narrowFirst);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await top(2)).toBeGreaterThan(await top(0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('host CSS can override the default Row spacing token', async ({ page }) => {
  await page.goto('/examples/layout');
  const row = page.getByRole('navigation', { name: 'Starter examples' }).locator('.ui-row');
  await expect(row).toHaveCSS('column-gap', '16px');
  await page.addStyleTag({
    content: '.example-layout-preview { --ui-layout-space-content: 26px; }',
  });
  await expect(row).toHaveCSS('column-gap', '26px');
});
