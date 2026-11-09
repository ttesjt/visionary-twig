import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { selectStudioTheme } from './fixtures/resource-controls';
import type { APIResponse } from '@playwright/test';
import { MAX_PREVIEW_REQUEST_BYTES } from '../../src/preview/preview-policy';
import { document, applyDocument } from './fixtures/document';

async function previewUrl(response: APIResponse): Promise<string> {
  expect(response.status()).toBe(201);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('url' in body) || typeof body.url !== 'string')
    throw new Error('Missing preview URL');
  return body.url;
}
test('real SSR preview has no editor CSS and no cache/indexing, including without JavaScript', async ({
  browser,
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Missing baseURL');
  const url = await previewUrl(
    await page.request.post('/api/preview', {
      headers: { origin: baseURL },
      data: { document, context: {} },
    })
  );
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const preview = await context.newPage();
    const response = await preview.goto(url);
    expect(response?.headers()['cache-control']).toContain('no-store');
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(
      preview.getByRole('heading', { name: 'Neutral bound title', exact: true })
    ).toBeVisible();
    await expect(preview.getByRole('button', { name: 'Save document', exact: true })).toHaveCount(
      0
    );
    const urls = await preview.locator('link[rel="stylesheet"]').evaluateAll((links) =>
      links.map((link) => {
        if (!(link instanceof HTMLLinkElement)) throw new Error('Expected CSS link');
        return link.href;
      })
    );
    expect(urls.length).toBeGreaterThan(0);
    for (const stylesheet of urls) {
      const css = await (await page.request.get(stylesheet)).text();
      expect(css).not.toContain('--puck-');
      expect(css).not.toContain('.ui-puck-field');
    }
  } finally {
    await context.close();
  }
});

test('preview uses the actual iframe viewport and light/dark/system modes', async ({ page }) => {
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await page.getByRole('button', { name: 'Refresh actual preview' }).click();
  const frame = page.frameLocator('iframe[title="Actual content page"]');
  await expect(
    frame.getByRole('heading', { name: 'Neutral bound title', exact: true })
  ).toBeVisible();
  await page.getByLabel('Preview viewport', { exact: true }).selectOption('390');
  const grid = frame.locator('.ui-grid');
  await expect(grid).toHaveCSS('grid-template-columns', /[\d.]+px$/);
  expect(await grid.evaluate(() => window.innerWidth)).toBe(390);
  expect(
    await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
    )
  ).toBe(1);
  await page.getByLabel('Preview viewport', { exact: true }).selectOption('1280');
  expect(await grid.evaluate(() => window.innerWidth)).toBe(1280);
  expect(
    await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
    )
  ).toBe(2);
  for (const [theme, color] of [
    ['dark', 'rgb(17, 17, 17)'],
    ['light', 'rgb(250, 250, 250)'],
  ] as const) {
    await selectStudioTheme(page, theme);
    await expect(frame.locator('main')).toHaveAttribute('data-theme', theme);
    await expect(frame.locator('main')).toHaveCSS('background-color', color);
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await selectStudioTheme(page, 'system');
  await page.getByRole('button', { name: 'Refresh actual preview' }).click();
  await expect(frame.locator('main')).toHaveAttribute('data-theme', 'system');
  await expect(frame.locator('main')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
});

test('preview POST rejects wrong/missing origin, unsafe input, malformed UTF-8 and oversized requests', async ({
  request,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Missing baseURL');
  expect((await request.post('/api/preview', { data: { document } })).status()).toBe(403);
  expect(
    (
      await request.post('/api/preview', {
        headers: { origin: 'https://elsewhere.test' },
        data: { document },
      })
    ).status()
  ).toBe(403);
  expect(
    (
      await request.post('/api/preview', {
        headers: { origin: baseURL, 'content-type': 'text/plain' },
        data: '{}',
      })
    ).status()
  ).toBe(415);
  const headers = { origin: baseURL, 'content-type': 'application/json' };
  expect((await request.post('/api/preview', { headers, data: Buffer.from([255]) })).status()).toBe(
    400
  );
  expect(
    (
      await request.post('/api/preview', {
        headers,
        data: ' '.repeat(MAX_PREVIEW_REQUEST_BYTES + 1),
      })
    ).status()
  ).toBe(413);
  expect(
    (await request.post('/api/preview', { headers, data: { document, context: [] } })).status()
  ).toBe(422);
  expect(
    (
      await request.post('/api/preview', {
        headers,
        data: { document, url: 'file:///private/file' },
      })
    ).status()
  ).toBe(422);
});

test('missing or expired preview IDs explain recovery', async ({ page }) => {
  await page.goto('/preview/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('heading', { name: 'Preview unavailable' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('server restarted');
});

test('missing media retains dimensions and a readable failure state', async ({ page, baseURL }) => {
  if (!baseURL) throw new Error('Missing baseURL');
  const media = {
    ...document,
    bindings: [],
    data: {
      root: {},
      content: [
        {
          type: 'MediaFigure',
          props: {
            id: 'missing',
            image: {
              id: 'resource',
              src: '/missing-resource.png',
              alt: 'Missing illustration',
              width: 1200,
              height: 800,
              caption: 'Retained caption',
            },
          },
        },
      ],
    },
  };
  const url = await previewUrl(
    await page.request.post('/api/preview', {
      headers: { origin: baseURL },
      data: { document: media },
    })
  );
  await page.goto(url);
  await expect(page.locator('.ui-media-failure')).toBeVisible();
  await expect(page.getByText('Retained caption', { exact: true })).toBeVisible();
  const frame = page.locator('.ui-media-frame');
  const box = await frame.boundingBox();
  expect(box?.height).toBeGreaterThan(0);
});
