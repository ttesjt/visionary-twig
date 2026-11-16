import { expect, test } from '@playwright/test';
test('remote settings share one request, drive layout and support refresh and disabling', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/samples/remote-settings/*.json', async (route) => {
    requests++;
    await route.continue();
  });
  await page.goto('/examples/remote-settings');
  const panels = page.getByTestId('settings-preview');
  await expect(panels).toHaveCount(2);
  await expect(panels.first()).toHaveAttribute('data-density', 'comfortable');
  await expect(page.getByRole('status').first()).toHaveText('Ready');
  expect(requests).toBe(1);
  await page.getByRole('combobox', { name: 'Settings source' }).selectOption('compact');
  await expect(panels.first()).toHaveAttribute('data-density', 'compact');
  await expect(panels.last()).toHaveAttribute('data-density', 'compact');
  await expect(page.getByTestId('settings-note')).toHaveCount(0);
  expect(requests).toBe(2);
  await page.getByRole('button', { name: 'Refresh settings' }).click();
  await expect.poll(() => requests).toBe(3);
  await expect(page.getByRole('status').first()).toHaveText('Ready');
  await page.getByRole('checkbox', { name: 'Enable remote settings' }).uncheck();
  await page.getByRole('combobox', { name: 'Settings source' }).selectOption('comfortable');
  await expect(page.getByRole('status').first()).toHaveText('Reading disabled');
  await expect(page.getByRole('button', { name: 'Refresh settings' })).toBeDisabled();
  expect(requests).toBe(3);
});
test('remote settings retain last valid data while exposing a revalidation error', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let compactReads = 0;
  await page.route('**/samples/remote-settings/compact.json', async (route) => {
    compactReads++;
    if (compactReads === 1) await route.continue();
    else await route.fulfill({ status: 503 });
  });
  await page.goto('/examples/remote-settings');
  await page.getByRole('combobox', { name: 'Settings source' }).selectOption('compact');
  await expect(page.getByTestId('settings-preview').first()).toHaveAttribute(
    'data-density',
    'compact'
  );
  await page.getByRole('button', { name: 'Refresh settings' }).click();
  await expect(page.getByRole('alert').first()).toHaveText(
    'The settings service returned an error.'
  );
  await expect(page.getByTestId('settings-preview').first()).toHaveAttribute(
    'data-density',
    'compact'
  );
  expect(errors).toEqual([]);
});
test('remote settings distinguish loading, malformed JSON, schema rejection and HTTP failure', async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/samples/remote-settings/comfortable.json', async (route) => {
    await pending;
    await route.continue();
  });
  try {
    await page.goto('/examples/remote-settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status').first()).toHaveText('Loading settings');
  } finally {
    release?.();
  }
  await expect(page.getByRole('status').first()).toHaveText('Ready');
  await page.getByRole('combobox', { name: 'Settings source' }).selectOption('invalid');
  await expect(page.getByRole('alert').first()).toHaveText(
    'The settings do not match the expected schema.'
  );
  await page.getByRole('combobox', { name: 'Settings source' }).selectOption('missing');
  await expect(page.getByRole('alert').first()).toHaveText(
    'The settings service returned an error.'
  );
  await page.route('**/samples/remote-settings/compact.json', (route) =>
    route.fulfill({ status: 200, body: '{' })
  );
  await page.getByRole('combobox', { name: 'Settings source' }).selectOption('compact');
  await expect(page.getByRole('alert').first()).toHaveText(
    'The settings response is not valid JSON.'
  );
});
test('normal home does not perform remote settings requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/samples/remote-settings/')) requests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome.' })).toBeVisible();
  expect(requests).toEqual([]);
});
