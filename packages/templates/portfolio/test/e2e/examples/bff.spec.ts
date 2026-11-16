import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { test, expect, appDirectory, startProductionServer } from '../fixtures/bff';
import { RECOMMENDATION_ENDPOINT } from '../../../src/app/api/examples/recommendation/contract';

test.beforeEach(({ backend }) => {
  backend.setScenario('ok');
  backend.requests.length = 0;
});

test('BFF authenticates the real upstream with a runtime secret and returns only public data', async ({
  page,
  backend,
}) => {
  const exposed: string[] = [];
  page.on('request', (request) =>
    exposed.push(request.url() + JSON.stringify(request.headers()) + (request.postData() ?? ''))
  );
  await page.goto(backend.baseURL + '/examples/api');
  await page.getByRole('textbox', { name: 'Topic', exact: true }).fill('Field notes');
  const pending = page.waitForResponse(
    (response) => new URL(response.url()).pathname === RECOMMENDATION_ENDPOINT
  );
  await page.getByRole('button', { name: 'Get recommendation', exact: true }).click();
  const response = await pending;
  expect(response.status()).toBe(200);
  const data = await response.text();
  expect(JSON.parse(data)).toEqual({ recommendation: 'Start a small study about Field notes.' });
  await expect(page.getByRole('status', { name: 'Upstream result' })).toHaveText(
    'Start a small study about Field notes.'
  );
  expect(backend.requests).toEqual([{ authorized: true, topic: 'Field notes' }]);
  expect(data + exposed.join('')).not.toContain(backend.secret);
});

test('BFF secrets are absent from production browser assets and SSR payloads', async ({
  request,
  backend,
}) => {
  const buildSecret = process.env.EXAMPLE_BFF_BUILD_SECRET;
  if (!buildSecret)
    throw new Error('Use the root test:e2e runner to supply the build-time test secret.');
  expect(buildSecret).not.toBe(backend.secret);
  const html = await (await request.get(backend.baseURL + '/examples/api')).text();
  const files: string[] = [];
  function scan(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) scan(filename);
      else files.push(filename);
    }
  }
  scan(path.join(appDirectory, '.next/static'));
  expect(files.length).toBeGreaterThan(0);
  for (const content of [html, ...files.map((file) => readFileSync(file).toString())]) {
    expect(content).not.toContain(buildSecret);
    expect(content).not.toContain(backend.secret);
  }
});

for (const [scenario, status, message] of [
  ['rejected', 502, 'The service is unavailable or rejected the request.'],
  ['invalid', 502, 'The service returned an unexpected response.'],
  ['oversized', 502, 'The service returned an unexpected response.'],
  ['redirect', 502, 'The service is unavailable or rejected the request.'],
  ['stalled', 504, 'The service took too long.'],
] as const) {
  test('BFF handles ' + scenario + ' and retries after recovery', async ({ page, backend }) => {
    backend.setScenario(scenario);
    await page.goto(backend.baseURL + '/examples/api');
    const button = page.getByRole('button', { name: 'Get recommendation', exact: true });
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === RECOMMENDATION_ENDPOINT
    );
    await button.click();
    expect((await response).status()).toBe(status);
    await expect(page.getByRole('status', { name: 'Upstream result' })).toContainText(message);
    expect(backend.requests).toHaveLength(1);
    backend.setScenario('ok');
    await button.click();
    await expect(page.getByRole('status', { name: 'Upstream result' })).toContainText(
      'Start a small study about'
    );
  });
}

test('BFF rejects invalid inputs before contacting its dependency', async ({
  request,
  backend,
}) => {
  for (const query of ['', '?topic=', '?topic=a&topic=b', '?topic=a&url=https://example.test']) {
    const response = await request.get(backend.baseURL + RECOMMENDATION_ENDPOINT + query);
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: 'invalid-input' });
  }
  expect(backend.requests).toHaveLength(0);
});

for (const value of ['', 'not-a-valid-service-url']) {
  test(
    'BFF explains missing or invalid configuration: ' + (value ? 'invalid' : 'missing'),
    async ({ page }) => {
      const server = await startProductionServer({
        EXAMPLE_UPSTREAM_URL: value,
        EXAMPLE_UPSTREAM_API_KEY: '',
      });
      try {
        await page.goto(server.baseURL + '/examples/api?lang=zh');
        await page.getByRole('button', { name: '获取建议', exact: true }).click();
        await expect(page.getByRole('status', { name: '上游结果' })).toContainText(
          'EXAMPLE_UPSTREAM_URL'
        );
        await expect(page.getByRole('status', { name: '上游结果' })).toContainText(
          'EXAMPLE_UPSTREAM_API_KEY'
        );
      } finally {
        await server.close();
      }
    }
  );
}
