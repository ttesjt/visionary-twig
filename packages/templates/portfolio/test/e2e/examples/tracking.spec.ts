import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { appConfigSchema } from '../../../src/site/config-schema';

const configFile = new URL('../../../.generated/config/app.json', import.meta.url);
const enabled =
  appConfigSchema.parse(JSON.parse(readFileSync(configFile, 'utf8'))).tracking?.enabled === true;
const endpoint = process.env.NEXT_PUBLIC_EVENT_TRACKING_URL;
test('tracking sends only when the prepared site setting and endpoint permit it', async ({
  page,
}) => {
  const requests: string[] = [];
  if (endpoint)
    await page.route(endpoint, async (route) => {
      requests.push(route.request().url());
      await route.fulfill({ status: 202 });
    });
  await page.goto('/examples/event-tracking');
  const result = page.getByTestId('tracking-result');
  await page.getByRole('button', { name: 'Send typed event' }).click();
  if (enabled && endpoint) {
    await expect(result).toContainText('accepted');
    expect(requests).toHaveLength(1);
  } else {
    await expect(result).toContainText(enabled ? 'unconfigured' : 'disabled');
    expect(requests).toHaveLength(0);
  }
});
test('tracking sends the exact envelope and exposes configured failures', async ({ page }) => {
  test.skip(
    !enabled || !endpoint,
    'Delivery requires an enabled AppConfig and a configured endpoint.'
  );
  if (!endpoint) return;
  const bodies: unknown[] = [];
  await page.route(endpoint, async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: bodies.length === 1 ? 204 : 503 });
  });
  await page.goto('/examples/event-tracking');
  await page.getByRole('button', { name: 'Send typed event' }).click();
  await expect(page.getByTestId('tracking-result')).toContainText('accepted');
  expect(bodies[0]).toEqual({
    projectId: 'site',
    event: 'sample_opened',
    data: { itemId: 'sample', source: 'example' },
  });
  await page.getByRole('button', { name: 'Send free event' }).click();
  await expect(page.getByTestId('tracking-result')).toContainText('http-error');
  expect(bodies[1]).toEqual({ projectId: 'debug', event: 'custom_event', data: { example: true } });
  await page.unroute(endpoint);
  await page.route(endpoint, (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Send typed event' }).click();
  await expect(page.getByTestId('tracking-result')).toContainText('network-error');
});
