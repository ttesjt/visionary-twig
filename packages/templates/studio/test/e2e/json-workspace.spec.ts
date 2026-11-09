import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { applyDocument, document as fixtureDocument } from './fixtures/document';
import { openJson, returnToPage, openPuck, downloadProject } from './fixtures/editing';
import { selectStudioTheme } from './fixtures/resource-controls';
import { openPagePanel } from './fixtures/resource-controls';

test('default Viewer opens automatically, JSON workspace keeps the session across routes and tabs', async ({
  page,
}) => {
  await page.goto('/demo/pages/new?item=field-guide');
  await page.getByLabel('Page name', { exact: true }).fill('Source workspace');
  await applyDocument(page);
  const frame = page.frameLocator('iframe[title="Actual content page"]');
  await expect(frame.getByRole('heading', { name: 'Neutral bound title' })).toBeVisible();
  await expect(page.locator('[data-puck-component]:visible')).toHaveCount(0);
  const source = await openJson(page);
  const changed = { ...fixtureDocument, variables: { content: { title: 'Applied title' } } };
  await source.fill(JSON.stringify(changed));
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'Neutral bound title' })).toBeVisible();
  await expect(frame.getByRole('heading', { name: 'Applied title' })).toHaveCount(0);
  await expect(
    page.getByText('Unapplied input. The viewer shows the current working copy.', {
      exact: true,
    })
  ).toBeVisible();
  await page.getByRole('tab', { name: 'JSON', exact: true }).click();
  await expect(source).toHaveValue(JSON.stringify(changed));
  await returnToPage(page);
  await expect(page.getByLabel('Page name', { exact: true })).toHaveValue('Source workspace');
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
  await openPagePanel(page, 'Association');
  await expect(page.getByRole('region', { name: 'Item association' })).toContainText('Field guide');
  await openJson(page);
  await expect(source).toHaveValue(JSON.stringify(changed));
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'Applied title' })).toBeVisible();
  await page.getByRole('button', { name: 'undo', exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'Neutral bound title' })).toBeVisible();
  await returnToPage(page);
  await openJson(page);
  await page.getByRole('button', { name: 'redo', exact: true }).click();
  expect(JSON.parse(await source.inputValue())).toMatchObject(changed);
  await returnToPage(page);
  await openPagePanel(page, 'Association');
  await expect(page.getByRole('region', { name: 'Item association' })).toContainText(
    'Pending association'
  );
});

for (const width of [375, 1440]) {
  test(`focused editor allocates space to source and preserves keyboard tabs at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/demo/pages/new/json');
    const input = page.getByRole('textbox', { name: 'Layout document', exact: true });
    await expect(input).toBeVisible();
    await expect(page.locator('.ui-studio-sidebar')).toBeHidden();
    await expect(page.locator('.ui-studio-topbar')).toBeHidden();
    await expect(page.getByRole('region', { name: 'Page controls', exact: true })).toBeHidden();
    const bounds = await input.boundingBox();
    expect(bounds?.width).toBeGreaterThan(width - 70);
    expect(bounds?.height).toBeGreaterThan(width === 1440 ? 650 : 500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.getByRole('tab', { name: 'JSON', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Preview', exact: true })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: 'JSON', exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('source-workspace.png') });
  });
}

test('invalid source is repairable, reset is explicit and staged catalogs/context apply together', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  const input = await openJson(page, 'context');
  await input.fill('{broken');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'JSON input issues' })).toContainText(
    'invalid-json'
  );
  await returnToPage(page);
  await openJson(page, 'context');
  await expect(input).toHaveValue('{broken');
  await page.getByRole('button', { name: 'Reset section', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Keep draft' }).click();
  await expect(input).toHaveValue('{broken');
  await input.fill('{"live":true}');
  const catalogs = await openJson(page, 'catalogs');
  await catalogs.fill('{"en":{"title":"English"},"zh":{"title":"中文"}}');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await page.getByRole('button', { name: 'Validate', exact: true }).click();
  await expect(
    page.getByText('Unapplied JSON. The viewer shows the working copy.', { exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  const project = await downloadProject(page);
  expect(project.context).toEqual({ live: true });
  expect(project.catalogs.zh).toEqual({ title: '中文' });
  await expect(page.getByText('No pages have been published in this session.')).toHaveCount(0);
});

test('experimental Puck remains opt-in and edits only the applied working copy', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await openPuck(page);
  await expect(page.locator('[data-puck-component="title"]')).toContainText('Neutral bound title');
  await page.getByRole('link', { name: 'Edit JSON', exact: true }).click();
  await expect(page).toHaveURL(/\/json(?:[?#].*)?$/u);
  await (await openJson(page, 'context')).fill('{draft');
  await returnToPage(page);
  await page.getByRole('link', { name: 'Puck · experimental', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Unapplied JSON is kept separately' })
  ).toBeVisible();
  await expect(page.locator('[data-puck-component="title"]')).toContainText('Neutral bound title');
});

test('an invalid experimental field remains repairable after visiting the source workspace', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await openPuck(page);
  await page.locator('[data-puck-component="body"]').click();
  const input = page.getByRole('textbox', { name: 'content (body)', exact: true });
  await input.fill('{incomplete');
  await expect(input).toBeVisible();
  await page.getByRole('link', { name: 'Edit JSON', exact: true }).click();
  await expect(page).toHaveURL(/\/json(?:[?#].*)?$/u);
  await expect(page.getByRole('tab', { name: 'JSON', exact: true })).toBeVisible();
  const context = await openJson(page, 'context');
  await context.fill('{"keptDraft":true}');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'JSON input issues' })).toContainText(
    'pending-editor-draft'
  );
  await returnToPage(page);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeDisabled();
  await openPuck(page);
  await expect(input).toHaveValue('{incomplete');
  await input.fill('[{"type":"paragraph","content":[{"type":"text","text":"Repaired"}]}]');
  await openJson(page, 'context');
  await expect(context).toHaveValue('{"keptDraft":true}');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await returnToPage(page);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeEnabled();
});

for (const theme of ['light', 'dark'] as const) {
  test(`source workspace uses the selected ${theme} palette`, async ({ page }, testInfo) => {
    test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/demo/pages/new');
    await applyDocument(page);
    await selectStudioTheme(page, theme);
    const input = await openJson(page);
    await expect(input).toHaveCSS(
      'color',
      theme === 'light' ? 'rgb(23, 23, 23)' : 'rgb(245, 245, 245)'
    );
    await expect(input).toHaveCSS(
      'background-color',
      theme === 'light' ? 'rgb(250, 250, 251)' : 'rgb(36, 38, 43)'
    );
    await page.screenshot({ path: testInfo.outputPath('source-' + theme + '.png') });
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
    await expect(
      page
        .frameLocator('iframe[title="Actual content page"]')
        .getByRole('heading', { name: 'Neutral bound title', exact: true })
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('preview-' + theme + '.png') });
  });
}
