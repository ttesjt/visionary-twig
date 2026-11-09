import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { test } from './fixtures/studio';
import { openPagePanel } from './fixtures/resource-controls';
import { createProject } from '@frontend/studio/data';
import { applySection, readSection, downloadProject } from './fixtures/editing';
import { checkedProject } from './fixtures/project';
async function publish(page: Page) {
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Publish this snapshot?' })
    .getByRole('button', { name: 'Publish snapshot', exact: true })
    .click();
  await expect(
    page.getByText('Snapshot published to Demo memory. Local file save status is separate.', {
      exact: true,
    })
  ).toBeVisible();
}
async function openItems(page: Page) {
  await page.getByRole('link', { name: 'Records', exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/u);
}
test('global editor is removed and an independent page publishes and reopens through Pages without data APIs', async ({
  page,
}) => {
  expect((await page.goto('/editor'))?.status()).toBe(404);
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/') && !request.url().includes('/api/preview'))
      calls.push(request.url());
  });
  await page.goto('/demo/pages');
  await expect(page.getByText('No pages have been published in this session.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Local editor', exact: true })).toHaveCount(0);
  const shell = await page.locator('.ui-studio-shell').elementHandle();
  await page.getByRole('link', { name: 'New page', exact: true }).click();
  await page.getByLabel('Page name', { exact: true }).fill('Independent notes');
  await openPagePanel(page, 'Association');
  await expect(page.getByRole('region', { name: 'Item association' })).toContainText(
    'No item association'
  );
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await openPagePanel(page, 'Overview');
  await expect(page.getByRole('region', { name: 'Page identity' })).toContainText(
    'Publication revision: 0'
  );
  await publish(page);
  await page.getByRole('link', { name: 'Back to Pages' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Independent notes' })).toContainText(
    'Independent page'
  );
  const navigation = page.locator('.ui-studio-sidebar');
  await navigation.getByRole('link', { name: 'Overview', exact: true }).click();
  await navigation.getByRole('link', { name: 'Pages', exact: true }).click();
  await page.getByRole('link', { name: 'Independent notes', exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/pages\/[^/]+\/edit$/u);
  await expect(page.getByLabel('Page name', { exact: true })).toHaveValue('Independent notes');
  expect(await shell?.evaluate((node) => node === document.querySelector('.ui-studio-shell'))).toBe(
    true
  );
  expect(calls).toEqual([]);
});
test('item creation selects a pending destination; local Save As does not publish or attach it', async ({
  page,
}, testInfo) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Create item page', exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/pages\/new\?item=field-guide$/u);
  await openPagePanel(page, 'Association');
  const binding = page.getByRole('region', { name: 'Item association' });
  await expect(binding).toContainText('Pending association');
  await expect(binding).toContainText('Field guide');
  await expect(binding.getByRole('button', { name: 'Unbind item', exact: true })).toHaveCount(0);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save As', exact: true }).click();
  const file = testInfo.outputPath('pending-page.json');
  await (await downloading).saveAs(file);
  const saved = checkedProject(await readFile(file, 'utf8'));
  expect(saved.publishing?.target?.targetId).toBe('demo-pages');
  await openItemsWithDiscard(page);
  await expect(page.getByRole('link', { name: 'Create item page', exact: true })).toBeVisible();
  await page
    .locator('.ui-studio-subnavigation')
    .getByRole('link', { name: 'Pages', exact: true })
    .click();
  await expect(page.getByText('No pages have been published in this session.')).toBeVisible();
});
async function openItemsWithDiscard(page: Page) {
  await page.getByRole('link', { name: 'Records', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Leave this editing session?' })
    .getByRole('button', { name: 'Leave editor', exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo$/u);
}
test('publish commits item association; unlink preserves working content and the independent page before choosing another item', async ({
  page,
}) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Create item page', exact: true }).click();
  await page.getByLabel('Page name', { exact: true }).fill('Field notes');
  await publish(page);
  await openPagePanel(page, 'Association');
  const binding = page.getByRole('region', { name: 'Item association' });
  await expect(binding).toContainText('Bound to item');
  await expect(binding.getByRole('combobox')).toHaveCount(0);
  await openItems(page);
  await page.getByRole('link', { name: 'Edit item page', exact: true }).click();
  await expect(page.getByLabel('Page name', { exact: true })).toHaveValue('Field notes');
  await applySection(page, 'context', { working: 'keep after unlink' });
  await openPagePanel(page, 'Association');
  await binding.getByRole('button', { name: 'Unbind item', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Unbind this item?' })
    .getByRole('button', { name: 'Keep association', exact: true })
    .click();
  await expect(binding).toContainText('Bound to item');
  await openPagePanel(page, 'Association');
  await binding.getByRole('button', { name: 'Unbind item', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Unbind this item?' })
    .getByRole('button', { name: 'Confirm unbind', exact: true })
    .click();
  await expect(binding).toContainText('No item association');
  expect(await readSection(page, 'context')).toContain('keep after unlink');
  await openPagePanel(page, 'Association');
  await page
    .getByRole('combobox', { name: 'Available item', exact: true })
    .selectOption('image-study');
  await page.getByRole('button', { name: 'Select item', exact: true }).click();
  await expect(binding).toContainText('Pending association');
  await publish(page);
  await openItems(page);
  await expect(page.getByRole('link', { name: 'Create item page', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Image study', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Edit item page', exact: true })).toBeVisible();
  await page
    .locator('.ui-studio-subnavigation')
    .getByRole('link', { name: 'Pages', exact: true })
    .click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('row').filter({ hasText: 'Field notes' })).toContainText(
    'Image study'
  );
});
test('import and source Apply replace content while host page identity and binding remain fixed', async ({
  page,
}, testInfo) => {
  await page.goto('/demo/pages/new?item=field-guide');
  await page.getByLabel('Page name', { exact: true }).fill('Owned page');
  await publish(page);
  const foreign = {
    ...createProject('foreign-document'),
    context: { imported: true },
    publishing: {
      source: { targetId: 'foreign', key: 'elsewhere', version: { revision: 90 } },
      target: { targetId: 'foreign', key: 'other', version: { revision: 99 } },
    },
  };
  await openPagePanel(page, 'Files');
  await page.getByLabel('Open JSON file', { exact: true }).setInputFiles({
    name: 'foreign.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(foreign)),
  });
  const replace = page.getByRole('button', { name: 'Discard and replace', exact: true });
  await expect(replace).toBeVisible();
  await replace.click();
  expect(await readSection(page, 'context')).toContain('imported');
  const current = await downloadProject(page);
  expect(current.publishing?.target?.targetId).toBe('demo-pages');
  expect(current.publishing?.source).toBeUndefined();
  const ownedId = current.publishing?.target?.key;
  expect(ownedId).toBeTruthy();
  await applySection(page, 'context', { fromFullJson: true });
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save As', exact: true }).click();
  const file = testInfo.outputPath('host-owned.json');
  await (await downloading).saveAs(file);
  expect(checkedProject(await readFile(file, 'utf8'))).toMatchObject({
    context: { fromFullJson: true },
    publishing: { target: { key: ownedId, targetId: 'demo-pages', version: { revision: 1 } } },
  });
  await openPagePanel(page, 'Association');
  await expect(page.getByRole('region', { name: 'Item association' })).toContainText(
    'Bound to item'
  );
  await publish(page);
  await page.getByRole('link', { name: 'Back to Pages' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Owned page', exact: true }).click();
  expect(await readSection(page, 'context')).toContain('fromFullJson');
});
test('unpublished editor links ask before leaving, and missing memory pages explain recovery', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await page.getByLabel('Page name', { exact: true }).fill('Unpublished work');
  await page.getByRole('link', { name: 'Back to Pages' }).click();
  const dialog = page.getByRole('dialog', { name: 'Leave this editing session?' });
  await dialog.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByLabel('Page name', { exact: true })).toHaveValue('Unpublished work');
  await page.getByRole('link', { name: 'Back to Pages' }).click();
  await dialog.getByRole('button', { name: 'Leave editor', exact: true }).click();
  await expect(page.getByText('No pages have been published in this session.')).toBeVisible();
  await page.goto('/demo/pages/missing/edit');
  await expect(page.getByRole('status')).toContainText('unavailable in the current Demo session');
});
