import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { applyDocument, document as fixtureDocument } from './fixtures/document';

for (const width of [320, 1440]) {
  test(`workbench remains reachable with long bilingual content at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/demo/pages/new');
    const long = {
      ...fixtureDocument,
      variables: { content: { title: '中英文 Long content / '.repeat(24) } },
    };
    await applyDocument(page, long);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.getByRole('button', { name: 'Save As', exact: true }).focus();
    await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`workbench-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Refresh actual preview' }).click();
    const frame = page.frameLocator('iframe[title="Actual content page"]');
    await expect(
      frame.getByRole('heading', { name: long.variables.content.title, exact: true })
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });
}
