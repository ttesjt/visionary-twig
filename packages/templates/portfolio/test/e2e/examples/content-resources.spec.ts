import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { jsonResourceManifestSchema } from '@frontend/prepared-data/resource';
const jsonResources = '**/resources/json/**';
const notesResources = '**/resources/json/content/*/making-notes.json';

for (const [locale, heading, titles] of [
  ['en', 'Works', ['Paper Study (2026)', 'Folded Light (2025)']],
  ['zh', '作品', ['纸上习作 (2026)', '折叠之光 (2025)']],
] as const) {
  test(`content ${locale} SSR includes base and page data without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    if (!baseURL) throw new Error('Browser base URL is required.');
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto('/examples/content?lang=' + locale);
      await expect(page.getByRole('heading', { name: 'Field Notes', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByTestId('catalog').getByRole('listitem')).toHaveText([...titles]);
      await expect(page.getByTestId('making-notes')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
}
test('switches resolved titles in place using the same Content without refetching it', async ({
  page,
}) => {
  const reads: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/resources/json/content/')) reads.push(req.url());
  });
  await page.goto('/examples/content');
  const works = page.getByTestId('catalog').getByRole('listitem');
  await expect(works).toHaveText(['Paper Study (2026)', 'Folded Light (2025)']);
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(works).toHaveText(['纸上习作 (2026)', '折叠之光 (2025)']);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(works).toHaveText(['Paper Study (2026)', 'Folded Light (2025)']);
  expect(reads).toEqual([]);
});
test('content SSR hydrates without JSON reads and loads a local namespace only after click', async ({
  page,
}) => {
  const reads: string[] = [];
  const errors: string[] = [];
  let release = () => {};
  const hold = new Promise<void>((done) => {
    release = done;
  });
  await page.route(jsonResources, async (route) => {
    reads.push(route.request().url());
    if (route.request().url().endsWith('/making-notes.json')) await hold;
    await route.continue();
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/examples/content');
  await expect(page.getByTestId('catalog')).toContainText('Paper Study');
  expect(reads).toEqual([]);
  await page.getByRole('button', { name: 'Making notes', exact: true }).click();
  try {
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByTestId('making-notes')).toHaveCount(0);
    await expect(page.getByTestId('catalog')).toContainText('Paper Study');
    await expect.poll(() => reads.length).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByTestId('making-notes')).toContainText('Graphite on paper');
  await page.getByRole('button', { name: 'Making notes', exact: true }).click();
  await page.getByRole('button', { name: 'Making notes', exact: true }).click();
  await expect(page.getByTestId('making-notes')).toContainText('Graphite on paper');
  expect(reads).toHaveLength(1);
  expect(errors).toEqual([]);
});
for (const failure of ['network', 'invalid-data'] as const) {
  test(`lazy content ${failure} stays local and retries successfully`, async ({ page }) => {
    let fail = true;
    await page.route(notesResources, async (route) => {
      if (!fail) return route.continue();
      if (failure === 'network') return route.abort();
      return route.fulfill({ contentType: 'application/json', body: '{"entries":false}' });
    });
    await page.goto('/examples/content');
    await page.getByRole('button', { name: 'Making notes', exact: true }).click();
    const section = page.getByRole('region', { name: 'Making notes' });
    await expect(section.getByRole('alert')).toContainText(failure);
    await expect(page.getByTestId('catalog')).toContainText('Paper Study');
    await expect(page.getByTestId('making-notes')).toHaveCount(0);
    fail = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByTestId('making-notes')).toContainText('Graphite on paper');
  });
}
test('collapsing a pending section does not allow late completion to reopen it', async ({
  page,
}) => {
  let release = () => {};
  const hold = new Promise<void>((done) => {
    release = done;
  });
  let started = false;
  await page.route(notesResources, async (route) => {
    started = true;
    await hold;
    await route.continue();
  });
  await page.goto('/examples/content');
  const button = page.getByRole('button', { name: 'Making notes', exact: true });
  await button.click();
  await expect.poll(() => started).toBe(true);
  await button.click();
  release();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('making-notes')).toHaveCount(0);
  await button.click();
  await expect(page.getByTestId('making-notes')).toContainText('Graphite on paper');
});
test('home excludes page/section data and Content stays out of client JavaScript', async ({
  request,
}) => {
  // The id field distinguishes the raw record from text keys and from notes' workId.
  // Match object literals, serialized JSON and escaped JSON inside Next's HTML payload.
  const rawCatalogWork = /\bid(?:\\?["'])?\s*:\s*\\?["']paper-study\\?["']/;
  const html = await (await request.get('/')).text();
  expect(html).toContain('Explore Field Notes');
  expect(html).not.toMatch(rawCatalogWork);
  expect(html).not.toContain('Paper Study');
  expect(html).not.toContain('Graphite on paper');
  const page = await (await request.get('/examples/content')).text();
  expect(page).toMatch(rawCatalogWork);
  expect(page).toContain('Paper Study');
  expect(page).not.toContain('Graphite on paper');
  let code = '';
  function scan(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (file.endsWith('.js')) code += readFileSync(file, 'utf8');
    }
  }
  scan(path.resolve(import.meta.dirname, '../../../.next/static'));
  expect(code.length).toBeGreaterThan(0);
  expect(code).not.toMatch(rawCatalogWork);
  expect(code).not.toContain('Paper Study');
  expect(code).not.toContain('Graphite on paper');
  const manifest: unknown = JSON.parse(
    readFileSync(
      path.resolve(import.meta.dirname, '../../../.next/prerender-manifest.json'),
      'utf8'
    )
  );
  expect(manifest).toMatchObject({
    routes: {
      '/en/examples/content': expect.any(Object),
      '/zh/examples/content': expect.any(Object),
    },
  });
});
test('JSON HTTP delivery only exposes declared namespaces at their current versions', async ({
  request,
}) => {
  for (const [kind, namespace] of [
    ['config', 'app'],
    ['content', 'catalog'],
  ] as const) {
    const manifest = jsonResourceManifestSchema.parse(
      JSON.parse(
        readFileSync(
          path.resolve(import.meta.dirname, '../../../.generated', kind, 'resources.json'),
          'utf8'
        )
      )
    );
    const version = manifest.resources[namespace]?.version;
    if (!version) throw new Error('Missing prepared namespace');
    const prefix = '/resources/json/' + kind + '/' + version + '/';
    const result = await request.get(prefix + namespace + '.json');
    expect(result.status()).toBe(200);
    expect(result.headers()['cache-control']).toContain('immutable');
    for (const file of [
      'prepared.json',
      'manifest.json',
      'resources.json',
      'unknown.json',
      namespace,
    ])
      expect((await request.get(prefix + file)).status()).toBe(404);
    expect(
      (await request.get('/resources/json/' + kind + '/stale/' + namespace + '.json')).status()
    ).toBe(404);
  }
  expect((await request.get('/resources/json/private/1/base.json')).status()).toBe(404);
});
