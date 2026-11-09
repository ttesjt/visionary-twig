import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { applySection, openJson, returnToPage } from './fixtures/editing';

test('empty and layout-only documents explain what is missing, while visible content uses the actual Viewer', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/preview')) requests.push(request.url());
  });
  await page.goto('/demo/pages/new');
  const empty = page.getByRole('status').filter({ hasText: 'Nothing to preview yet.' });
  await expect(empty).toBeVisible();
  await expect(page.locator('iframe[title="Actual content page"]')).toHaveCount(0);
  expect(requests).toEqual([]);
  const source = await openJson(page);
  const original: unknown = JSON.parse(await source.inputValue());
  if (!original || typeof original !== 'object' || Array.isArray(original))
    throw new Error('Expected document source.');
  const layout = {
    ...original,
    data: {
      root: {},
      content: [
        {
          type: 'Row',
          props: {
            id: 'row',
            content: [{ type: 'Container', props: { id: 'container', content: [] } }],
          },
        },
      ],
    },
  };
  await applySection(page, 'document', layout);
  await expect(empty).toBeVisible();
  expect(requests).toEqual([]);
  const visible = {
    ...layout,
    data: {
      root: {},
      content: [
        {
          type: 'Row',
          props: {
            id: 'row',
            content: [
              { type: 'Heading', props: { id: 'heading', text: 'Visible nested content' } },
            ],
          },
        },
      ],
    },
  };
  await openJson(page);
  await source.fill(JSON.stringify(visible));
  await returnToPage(page);
  await expect(empty).toBeVisible();
  await applySection(page, 'document', visible);
  await expect(
    page
      .frameLocator('iframe[title="Actual content page"]')
      .getByRole('heading', { name: 'Visible nested content' })
  ).toBeVisible();
  await expect(empty).toHaveCount(0);
  await applySection(page, 'document', layout);
  await expect(empty).toBeVisible();
  await expect(page.locator('iframe[title="Actual content page"]')).toHaveCount(0);
  await applySection(page, 'document', {
    ...layout,
    data: {
      root: {},
      content: [
        { type: 'ContentSection', props: { id: 'surface', surface: 'muted', content: [] } },
      ],
    },
  });
  await expect(page.locator('iframe[title="Actual content page"]')).toBeVisible();
  await expect(empty).toHaveCount(0);
});
