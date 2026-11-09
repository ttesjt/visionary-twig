import { openPagePanel } from './fixtures/resource-controls';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { sampleDocument } from '../../src/samples/sample-document';
import { SampleJsx } from '../fixtures/sample-jsx';

for (const width of [320, 375, 768, 1440]) {
  test(`native sample slots and ordinary JSX share layout at ${width}px`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    if (!baseURL) throw new Error('Missing baseURL');
    await page.setViewportSize({ width, height: 900 });
    const response = await page.request.post('/api/preview', {
      headers: { origin: baseURL },
      data: { document: sampleDocument },
    });
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('url' in body) || typeof body.url !== 'string')
      throw new Error('Missing URL');
    await page.goto(body.url);
    const jsx = await context.newPage();
    try {
      await jsx.setViewportSize({ width, height: 900 });
      const styles = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
        links.map((link) => {
          if (!(link instanceof HTMLLinkElement)) throw new Error('Expected CSS');
          return link.href;
        })
      );
      await jsx.setContent(
        `<html><head><base href="${baseURL}">${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}</head><body>${renderToStaticMarkup(<SampleJsx />)}</body></html>`
      );
      expect(await page.locator('.ui-heading').allTextContents()).toEqual(
        await jsx.locator('.ui-heading').allTextContents()
      );
      await expect(page.locator('.ui-row > .ui-column > .ui-grid > .ui-media-figure')).toHaveCount(
        6
      );
      for (const view of [page, jsx]) {
        expect(
          await view
            .locator('.ui-grid')
            .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
        ).toBe(width <= 640 ? 1 : 3);
        expect(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        );
      }
      const actualWidth = await page
        .locator('.ui-grid')
        .evaluate((element) => element.getBoundingClientRect().width);
      expect(
        await jsx.locator('.ui-grid').evaluate((element) => element.getBoundingClientRect().width)
      ).toBeCloseTo(actualWidth, 1);
      if (width === 375 || width === 1440)
        await page.screenshot({ path: testInfo.outputPath(`sample-${width}.png`), fullPage: true });
    } finally {
      await jsx.close();
    }
  });
}

test('migrated gallery hydrates and supports keyboard/viewer controls in real preview', async ({
  page,
}) => {
  // Show the complete desktop iframe so workspace chrome does not obscure its controls.
  await page.setViewportSize({ width: 1600, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/demo/pages/new');
  await openPagePanel(page, 'Files');
  await page.getByRole('button', { name: 'Open neutral example', exact: true }).click();
  if (await page.getByRole('dialog').isVisible())
    await page.getByRole('dialog').getByRole('button', { name: 'Discard and replace' }).click();
  await page.getByRole('button', { name: 'Refresh actual preview' }).click();
  const frame = page.frameLocator('iframe[title="Actual content page"]');
  const gallery = frame.getByRole('region', { name: 'Sample gallery', exact: true });
  await expect(gallery).toHaveAttribute('data-enhanced', 'true');
  await gallery.focus();
  await page.keyboard.press('ArrowRight');
  await expect(gallery.locator('.ui-media-count')).toHaveText('2 / 6');
  await gallery.locator('.ui-gallery-item[data-current="true"] .ui-media-zoom').click();
  const viewer = frame.getByRole('dialog', { name: 'Sample gallery' });
  await expect(viewer).toHaveAttribute('data-viewer-engine', 'react-photo-view');
  const image = viewer.getByRole('img');
  await expect(image).toHaveAttribute('alt', 'Three nested green circles on a neutral background');
  await image.evaluate((element: HTMLImageElement) => element.decode());

  const controls = viewer.locator('.ui-content-photo-controls');
  await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect
    .poll(async () => Number(await controls.getAttribute('data-scale')))
    .toBeGreaterThan(1);
  await viewer.getByRole('button', { name: 'Reset zoom', exact: true }).click();
  await expect.poll(async () => Number(await controls.getAttribute('data-scale'))).toBe(1);

  await viewer.getByRole('button', { name: 'Close viewer', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(image).toHaveAttribute('alt', 'Three rounded arches in warm neutral colors');
  await expect(
    viewer.getByRole('group', { name: 'Image selection' }).getByRole('status')
  ).toHaveText('3 / 6');
  await viewer.getByRole('button', { name: 'Previous image', exact: true }).click();
  await expect(image).toHaveAttribute('alt', 'Three nested green circles on a neutral background');
  await expect(
    viewer.getByRole('group', { name: 'Image selection' }).getByRole('status')
  ).toHaveText('2 / 6');

  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(gallery.locator('.ui-media-count')).toHaveText('2 / 6');
  await expect(
    gallery.locator('.ui-gallery-item[data-current="true"] .ui-media-zoom')
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test('preview retains responsive native slots with only layout layers', async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Missing baseURL');
  const response = await page.request.post('/api/preview', {
    headers: { origin: baseURL },
    data: { document: sampleDocument },
  });
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('url' in body) || typeof body.url !== 'string')
    throw new Error('Missing URL');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(body.url);
  await page.evaluate(() => {
    for (const sheet of document.styleSheets)
      for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
        const rule = sheet.cssRules[index];
        if (
          rule &&
          'name' in rule &&
          typeof rule.name === 'string' &&
          ['ui-theme-tokens', 'ui-base', 'ui-components', 'ui-example'].includes(rule.name)
        )
          sheet.deleteRule(index);
      }
  });
  expect(
    await page
      .locator('.ui-grid')
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
  ).toBe(1);
  await expect(page.getByRole('heading', { name: 'Sample content', exact: true })).toBeVisible();
});
