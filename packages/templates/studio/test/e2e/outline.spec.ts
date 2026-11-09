import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { selectStudioTheme } from './fixtures/resource-controls';
import { openPuck } from './fixtures/editing';
import { applyDocument } from './fixtures/document';

// Puck's pinned editor chrome uses a light surface and its own black text token.
const OUTLINE_TEXT_COLOR = 'rgb(0, 0, 0)';

for (const theme of ['light', 'dark', 'system'] as const) {
  test(`outline names remain readable in ${theme} while selecting and expanding nodes`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/demo/pages/new');
    await applyDocument(page);
    await selectStudioTheme(page, theme);
    await openPuck(page);
    await page.getByRole('navigation').getByText('Outline', { exact: true }).click();

    const title = page
      .locator('[data-puck-layer-tree-id="title"]')
      .getByRole('button', { name: 'Heading', exact: true })
      .and(page.locator('button'));
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS('color', OUTLINE_TEXT_COLOR);
    await title.hover();
    await expect(title).toHaveCSS('color', OUTLINE_TEXT_COLOR);
    await title.click();
    await expect(title).toHaveCSS('color', OUTLINE_TEXT_COLOR);
    await expect(
      page.getByRole('status', { name: 'Resolved text (title)', exact: true })
    ).toHaveText('"Neutral bound title"');

    const row = page.locator('[data-puck-layer-tree-id="row"]');
    await row.getByRole('button', { name: 'Expand', exact: true }).click();
    const grid = page.locator('[data-puck-layer-tree-id="grid"]');
    await expect(
      grid.getByRole('button', { name: 'Grid', exact: true }).and(page.locator('button'))
    ).toHaveCSS('color', OUTLINE_TEXT_COLOR);
    await grid.getByRole('button', { name: 'Expand', exact: true }).click();
    const child = page
      .locator('[data-puck-layer-tree-id="child"]')
      .getByRole('button', { name: 'Heading', exact: true })
      .and(page.locator('button'));
    await expect(child).toBeVisible();
    await child.click();
    await expect(child).toHaveCSS('color', OUTLINE_TEXT_COLOR);
    await expect(page.getByRole('textbox', { name: 'text (child)', exact: true })).toHaveValue(
      'Nested child'
    );

    if (theme === 'system') {
      await page.emulateMedia({ colorScheme: 'light' });
      await expect(child).toHaveCSS('color', OUTLINE_TEXT_COLOR);
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(child).toHaveCSS('color', OUTLINE_TEXT_COLOR);
    }
    await expect(page.locator('.ui-studio-shell')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.ui-studio-workbench')).toHaveCSS(
      'color',
      theme === 'light' ? 'rgb(23, 23, 23)' : 'rgb(245, 245, 245)'
    );
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('outline.png') });
  });
}
