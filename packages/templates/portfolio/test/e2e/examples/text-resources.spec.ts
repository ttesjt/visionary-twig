import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { textResourceManifestSchema } from '@frontend/text-catalog/resource';
import { DEFAULT_RESOURCE_TIMEOUT_MS } from '@frontend/resource-runtime';
const TITLE_EN = 'Ready to explore.';
const TITLE_ZH = '准备好探索了。';
const resources = '**/resources/text/**';
declare global {
  interface Window {
    textTrace: {
      locale: string | null;
      content: string;
      layoutLocale: string | null;
      layoutContent: string;
      documentLocale: string;
    }[];
  }
}
async function observe(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.textTrace = [];
    new MutationObserver(() => {
      const section = document.querySelector('[data-testid="text-content"]');
      if (section)
        window.textTrace.push({
          locale: section.getAttribute('lang'),
          content: section.textContent ?? '',
          layoutLocale:
            document.querySelector('[data-testid="layout-greeting"]')?.getAttribute('lang') ?? null,
          layoutContent:
            document.querySelector('[data-testid="layout-greeting"]')?.textContent ?? '',
          documentLocale: document.documentElement.lang,
        });
    }).observe(document, { subtree: true, childList: true, attributes: true });
  });
}
async function assertAtomic(page: import('@playwright/test').Page) {
  const trace = await page.evaluate(() => window.textTrace);
  expect(trace.length).toBeGreaterThan(0);
  for (const frame of trace) {
    expect(frame.content).not.toMatch(/(?:main|demo)\.(?:title|description|heading|actions)/);
    expect(frame.layoutLocale).toBe(frame.locale);
    expect(frame.documentLocale).toBe(frame.locale);
    if (frame.locale === 'en') {
      expect(frame.layoutContent).toBe('Welcome.');
      expect(frame.content).toContain(TITLE_EN);
      expect(frame.content).toContain('Text resources');
      expect(frame.content).not.toContain(TITLE_ZH);
    }
    if (frame.locale === 'zh') {
      expect(frame.layoutContent).toBe('欢迎。');
      expect(frame.content).toContain(TITLE_ZH);
      expect(frame.content).toContain('文案资源');
      expect(frame.content).not.toContain(TITLE_EN);
    }
  }
}
for (const [locale, title] of [
  ['en', TITLE_EN],
  ['zh', TITLE_ZH],
] as const) {
  test(`text SSR renders ${locale} without JavaScript`, async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('Browser base URL is required.');
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    try {
      const page = await context.newPage();
      await page.goto(`/examples/text/ssr?lang=${locale}`);
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(page.getByTestId('text-content')).toHaveAttribute('lang', locale);
    } finally {
      await context.close();
    }
  });
}
test('text SSR snapshot hydrates without dictionary requests or missing-text frames', async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  await observe(page);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat|did not match|server rendered/i.test(message.text()))
      errors.push(message.text());
  });
  await page.route(resources, async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });
  await page.goto('/examples/text/ssr?lang=en');
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByTestId('text-count')).toHaveText('1');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await assertAtomic(page);
});
test('text SSR parallel language requests remain isolated and snapshots are scoped', async ({
  request,
}) => {
  const [en, zh] = await Promise.all([
    request.get('/examples/text/ssr?lang=en'),
    request.get('/examples/text/ssr?lang=zh'),
  ]);
  const enHtml = await en.text();
  const zhHtml = await zh.text();
  expect(enHtml).toContain(TITLE_EN);
  expect(enHtml).not.toContain(TITLE_ZH);
  expect(zhHtml).toContain(TITLE_ZH);
  expect(zhHtml).not.toContain(TITLE_EN);
});
test('text CSR HTML contains no page-specific dictionary or content', async ({ request }) => {
  const response = await request.get('/examples/text/csr?lang=zh');
  const html = await response.text();
  expect(response.ok()).toBe(true);
  expect(html).not.toContain(TITLE_EN);
  expect(html).not.toContain(TITLE_ZH);
  expect(html).not.toMatch(/rel="preload"[^>]*as="fetch"/);
});
test('text CSR waits for its extra namespace and reuses the layout snapshot without preload', async ({
  page,
}) => {
  await observe(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const reads: string[] = [];
  await page.route(resources, async (route) => {
    reads.push(route.request().url());
    if (route.request().url().endsWith('/demo.json')) await gate;
    await route.continue();
  });
  try {
    await page.goto('/examples/text/csr?lang=en');
    await expect(page.getByRole('status').filter({ hasText: 'Preparing resources' })).toBeVisible();
    await expect(page.getByTestId('text-content')).toHaveCount(0);
    await expect.poll(() => reads.length).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
  expect(reads.some((url) => url.includes('/zh/') || url.includes('unused'))).toBe(false);
  await assertAtomic(page);
});
for (const mode of ['ssr', 'csr']) {
  test(`text ${mode} switches languages atomically while preserving state and cache`, async ({
    page,
  }) => {
    await observe(page);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reads: string[] = [];
    await page.route(resources, async (route) => {
      reads.push(route.request().url());
      if (route.request().url().includes('/zh/') && route.request().url().endsWith('/demo.json'))
        await gate;
      await route.continue();
    });
    await page.goto(`/examples/text/${mode}?lang=en`);
    await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
    await page.getByTestId('text-note').fill('kept');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const before = reads.length;
    await page.getByRole('button', { name: '中文', exact: true }).click();
    try {
      await expect(page.getByTestId('text-status')).toHaveText('Preparing language…');
      await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
      await expect(page.getByTestId('text-content')).toHaveAttribute('lang', 'en');
    } finally {
      release();
    }
    await expect(page.getByRole('heading', { name: TITLE_ZH, exact: true })).toBeVisible();
    await expect(page.getByTestId('text-note')).toHaveValue('kept');
    await expect(page.getByTestId('text-count')).toHaveText('1');
    expect(reads.length - before).toBe(2);
    const cached = reads.length;
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
    expect(reads).toHaveLength(cached);
    await assertAtomic(page);
  });
}
test('text stale language completion cannot reverse the latest choice', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await observe(page);
  await page.route('**/resources/text/*/zh/*.json', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/examples/text/ssr?lang=en');
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(page.getByTestId('text-status')).toHaveText('Preparing language…');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  release();
  await expect(page.getByTestId('text-status')).toHaveText('Ready');
  await expect(page.getByTestId('text-content')).toHaveAttribute('lang', 'en');
  await assertAtomic(page);
});
test('text CSR failures can retry without exposing incomplete content', async ({ page }) => {
  let offline = true;
  await page.route(resources, async (route) => {
    if (offline) await route.abort();
    else await route.continue();
  });
  await page.goto('/examples/text/csr?lang=en');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Resources could not be prepared' })
  ).toContainText('network');
  await expect(page.getByTestId('text-content')).toHaveCount(0);
  offline = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
});
for (const [kind, body] of [
  ['invalid-json', '{'],
  ['invalid-data', '{}'],
] as const) {
  test(`text CSR rejects ${kind} before content renders`, async ({ page }) => {
    await page.route('**/resources/text/*/en/demo.json', (route) =>
      route.fulfill({ contentType: 'application/json', body })
    );
    await page.goto('/examples/text/csr?lang=en');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Resources could not be prepared' })
    ).toContainText(kind);
    await expect(page.getByTestId('text-content')).toHaveCount(0);
  });
}
test('text typo in interpolation is rejected during resource preparation', async ({ page }) => {
  const source = readFileSync(
    path.resolve(import.meta.dirname, '../../../content/default/text/en/demo.json'),
    'utf8'
  );
  await page.route('**/resources/text/*/en/demo.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: source.replace('{name}', '{fileName}') })
  );
  await page.goto('/examples/text/csr?lang=en');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Resources could not be prepared' })
  ).toContainText('invalid-data');
  await expect(page.getByTestId('text-content')).toHaveCount(0);
});
test('text stalled request expires, clears pending and can retry', async ({ page }) => {
  await page.clock.install();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let stalled = true;
  let stalledRequests = 0;
  await page.route('**/resources/text/*/en/demo.json', async (route) => {
    if (stalled) {
      stalledRequests++;
      await gate;
    }
    await route.continue().catch(() => {});
  });
  await page.goto('/examples/text/csr?lang=en');
  await expect(page.getByRole('status').filter({ hasText: 'Preparing resources' })).toBeVisible();
  await expect.poll(() => stalledRequests).toBeGreaterThan(0);
  await page.clock.fastForward(DEFAULT_RESOURCE_TIMEOUT_MS + 1);
  await expect(
    page.getByRole('alert').filter({ hasText: 'Resources could not be prepared' })
  ).toContainText('timeout');
  stalled = false;
  release();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
});
test('SSR link uses the server snapshot even when browser dictionary requests would fail', async ({
  page,
}) => {
  await observe(page);
  const reads: string[] = [];
  await page.route(resources, async (route) => {
    reads.push(route.request().url());
    await route.abort('failed');
  });
  await page.goto('/examples/text');
  await page.getByRole('link', { name: 'SSR', exact: true }).click();
  await expect(page).toHaveURL(/\/examples\/text\/ssr/);
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
  expect(reads).toEqual([]);
  await assertAtomic(page);
});

test('a failed CSR warmup reaches the destination and recovers there on retry', async ({
  page,
}) => {
  let offline = true;
  const reads: string[] = [];
  await page.route(resources, async (route) => {
    reads.push(route.request().url());
    if (offline) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/examples/text');
  await page.getByRole('link', { name: 'CSR', exact: true }).click();
  await expect(page).toHaveURL(/\/examples\/text\/csr/);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('network');
  await expect(page.getByTestId('text-content')).toHaveCount(0);
  expect(reads.filter((url) => url.endsWith('/demo.json')).length).toBeGreaterThanOrEqual(2);
  offline = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
});

test('text controlled navigation prepares the destination and reuses the scoped cache', async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const reads: string[] = [];
  await page.route(resources, async (route) => {
    reads.push(route.request().url());
    await gate;
    await route.continue();
  });
  await page.goto('/examples/text');
  await page.getByRole('link', { name: 'CSR', exact: true }).click();
  try {
    await expect(page).toHaveURL(/\/examples\/text$/);
    await expect(page.getByRole('heading', { name: 'Text resources', exact: true })).toBeVisible();
  } finally {
    release();
  }
  await expect(page).toHaveURL(/\/examples\/text\/csr/);
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
  expect(reads).toHaveLength(1);
});
test('a later Back link wins while the CSR warmup and home navigation are in flight', async ({
  page,
}) => {
  let releaseDemo = () => {};
  let releaseHome = () => {};
  const demoGate = new Promise<void>((resolve) => {
    releaseDemo = resolve;
  });
  const homeGate = new Promise<void>((resolve) => {
    releaseHome = resolve;
  });
  const demoURL = '**/resources/text/*/en/demo.json';
  await page.route(demoURL, async (route) => {
    await demoGate;
    await route.continue();
  });
  // Hold the route payload, including a possible automatic Next prefetch, so
  // the old page is still mounted after the user starts navigating home.
  await page.route(
    (url) => url.pathname === '/',
    async (route) => {
      await homeGate;
      await route.continue();
    }
  );
  await page.goto('/examples/text');
  const demoRequest = page.waitForRequest(demoURL);
  await page.getByRole('link', { name: 'CSR', exact: true }).click();
  await demoRequest;
  const status = page.getByRole('navigation').getByRole('status');
  try {
    await expect(status).toHaveText('Preparing destination…');
    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await expect(status).toBeEmpty();
    const finished = page.waitForResponse(demoURL);
    releaseDemo();
    await (await finished).finished();
    await expect(status).toBeEmpty();
    await expect(page).toHaveURL(/\/examples\/text$/);
  } finally {
    releaseDemo();
    releaseHome();
  }
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Welcome.', exact: true })).toBeVisible();
});

test('selecting the current CSR destination twice leaves its status idle and keeps page state', async ({
  page,
}) => {
  await page.goto('/examples/text/csr');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const navigation = page.getByRole('navigation');
  const csr = navigation.getByRole('link', { name: 'CSR', exact: true });
  for (let click = 0; click < 2; click++) {
    await csr.click();
    await expect(navigation.getByRole('status')).toBeEmpty();
    await expect(page.getByTestId('text-count')).toHaveText('1');
  }
});

test('text dictionaries are absent from static client JavaScript chunks', () => {
  const directory = path.resolve(import.meta.dirname, '../../../.next/static');
  let javascript = '';
  function scan(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (file.endsWith('.js')) javascript += readFileSync(file, 'utf8');
    }
  }
  scan(directory);
  expect(javascript).not.toContain('This page reads complete text resources synchronously.');
  expect(javascript).not.toContain('这个页面同步读取已完整准备的文案资源。');
  expect(javascript).not.toContain('The settings service returned an error.');
  expect(javascript).not.toContain(
    'A consumer-owned trigger. No endpoint is configured by default.'
  );
});

test('text routes reject unsupported locales before rendering consumers', async ({ request }) => {
  for (const route of ['ssr', 'csr']) {
    const response = await request.get(`/examples/text/${route}?lang=unknown`);
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).not.toContain(TITLE_EN);
    expect(html).not.toContain(TITLE_ZH);
  }
});

test('text failed language preparation retains the current view and retries atomically', async ({
  page,
}) => {
  let offline = true;
  await observe(page);
  await page.route('**/resources/text/*/zh/*.json', async (route) => {
    if (offline) await route.abort();
    else await route.continue();
  });
  await page.goto('/examples/text/ssr?lang=en');
  await page.getByTestId('text-note').fill('preserved after failure');
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Resources could not be prepared' })
  ).toContainText('network');
  await expect(page.getByTestId('text-content')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
  offline = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: TITLE_ZH, exact: true })).toBeVisible();
  await expect(page.getByTestId('text-note')).toHaveValue('preserved after failure');
  await assertAtomic(page);
});

test('text HTTP resources serve the generated revision and reject other artifacts', async ({
  request,
}) => {
  const meta: unknown = JSON.parse(
    readFileSync(
      path.resolve(import.meta.dirname, '../../../.generated/text/resources.json'),
      'utf8'
    )
  );
  const manifest = textResourceManifestSchema.parse(meta);
  const version = `${manifest.contentVersion}-${manifest.revision}`;
  const prefix = `/resources/text/${version}/en/`;
  const response = await request.get(prefix + 'demo.json');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('immutable');
  expect(await response.json()).toMatchObject({ title: TITLE_EN });
  for (const route of [
    prefix + 'catalog.json',
    prefix + 'manifest.json',
    prefix + 'resources.json',
    prefix + 'contracts.json',
    `/resources/text/unknown/en/main.json`,
    `/resources/text/${version}/unknown/main.json`,
  ])
    expect((await request.get(route)).status()).toBe(404);
});

for (const [route, heading] of [
  ['/', 'Welcome.'],
  ['/examples/remote-settings', 'Remote settings'],
  ['/examples/event-tracking', 'Event tracking'],
] as const) {
  test(`page text ${route} hydrates from prepared snapshots without fetching dictionaries`, async ({
    page,
  }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    await page.route(resources, async (route) => {
      requests.push(route.request().url());
      await route.abort();
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    if (route === '/')
      await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    const html = await page.content();
    expect(html).not.toContain(TITLE_EN);
    expect(html).not.toContain(TITLE_ZH);
  });
}
test('text metadata uses the requested resource locale', async ({ page }) => {
  await page.goto('/examples/text/ssr?lang=zh');
  await expect(page).toHaveTitle('简洁的 Next.js');
});
test('default text pages prerender without making the request-aware scenarios static', () => {
  const manifest: unknown = JSON.parse(
    readFileSync(
      path.resolve(import.meta.dirname, '../../../.next/prerender-manifest.json'),
      'utf8'
    )
  );
  expect(manifest).toMatchObject({
    routes: {
      '/en': expect.any(Object),
      '/zh': expect.any(Object),
      '/en/examples/remote-settings': expect.any(Object),
      '/zh/examples/remote-settings': expect.any(Object),
      '/en/examples/event-tracking': expect.any(Object),
      '/en/examples/text': expect.any(Object),
    },
  });
  expect(manifest).not.toMatchObject({ routes: { '/en/examples/text/ssr': expect.any(Object) } });
  expect(manifest).not.toMatchObject({ routes: { '/en/examples/text/csr': expect.any(Object) } });
});

test('layout resources survive navigation out of the text feature and back', async ({ page }) => {
  const reads: string[] = [];
  await page.route(resources, async (route) => {
    reads.push(route.request().url());
    await route.continue();
  });
  await page.goto('/examples/text/ssr?lang=en');
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome.', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Text resources', exact: true }).click();
  await page.getByRole('link', { name: 'CSR', exact: true }).click();
  await expect(page.getByRole('heading', { name: TITLE_EN, exact: true })).toBeVisible();
  expect(reads).toEqual([]);
});

for (const mode of ['ssr', 'csr'] as const) {
  test(`nondefault ${mode} entry uses the same initial language in actual Layout and page without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    if (!baseURL) throw new Error('Browser base URL is required.');
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      const response = await page.goto(`/examples/text/${mode}?lang=zh`);
      await expect(page.getByTestId('layout-greeting')).toHaveText('欢迎。');
      await expect(page.getByTestId('layout-greeting')).toHaveAttribute('lang', 'zh');
      await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
      await expect(page).toHaveTitle('简洁的 Next.js');
      expect(response?.status()).toBe(200);
      const html = await response?.text();
      expect(html).not.toContain('Welcome.');
      if (mode === 'ssr')
        await expect(page.getByRole('heading', { name: TITLE_ZH, exact: true })).toBeVisible();
      else await expect(page.getByTestId('text-content')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
  test(`nondefault ${mode} entry hydrates without an English Layout or missing-text frame`, async ({
    page,
  }) => {
    await observe(page);
    const requests: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /hydrat|did not match|server rendered/i.test(message.text())
      )
        errors.push(message.text());
    });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(resources, async (route) => {
      requests.push(route.request().url());
      if (mode === 'csr' && route.request().url().endsWith('/demo.json')) await gate;
      await route.continue();
    });
    try {
      await page.goto(`/examples/text/${mode}?lang=zh`);
      await expect(page.getByTestId('layout-greeting')).toHaveText('欢迎。');
      if (mode === 'csr') {
        await expect(page.getByTestId('text-content')).toHaveCount(0);
        await expect.poll(() => requests.length).toBe(1);
      }
    } finally {
      release();
    }
    await expect(page.getByRole('heading', { name: TITLE_ZH, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    await expect(page).toHaveTitle('简洁的 Next.js');
    expect(requests.filter((url) => url.endsWith('/main.json'))).toEqual([]);
    if (mode === 'ssr') expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    await assertAtomic(page);
  });
}

test('nondefault homepage and client navigation share one route locale', async ({ page }) => {
  await page.goto('/?lang=zh');
  await expect(page.getByRole('heading', { name: '欢迎。', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
  await expect(page).toHaveTitle('简洁的 Next.js');
  await page.getByRole('link', { name: '文案资源', exact: true }).click();
  await expect(page.getByTestId('layout-greeting')).toHaveText('欢迎。');
  await page.getByRole('link', { name: 'SSR', exact: true }).click();
  await expect(page.getByRole('heading', { name: TITLE_ZH, exact: true })).toBeVisible();
  await expect(page).toHaveURL(/lang=zh/);
});
