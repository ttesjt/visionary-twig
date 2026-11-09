import { parseDocument } from '@frontend/ui-document';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import type { Page } from '@playwright/test';
import { readSection, openPuck } from './fixtures/editing';
import { applyDocument } from './fixtures/document';

const NATIVE_HISTORY_SETTLE_MS = 300;
const NATIVE_DRAG_HOLD_MS = 300;

async function currentDocument(page: Page) {
  const text = await readSection(page, 'document');
  await openPuck(page);
  const result = parseDocument(text, contentRegistry);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

test('native duplicate/delete, undo/redo, drag and Unbind retain raw bindings', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await openPuck(page);
  const title = page.locator('[data-puck-component="title"]');
  await title.click();
  await expect(page.getByRole('status', { name: 'Resolved text (title)', exact: true })).toHaveText(
    '"Neutral bound title"'
  );
  await page.getByRole('button', { name: 'Duplicate', exact: true }).last().click();
  await expect.poll(async () => (await currentDocument(page)).bindings?.length).toBe(2);
  const duplicate = (await currentDocument(page)).bindings?.find(
    (binding) => binding.nodeId !== 'title'
  );
  if (!duplicate) throw new Error('Duplicate binding is missing');
  await page.waitForTimeout(NATIVE_HISTORY_SETTLE_MS);
  await page.locator(`[data-puck-component="${duplicate.nodeId}"]`).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect.poll(async () => (await currentDocument(page)).bindings?.length).toBe(1);
  // Puck coalesces native history for 250ms; settle the recorded operation before undo.
  await page.waitForTimeout(NATIVE_HISTORY_SETTLE_MS);
  await page.getByRole('button', { name: 'undo', exact: true }).click();
  await expect.poll(async () => (await currentDocument(page)).bindings?.length).toBe(2);
  await page.getByRole('button', { name: 'redo', exact: true }).click();
  await expect.poll(async () => (await currentDocument(page)).bindings?.length).toBe(1);
  await page.waitForTimeout(NATIVE_HISTORY_SETTLE_MS);
  const row = page.locator('[data-puck-component="row"]');
  await title.click();
  await title.scrollIntoViewIfNeeded();
  const from = await title.boundingBox();
  const to = await row.boundingBox();
  if (!from || !to) throw new Error('Missing native drag targets');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(NATIVE_DRAG_HOLD_MS);
  await page.mouse.move(to.x + to.width / 2, to.y + to.height + 10, { steps: 12 });
  await page.waitForTimeout(NATIVE_DRAG_HOLD_MS);
  await page.mouse.up();
  await expect.poll(async () => (await currentDocument(page)).data.content[0]?.type).toBe('Row');
  expect((await currentDocument(page)).bindings).toContainEqual({
    nodeId: 'title',
    targetPath: ['text'],
    sourcePath: ['content', 'title'],
  });
  await page.waitForTimeout(NATIVE_HISTORY_SETTLE_MS);
  await title.click();
  await page
    .getByRole('button', { name: 'Use current value as direct value', exact: true })
    .click();
  await expect(page.getByRole('textbox', { name: 'text (title)', exact: true })).toHaveValue(
    'Neutral bound title'
  );
  await expect.poll(async () => (await currentDocument(page)).bindings?.length).toBe(0);
  await page.waitForTimeout(NATIVE_HISTORY_SETTLE_MS);
  await page.getByRole('button', { name: 'undo', exact: true }).click();
  await title.click();
  await expect(page.getByRole('status', { name: 'Resolved text (title)', exact: true })).toHaveText(
    '"Neutral bound title"'
  );
  await page.getByRole('button', { name: 'redo', exact: true }).click();
  await title.click();
  await expect(page.getByRole('textbox', { name: 'text (title)', exact: true })).toHaveValue(
    'Neutral bound title'
  );
  expect((await currentDocument(page)).revision).toBe(7);
});
