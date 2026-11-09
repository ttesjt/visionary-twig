import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const sampleImage = fileURLToPath(new URL('../../public/samples/media/lake.png', import.meta.url));
test('nested upload keeps the shell and sidebar entry while drafts do not create records', async ({
  page,
}) => {
  await page.goto('/demo');
  const shell = await page.locator('.ui-studio-shell').elementHandle();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await page.getByRole('link', { name: 'Create record', exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/upload$/u);
  expect(await shell?.evaluate((node) => node === document.querySelector('.ui-studio-shell'))).toBe(
    true
  );
  await expect(
    page.locator('.ui-studio-sidebar').getByRole('link', { name: 'Demo', exact: true })
  ).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('Title', { exact: true }).fill('Unsubmitted draft');
  await page.getByLabel('Image source').selectOption('file');
  await page.getByLabel('Image file', { exact: true }).setInputFiles(sampleImage);
  await page.getByRole('link', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/u);
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Unsubmitted draft' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Create record', exact: true }).click();
  // The active global entry must still return from a child route to its root.
  await page.locator('.ui-studio-sidebar').getByRole('link', { name: 'Demo', exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/u);
});
test('publishes a record without an image, selects it on return, and resets only on refresh', async ({
  page,
}) => {
  await page.goto('/demo/upload');
  await page.getByLabel('Title', { exact: true }).fill('Created without image');
  await page.getByLabel('Summary', { exact: true }).fill('Created by the demo workflow.');
  await page.getByRole('button', { name: 'Publish demo record' }).click();
  await expect(page).toHaveURL(/\/demo$/u);
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Created without image');
  await expect(
    page.getByRole('region', { name: 'Card preview', exact: true }).locator('img')
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Create record', exact: true }).click();
  await page.getByRole('link', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('tbody tr')).toHaveCount(3);
});
test('file publication keeps its stored Blob URL alive after the upload page and preview unmount', async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) requests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/demo/upload');
  await page.getByLabel('Title', { exact: true }).fill('Uploaded cover');
  await page.getByLabel('Image source').selectOption('file');
  await page.getByLabel('Image file', { exact: true }).setInputFiles(sampleImage);
  const preview = page.getByRole('region', { name: 'Card preview', exact: true });
  await expect(preview.locator('img')).toHaveAttribute('src', /^blob:/u);
  await page.getByRole('button', { name: 'Publish demo record' }).click();
  await expect(page).toHaveURL(/\/demo$/u);
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: 'Uploaded cover', exact: true }) });
  const url = await row.getByRole('link', { name: 'Open image' }).getAttribute('href');
  expect(url).toMatch(/^blob:/u);
  if (!url) throw new Error('Missing uploaded image reference.');
  const image = page.getByRole('region', { name: 'Card preview', exact: true }).locator('img');
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate((node) => (node instanceof HTMLImageElement ? node.naturalWidth : 0))
    )
    .toBeGreaterThan(0);
  expect(await image.getAttribute('src')).toBe(url);
  await page.getByRole('link', { name: 'Create record', exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/upload$/u);
  await page.getByLabel('Title', { exact: true }).fill('Reused cover');
  await page.getByLabel('Image source').selectOption('url');
  await page.getByLabel('Image URL', { exact: true }).fill(url);
  await page.getByRole('button', { name: 'Publish demo record' }).click();
  await expect(page).toHaveURL(/\/demo$/u);
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await expect(page.getByLabel('Image URL', { exact: true })).toHaveValue(url);
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate((node) => (node instanceof HTMLImageElement ? node.naturalWidth : 0))
    )
    .toBeGreaterThan(0);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
test('URL mode reuses an existing image path and invalid input never creates a record', async ({
  page,
}) => {
  await page.goto('/demo/upload');
  await page.getByLabel('Title', { exact: true }).fill('URL cover');
  await page.getByLabel('Image source').selectOption('url');
  await page.getByLabel('Image URL', { exact: true }).fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Publish demo record' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Check the title' })).toBeVisible();
  await expect(page).toHaveURL(/\/demo\/upload$/u);
  await page.getByLabel('Image URL', { exact: true }).fill('/samples/media/rings.svg');
  await page.getByRole('button', { name: 'Publish demo record' }).click();
  await expect(page).toHaveURL(/\/demo$/u);
  await expect(page.locator('tbody tr')).toHaveCount(4);
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: 'URL cover', exact: true }) });
  await expect(row.getByRole('link', { name: 'Open image' })).toHaveAttribute(
    'href',
    '/samples/media/rings.svg'
  );
});
for (const width of [320, 1440]) {
  test(
    'upload route is usable at ' + width + 'px and unknown child routes remain 404s',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/demo/upload');
      await expect(page.getByRole('button', { name: 'Publish demo record' })).toBeVisible();
      const publishBounds = await page
        .getByRole('button', { name: 'Publish demo record' })
        .boundingBox();
      const cancelBounds = await page
        .getByRole('link', { name: 'Cancel', exact: true })
        .boundingBox();
      if (!publishBounds || !cancelBounds) throw new Error('Missing publication actions.');
      expect(
        cancelBounds.x > publishBounds.x + publishBounds.width ||
          cancelBounds.y > publishBounds.y + publishBounds.height
      ).toBe(true);
      await page.getByLabel('Title', { exact: true }).fill('Long title '.repeat(10));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      expect((await page.goto('/demo/not-a-route'))?.status()).toBe(404);
      expect((await page.goto('/demonstration/upload'))?.status()).toBe(404);
    }
  );
}
