import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { selectStudioTheme } from './fixtures/resource-controls';
import { openPuck } from './fixtures/editing';
import { applyDocument, document } from './fixtures/document';

const INK = { light: 'rgb(23, 23, 23)', dark: 'rgb(245, 245, 245)' } as const;

const CANVAS_SURFACE = { light: 'rgb(255, 255, 255)', dark: 'rgb(26, 26, 26)' } as const;
const MUTED_SURFACE = { light: 'rgb(250, 250, 250)', dark: 'rgb(17, 17, 17)' } as const;

const themedDocument = {
  ...document,
  data: {
    ...document.data,
    content: [
      ...document.data.content,
      {
        type: 'ContentSection',
        props: {
          id: 'muted-section',
          surface: 'muted',
          content: [{ type: 'Heading', props: { id: 'muted-heading', text: 'Muted section' } }],
        },
      },
    ],
  },
};

function paintedBackground(element: Element): string {
  for (let parent: Element | null = element; parent; parent = parent.parentElement) {
    const background = getComputedStyle(parent).backgroundColor;
    if (background !== 'rgba(0, 0, 0, 0)') return background;
  }
  throw new Error('Puck canvas is missing a painted background.');
}

for (const theme of ['light', 'dark', 'system'] as const) {
  test(`outline names remain readable in ${theme} while selecting and expanding nodes`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/demo/pages/new');
    await applyDocument(page, themedDocument);
    await openPuck(page);
    await selectStudioTheme(page, theme);
    const scheme = theme === 'light' ? 'light' : 'dark';
    const canvas = page.locator('.ui-puck-canvas-content');
    const plain = canvas.getByRole('heading', { name: 'Neutral bound title', exact: true });
    const muted = canvas.getByRole('heading', { name: 'Muted section', exact: true });
    const expectCanvasPalette = async (colorScheme: 'light' | 'dark'): Promise<void> => {
      await expect(plain).toHaveCSS('color', INK[colorScheme]);
      await expect.poll(() => plain.evaluate(paintedBackground)).toBe(CANVAS_SURFACE[colorScheme]);
      await expect(muted).toHaveCSS('color', INK[colorScheme]);
      await expect.poll(() => muted.evaluate(paintedBackground)).toBe(MUTED_SURFACE[colorScheme]);
    };
    await expectCanvasPalette(scheme);
    await page.getByRole('navigation').getByText('Outline', { exact: true }).click();

    const title = page
      .locator('[data-puck-layer-tree-id="title"]')
      .getByRole('button', { name: 'Heading', exact: true })
      .and(page.locator('button'));
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS('color', INK[scheme]);
    await title.hover();
    await expect(title).toHaveCSS('color', INK[scheme]);
    await title.click();
    await expect(title).toHaveCSS('color', INK[scheme]);
    await expect(
      page.getByRole('status', { name: 'Resolved text (title)', exact: true })
    ).toHaveText('"Neutral bound title"');

    const row = page.locator('[data-puck-layer-tree-id="row"]');
    await row.getByRole('button', { name: 'Expand', exact: true }).click();
    const grid = page.locator('[data-puck-layer-tree-id="grid"]');
    await expect(
      grid.getByRole('button', { name: 'Grid', exact: true }).and(page.locator('button'))
    ).toHaveCSS('color', INK[scheme]);
    await grid.getByRole('button', { name: 'Expand', exact: true }).click();
    const child = page
      .locator('[data-puck-layer-tree-id="child"]')
      .getByRole('button', { name: 'Heading', exact: true })
      .and(page.locator('button'));
    await expect(child).toBeVisible();
    await child.click();
    await expect(child).toHaveCSS('color', INK[scheme]);
    await expect(page.getByRole('textbox', { name: 'text (child)', exact: true })).toHaveValue(
      'Nested child'
    );

    if (theme === 'system') {
      await page.emulateMedia({ colorScheme: 'light' });
      await expect(child).toHaveCSS('color', INK.light);
      await expectCanvasPalette('light');
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(child).toHaveCSS('color', INK.dark);
      await expectCanvasPalette('dark');
    }
    await expect(page.locator('.ui-studio-shell')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.ui-studio-workbench')).toHaveCSS('color', INK[scheme]);
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('outline.png') });
  });
}
