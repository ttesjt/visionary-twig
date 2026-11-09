import { expect, test } from '@playwright/test';

for (const entry of [
  {
    path: '/en',
    title: 'Plain Next.js',
    description: 'A clean Next.js starting point.',
    locale: 'en_US',
    alt: 'Abstract shapes on a dark background.',
  },
  {
    path: '/zh',
    title: '简洁的 Next.js',
    description: '一个干净的 Next.js 起点。',
    locale: 'zh_CN',
    alt: '深色背景上的抽象几何图形。',
  },
]) {
  test(
    'metadata is complete in server HTML without JavaScript at ' + entry.path,
    async ({ browser, baseURL }) => {
      if (!baseURL) throw new Error('Browser base URL is required.');
      const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
      try {
        const page = await context.newPage();
        expect((await page.goto(entry.path))?.status()).toBe(200);
        await expect(page).toHaveTitle(entry.title);
        const head = page.locator('head');
        await expect(head.locator('meta[name="description"]')).toHaveAttribute(
          'content',
          entry.description
        );
        await expect(head.locator('meta[property="og:title"]')).toHaveAttribute(
          'content',
          entry.title
        );
        await expect(head.locator('meta[property="og:locale"]')).toHaveAttribute(
          'content',
          entry.locale
        );
        const origin = process.env.SITE_URL;
        if (!origin)
          throw new Error('Use the root browser runner to provide the test site origin.');
        await expect(head.locator('link[rel="canonical"]')).toHaveAttribute(
          'href',
          origin + entry.path
        );
        for (const language of ['en', 'zh'])
          await expect(
            head.locator(`link[rel="alternate"][hreflang="${language}"]`)
          ).toHaveAttribute('href', origin + '/' + language);
        await expect(head.locator('meta[property="og:image"]')).toHaveAttribute(
          'content',
          origin + '/metadata/share.png'
        );
        await expect(head.locator('meta[property="og:image:alt"]')).toHaveAttribute(
          'content',
          entry.alt
        );
        await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute(
          'content',
          'summary_large_image'
        );
        const icon = await head.locator('link[rel="icon"]').first().getAttribute('href');
        expect(icon).toBeTruthy();
        expect((await context.request.get(icon ?? '/icon.svg')).status()).toBe(200);
      } finally {
        await context.close();
      }
    }
  );
}
test('child pages do not inherit the homepage canonical and supplied images are real assets', async ({
  page,
  request,
}) => {
  await page.goto('/examples/event-tracking');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const image = await request.get('/metadata/share.png');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/png');
  expect((await image.body()).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  );
});
