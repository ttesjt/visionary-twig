import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { applyDocument } from './fixtures/document';
import { STUDIO_THEME_COOKIE_NAME } from '../../src/theme/theme-preference';

const scheme = process.env.UI_THEME_POLICY;
test('fixed theme policy governs workbench and adversarial preview URLs', async ({
  page,
  browser,
  baseURL,
}) => {
  if (scheme !== 'light' && scheme !== 'dark') return test.skip();
  if (!baseURL) throw new Error('Expected a browser base URL.');
  const opposite = scheme === 'light' ? 'dark' : 'light';
  await page
    .context()
    .addCookies([{ name: STUDIO_THEME_COOKIE_NAME, value: opposite, url: baseURL }]);
  await page.emulateMedia({ colorScheme: opposite });
  await page.goto('/demo/pages/new');
  await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
  await expect(page.locator('.ui-studio-shell')).toHaveAttribute('data-theme', scheme);
  await expect(page.getByLabel('Preview theme', { exact: true })).toHaveCount(0);
  expect(
    (await page.context().cookies()).find((item) => item.name === STUDIO_THEME_COOKIE_NAME)?.value
  ).toBe(opposite);
  await applyDocument(page);
  await page.getByRole('button', { name: 'Refresh actual preview' }).click();
  const iframe = page.locator('iframe[title="Actual content page"]');
  const frame = page.frameLocator('iframe[title="Actual content page"]');
  await expect(frame.locator('main')).toHaveAttribute('data-theme', scheme);
  await expect(frame.locator('main')).toHaveCSS('color-scheme', scheme);
  const source = await iframe.getAttribute('src');
  if (!source) throw new Error('Expected a resolved preview URL.');
  const url = new URL(source, baseURL);
  url.searchParams.set('theme', opposite);
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: opposite });
  try {
    const preview = await context.newPage();
    await preview.goto(url.href);
    await expect(preview.locator('html')).toHaveAttribute('data-theme', scheme);
    await expect(preview.locator('main')).toHaveAttribute('data-theme', scheme);
    await expect(
      preview.getByRole('heading', { name: 'Neutral bound title', exact: true })
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
