import { expect, type Page } from '@playwright/test';
import { createProject, type StudioProject } from '@frontend/studio/data';
import { test } from './fixtures/studio';
import { openPuck, returnToPage, openJson } from './fixtures/editing';
import { openPagePanel } from './fixtures/resource-controls';

const project: StudioProject = {
  ...createProject('editing-review'),
  catalogs: { en: { settings: { compact: true } }, zh: { settings: { compact: false } } },
  document: {
    documentId: 'editing-review',
    schemaVersion: 1,
    revision: 1,
    data: {
      root: {},
      content: ['first', 'second'].map((id) => ({
        type: 'RichText',
        props: {
          id,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: id + ' paragraph' }] }],
        },
      })),
    },
  },
};
async function openProject(page: Page) {
  await page.goto('/demo/pages/new');
  await openPagePanel(page, 'Files');
  await page.getByLabel('Open JSON file', { exact: true }).setInputFiles({
    name: 'review.studio.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
}
async function selectField(page: Page, id: string) {
  await page.locator('[data-puck-component="' + id + '"]').click();
  const field = page.getByRole('textbox', { name: 'content (' + id + ')', exact: true });
  await expect(field).toBeVisible();
  return field;
}

test('hidden Puck remains measurable after returning, and field drafts survive selection, language and mode changes', async ({
  page,
}) => {
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('usePuck'))
      warnings.push(message.text());
  });
  await openProject(page);
  await openPuck(page);
  const first = await selectField(page, 'first');
  await first.fill('{unfinished english');
  await expect(
    page.getByRole('combobox', { name: 'Field value mode · content (first)', exact: true })
  ).toBeDisabled();
  await selectField(page, 'second');
  await selectField(page, 'first');
  await expect(first).toHaveValue('{unfinished english');
  await expect(first).toHaveAttribute('aria-invalid', 'true');
  const language = page.getByRole('combobox', { name: 'Editing language', exact: true });
  await language.selectOption('zh');
  await expect(first).not.toHaveValue('{unfinished english');
  await first.fill('[unfinished translated');
  await language.selectOption('en');
  await expect(first).toHaveValue('{unfinished english');
  await returnToPage(page);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 1100, height: 800 });
  await openJson(page);
  await returnToPage(page);
  await openPuck(page);
  await expect(first).toHaveValue('{unfinished english');
  const bounds = await page.locator('#puck-canvas-root').boundingBox();
  if (!bounds) throw new Error('Expected a visible native canvas.');
  expect(Number.isFinite(bounds.height) && bounds.height > 0).toBe(true);
  await first.fill('[]');
  await page.getByRole('combobox', { name: 'Editing language', exact: true }).selectOption('zh');
  await expect(first).toHaveValue('[unfinished translated');
  await first.fill('[]');
  await returnToPage(page);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeEnabled();
  expect(warnings).toEqual([]);
});

test('deleting one node releases only its own invalid field buffers', async ({ page }) => {
  await openProject(page);
  await openPuck(page);
  await (await selectField(page, 'first')).fill('{unfinished first');
  await (await selectField(page, 'second')).fill('{unfinished second');
  await selectField(page, 'first');
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect(page.locator('[data-puck-component="first"]')).toHaveCount(0);
  await returnToPage(page);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeDisabled();
  await openPuck(page);
  const second = await selectField(page, 'second');
  await expect(second).toHaveValue('{unfinished second');
  await second.fill('[]');
  await returnToPage(page);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeEnabled();
});

test('catalog controls preserve invalid JSON until the user repairs it', async ({ page }) => {
  await openProject(page);
  await openPagePanel(page, 'Copy & languages');
  await page
    .locator('.ui-studio-key-list')
    .getByRole('button', { name: 'settings', exact: true })
    .click();
  const field = page.getByRole('textbox', { name: 'Catalog value', exact: true });
  await field.fill('{unfinished catalog');
  for (const label of ['Value format', 'Editing language', 'Import catalog JSON'])
    await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
  for (const name of ['Add language', 'Create key', 'Rename key', 'Delete key'])
    await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
  await expect(field).toHaveValue('{unfinished catalog');
  await field.fill('{"compact":false}');
  await expect(page.getByLabel('Value format', { exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeEnabled();
});
