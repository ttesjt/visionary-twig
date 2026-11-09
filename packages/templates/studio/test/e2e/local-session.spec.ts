import { MAX_STUDIO_PROJECT_BYTES } from '@frontend/studio/data';
import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { openPagePanel } from './fixtures/resource-controls';
import { applySection, openJson, returnToPage } from './fixtures/editing';
import { document, applyDocument } from './fixtures/document';
test('Save As downloads one complete project with raw bindings, all catalogs and context', async ({
  page,
}, testInfo) => {
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  await applySection(page, 'context', { request: { title: 'External' } });
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save As', exact: true }).click();
  const download = await downloading;
  const filename = testInfo.outputPath('roundtrip.studio.json');
  await download.saveAs(filename);
  const text = await readFile(filename, 'utf8');
  expect(JSON.parse(text)).toMatchObject({
    metadata: { kind: 'studio-project', formatVersion: 1 },
    document,
    context: { request: { title: 'External' } },
  });
  await expect(
    page.getByText('Download started. The original file has not been confirmed saved.', {
      exact: true,
    })
  ).toBeVisible();
  await openPagePanel(page, 'Files');
  await page.getByLabel('Open JSON file', { exact: true }).setInputFiles(filename);
  await page.getByRole('button', { name: 'Discard and replace', exact: true }).click();
  const context = await openJson(page, 'context');
  await expect(context).toHaveValue(/External/);
  await returnToPage(page);
  await expect(
    page
      .frameLocator('iframe[title="Actual content page"]')
      .getByRole('heading', { name: 'Nested child', exact: true })
  ).toBeVisible();
});
test('invalid JSON remains repairable and cancellation preserves the current project', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  const source = await openJson(page);
  await source.fill('{broken');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'JSON input issues' })).toContainText(
    'invalid-json'
  );
  await expect(source).toHaveValue('{broken');
  await returnToPage(page);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeDisabled();
  await openPagePanel(page, 'Files');
  const newButton = page.getByRole('button', { name: 'New document', exact: true });
  await newButton.click();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(newButton).toBeFocused();
  await openJson(page);
  await expect(source).toHaveValue('{broken');
  await returnToPage(page);
  await openPagePanel(page, 'Files');
  await page.getByLabel('Open JSON file', { exact: true }).setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{invalid'),
  });
  await openJson(page);
  await expect(source).toHaveValue('{broken');
  await returnToPage(page);
  await expect(page.getByRole('alert', { name: 'Document input issues' })).toContainText(
    'invalid-json'
  );
});
test('unapplied JSON blocks Save; missing dependencies block preview but allow a working file', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await applyDocument(page);
  const source = await openJson(page);
  await source.fill('{broken');
  await returnToPage(page);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeDisabled();
  await applyDocument(page, { ...document, variables: {} });
  await expect(
    page.getByRole('alert', { name: 'Missing or invalid content dependencies' })
  ).toContainText('content.title');
  await expect(
    page.getByRole('button', { name: 'Refresh actual preview', exact: true })
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeEnabled();
});
test('file boundary rejects invalid UTF-8, oversize and unsupported project versions without replacing current work', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await openPagePanel(page, 'Files');
  const input = page.getByLabel('Open JSON file', { exact: true });
  await input.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from([255]),
  });
  await expect(page.getByRole('alert', { name: 'Document input issues' })).toContainText(
    'invalid-utf8'
  );
  await input.setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(MAX_STUDIO_PROJECT_BYTES + 1),
  });
  await expect(page.getByRole('alert', { name: 'Document input issues' })).toContainText(
    'document-too-large'
  );
  await input.setInputFiles({
    name: 'future.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ metadata: { kind: 'studio-project', formatVersion: 99 }, document })
    ),
  });
  await expect(page.getByRole('alert', { name: 'Document input issues' })).toContainText(
    'invalid-project'
  );
  await input.setInputFiles({
    name: 'content.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await expect(page.locator('.ui-studio-resource-files .ui-studio-identity')).toContainText(
    'content.txt'
  );
  await expect(
    page
      .frameLocator('iframe[title="Actual content page"]')
      .getByRole('heading', { name: 'Neutral bound title', exact: true })
  ).toBeVisible();
});
